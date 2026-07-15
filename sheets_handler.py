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

def get_sheet():
    """Initializes and returns the Google Sheet object."""
    # Ensure the service account JSON exists
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service_account.json")
    if not os.path.exists(creds_path):
        print(f"Warning: Credentials file {creds_path} not found.")
        return None
    
    creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, SCOPES)
    client = gspread.authorize(creds)
    
    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    if not spreadsheet_id:
        print("Warning: SPREADSHEET_ID not set in .env")
        return None
        
    return client.open_by_key(spreadsheet_id).sheet1

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
