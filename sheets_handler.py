import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

load_dotenv()

# Setup Google Sheets API credentials
SCOPES = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]

def get_spreadsheet():
    """Initializes and returns the Google Spreadsheet object."""
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service_account.json")
    if not os.path.exists(creds_path):
        print(f"Warning: Credentials file {creds_path} not found.")
        return None
    
    creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, SCOPES)
    client = gspread.authorize(creds)
    
    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    if spreadsheet_id and spreadsheet_id != "sheet_val":
        try:
            return client.open_by_key(spreadsheet_id)
        except Exception as e:
            print(f"Failed to open by key, falling back to name: {e}")
            
    try:
        return client.open("Mosop Farm Inventory")
    except Exception as e:
        print(f"Error opening spreadsheet by name: {e}")
        return None

def get_sheet():
    """Returns the inventory sheet (sheet1)."""
    ss = get_spreadsheet()
    if ss:
        try:
            return ss.worksheet("Inventory")
        except gspread.exceptions.WorksheetNotFound:
            return ss.sheet1
    return None

def get_sessions_sheet():
    """Returns the Sessions worksheet, creating it if it doesn't exist."""
    ss = get_spreadsheet()
    if not ss:
        return None
    try:
        return ss.worksheet("Sessions")
    except gspread.exceptions.WorksheetNotFound:
        worksheet = ss.add_worksheet(title="Sessions", rows="1000", cols="2")
        worksheet.append_row(["Phone Number", "State"])
        return worksheet

fallback_sessions = {}

def get_user_state(phone_number: str) -> str:
    """Gets the opt-in state of a user from the Sessions sheet or fallback memory."""
    sheet = get_sessions_sheet()
    if not sheet:
        return fallback_sessions.get(phone_number)
    try:
        cell = sheet.find(phone_number, in_column=1)
        if cell:
            return sheet.cell(cell.row, 2).value
    except gspread.exceptions.CellNotFound:
        pass
    except Exception as e:
        print(f"Error reading session state: {e}")
    return fallback_sessions.get(phone_number)

def update_user_state(phone_number: str, state: str):
    """Updates or inserts the opt-in state for a user in the Sessions sheet or fallback memory."""
    sheet = get_sessions_sheet()
    if not sheet:
        fallback_sessions[phone_number] = state
        return
    try:
        cell = sheet.find(phone_number, in_column=1)
        if cell:
            sheet.update_cell(cell.row, 2, state)
        else:
            sheet.append_row([phone_number, state])
    except gspread.exceptions.CellNotFound:
        sheet.append_row([phone_number, state])
    except Exception as e:
        print(f"Error updating session state: {e}")
        fallback_sessions[phone_number] = state

def lookup_inventory(product_name: str) -> str:
    """
    Searches the Google Sheet for the requested product and returns its price and stock.
    Assumes Column A = Product Name, Column B = Price, Column C = Stock.
    Customize the column indices based on your exact sheet structure.
    """
    sheet = get_sheet()
    if not sheet:
        return "Internal Error: Could not connect to the inventory database."
        
    try:
        # Get all records as a list of dictionaries. 
        # This assumes the first row is headers like "Product", "Price", "Stock"
        records = sheet.get_all_records()
        
        # Simple case-insensitive search
        search_query = product_name.lower().strip()
        
        for row in records:
            # Assuming the first key in the dictionary is the product name
            keys = list(row.keys())
            if len(keys) >= 3:
                name_col = keys[0]
                price_col = keys[1]
                stock_col = keys[2]
                
                row_name = str(row[name_col]).lower().strip()
                if search_query in row_name:
                    return f"Product: {row[name_col]}\nPrice: {row[price_col]}\nStock: {row[stock_col]}"
                    
        return f"Sorry, we couldn't find any product matching '{product_name}' in our inventory."
        
    except Exception as e:
        print(f"Error querying sheet: {e}")
        return "Sorry, we encountered an error looking up the inventory right now."

def test_sheet_connection() -> dict:
    """Tests the connection to Google Sheets and returns diagnostic status."""
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service_account.json")
    if not os.path.exists(creds_path):
        return {"success": False, "message": f"Credentials file '{creds_path}' not found on server."}

    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    if not spreadsheet_id:
        return {"success": False, "message": "SPREADSHEET_ID is not configured in .env."}

    try:
        sheet = get_sheet()
        if not sheet:
            return {"success": False, "message": "Could not authorize or access the Google Sheet."}
        
        records = sheet.get_all_records()
        return {
            "success": True,
            "message": f"Successfully connected to sheet! Found {len(records)} product records.",
            "count": len(records)
        }
    except Exception as e:
        return {"success": False, "message": f"Error connecting to sheet: {str(e)}"}

def get_all_inventory() -> list:
    """Fetches all inventory records from Google Sheet."""
    sheet = get_sheet()
    if not sheet:
        return []
    try:
        return sheet.get_all_records()
    except Exception as e:
        print(f"Error fetching all records: {e}")
        return []

def get_orders_sheet():
    """Returns the Orders worksheet, creating it if it doesn't exist."""
    ss = get_spreadsheet()
    if not ss:
        return None
    try:
        return ss.worksheet("Orders")
    except gspread.exceptions.WorksheetNotFound:
        worksheet = ss.add_worksheet(title="Orders", rows="1000", cols="10")
        worksheet.append_row([
            "Order ID", "Phone Number", "Customer Name", "Product", "Quantity", 
            "Total Cost", "Location", "Payment Status", "Transaction Code", "Timestamp"
        ])
        return worksheet

def get_all_orders() -> list:
    """Fetches all records from the Orders worksheet."""
    sheet = get_orders_sheet()
    if not sheet:
        return []
    try:
        return sheet.get_all_records()
    except Exception as e:
        print(f"Error fetching all orders: {e}")
        return []
def get_price_for_product(product_name: str) -> float:
    import re
    sheet = get_sheet()
    if not sheet:
        return 0.0
    try:
        records = sheet.get_all_records()
        search_query = product_name.lower().strip()
        for row in records:
            keys = list(row.keys())
            if len(keys) >= 2:
                name_col = keys[0]
                price_col = keys[1]
                row_name = str(row[name_col]).lower().strip()
                if search_query in row_name:
                    price_str = str(row[price_col])
                    match = re.search(r'\d+(\.\d+)?', price_str.replace(',', ''))
                    if match:
                        return float(match.group())
        return 0.0
    except Exception as e:
        print(f"Error fetching price: {e}")
        return 0.0

def create_pending_order(phone: str, customer_name: str, product: str, quantity: int, total: float) -> str:
    from datetime import datetime
    import re
    sheet = get_orders_sheet()
    if not sheet:
        return None
    
    # Generate Order ID (MSF-26-XXXX)
    order_id = "MSF-26-1000" # Default
    try:
        # Get all records to find the highest MSF-26-XXXX ID
        records = sheet.get_all_records()
        max_id = 999
        for row in records:
            current_id_str = str(row.get("Order ID", ""))
            if current_id_str.startswith("MSF-26-"):
                try:
                    num_part = int(current_id_str.split("-")[-1])
                    if num_part > max_id:
                        max_id = num_part
                except ValueError:
                    pass
        order_id = f"MSF-26-{max_id + 1}"
    except Exception as e:
        print(f"Error generating order ID: {e}")
        # fallback to a random 4 digit if failing
        import random
        order_id = f"MSF-26-{random.randint(1000, 9999)}"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sheet.append_row([
        order_id, phone, customer_name, product, quantity, total, "", "PENDING", "", timestamp
    ])
    return order_id

def update_order_location(phone: str, location: str) -> float:
    sheet = get_orders_sheet()
    if not sheet:
        return 0.0
    try:
        records = sheet.get_all_records()
        for i, row in reversed(list(enumerate(records))):
            if str(row.get("Phone Number", "")) == phone and row.get("Payment Status", "") == "PENDING":
                row_index = i + 2
                sheet.update_cell(row_index, 6, location)
                return float(row.get("Total Cost", 0.0))
    except Exception as e:
        print(f"Error updating order location: {e}")
    return 0.0

def update_order_payment(phone: str, transaction_code: str) -> dict:
    sheet = get_orders_sheet()
    if not sheet:
        return None
    try:
        records = sheet.get_all_records()
        for i, row in reversed(list(enumerate(records))):
            if str(row.get("Phone Number", "")) == phone and row.get("Payment Status", "") == "PENDING":
                row_index = i + 2
                sheet.update_cell(row_index, 7, "PAID")
                sheet.update_cell(row_index, 8, transaction_code)
                row["Payment Status"] = "PAID"
                row["Transaction Code"] = transaction_code
                return row
    except Exception as e:
        print(f"Error updating order payment: {e}")
    return None

def get_config_sheet():
    """Returns the Config worksheet, creating it if it doesn't exist."""
    ss = get_spreadsheet()
    if not ss:
        return None
    try:
        return ss.worksheet("Config")
    except gspread.exceptions.WorksheetNotFound:
        worksheet = ss.add_worksheet(title="Config", rows="100", cols="3")
        worksheet.append_row(["Key", "Value", "Description"])
        
        # Default configs
        default_configs = [
            ["PAYBILL_NUMBER", "XXXXXX", "The business paybill number for M-PESA"],
            ["ACCOUNT_NUMBER", "Your Name", "The account name/number for M-PESA paybill"],
            ["DELIVERY_NOTE", "*Note: We currently only deliver to Rift Valley locations. For other areas, please call us to make special arrangements.*", "Message appended when asking for location"],
            ["LOCATION_LINK", "https://maps.app.goo.gl/6zoXTJxD88VruozU6", "Google maps link"],
            ["COMPANY_NAME", "Mosop Farm Inputs", "Name of the business"],
            ["SLOGAN", "You Grow, We Grow.", "Company slogan"],
            ["MISSION", "To operate as an Agritech Intelligence Hub, delivering enterprise-grade, KEPHIS-certified agricultural inputs with clinical precision.", "Company mission"],
            ["TONE", "Clinical Precision. Professional, authoritative, tech-forward, and empowering.", "AI Tone"],
            ["VOCABULARY", "Avoid generic, overly soft language. Use enterprise-grade agritech terminology.", "AI Vocabulary rule"],
            ["SECURITY_RULES", "Rule 1 - Sensitive Information: You are strictly prohibited from answering queries regarding internal financial data, proprietary supplier contracts, employee personal details, or bulk wholesale price negotiations.\nRule 2 - Knowledge & Inventory Gaps: Do not guess, hallucinate, or estimate. If a user asks for the price of an unlisted item, or specific unverified stock levels, you must state that you cannot verify it.\nRule 3 - Chemical Applications: Do not provide specific medical, clinical, or biochemical application instructions.\nMandatory Redirection Script: If any rules are triggered, use this exact response: \"For precision and security, I cannot process this specific request directly. Please contact our management team for verified assistance at 254791828165, 254719493145, or 254115777216.\"", "Security rules"],
        ]
        
        for row in default_configs:
            worksheet.append_row(row)
        return worksheet

def get_all_config() -> dict:
    """Returns all configuration as a key-value dictionary."""
    sheet = get_config_sheet()
    if not sheet:
        return {}
    try:
        records = sheet.get_all_records()
        config = {}
        for row in records:
            if "Key" in row and "Value" in row:
                config[row["Key"]] = str(row["Value"])
        return config
    except Exception as e:
        print(f"Error fetching config: {e}")
        return {}

def update_config(key: str, value: str) -> bool:
    """Updates a configuration value by key."""
    sheet = get_config_sheet()
    if not sheet:
        return False
    try:
        cell = sheet.find(key, in_column=1)
        if cell:
            sheet.update_cell(cell.row, 2, value)
            return True
        else:
            sheet.append_row([key, value, ""])
            return True
    except gspread.exceptions.CellNotFound:
        sheet.append_row([key, value, ""])
        return True
    except Exception as e:
        print(f"Error updating config {key}: {e}")
        return False

