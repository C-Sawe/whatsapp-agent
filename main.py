import os
import json
from fastapi import FastAPI, Request, HTTPException
import httpx
import gspread
from oauth2client.service_account import ServiceAccountCredentials

app = FastAPI(title="Mosop Farm Inputs API")

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "mosop-secure-global-api-key")

# Google Sheets Configuration Placeholder
# Ensure you have 'credentials.json' in your root directory and the Sheet shared with the service account email.
GOOGLE_SHEETS_CREDS_FILE = "credentials.json"
GOOGLE_SHEET_NAME = "Mosop Farm Inventory"

def get_inventory():
    """
    Queries Google Sheets for farm input inventory using gspread.
    Returns placeholder data if credentials are not set up.
    """
    try:
        if os.path.exists(GOOGLE_SHEETS_CREDS_FILE):
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds = ServiceAccountCredentials.from_json_keyfile_name(GOOGLE_SHEETS_CREDS_FILE, scope)
            client = gspread.authorize(creds)
            sheet = client.open(GOOGLE_SHEET_NAME).sheet1
            records = sheet.get_all_records()
            return records
    except Exception as e:
        print(f"Error accessing Google Sheets: {e}")
        
    # Returning mock data as fallback/placeholder
    return [
        {"item": "Fertilizer DAP", "stock": 100, "price": 3500},
        {"item": "Maize Seed (Hybrid)", "stock": 50, "price": 4500},
        {"item": "Urea 50kg", "stock": 200, "price": 2800}
    ]

async def send_whatsapp_message(instance: str, number: str, text: str):
    """
    Sends a reply back through the Evolution API REST endpoint.
    """
    url = f"{EVOLUTION_API_URL.rstrip('/')}/message/sendText/{instance}"
    headers = {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "number": number,
        "options": {
            "delay": 1200,
            "presence": "composing",
            "linkPreview": False
        },
        "textMessage": {
            "text": text
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            print(f"Failed to send message: {e}")
            return None

@app.post("/webhook/evolution")
async def evolution_webhook(request: Request):
    """
    Receives webhooks from Evolution API.
    Expected to receive MESSAGES_UPSERT events.
    """
    try:
        payload = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Handle both wrapped and direct payload structures
    event = payload.get("event")
    data = payload.get("data", payload)
    instance = payload.get("instance")

    if event == "messages.upsert":
        messages = data.get("messages", [])
        
        for message in messages:
            key = message.get("key", {})
            from_me = key.get("fromMe", False)
            
            # Filter out messages where key.fromMe == true to prevent infinite feedback loops
            if from_me:
                continue

            remote_jid = key.get("remoteJid", "")
            if "@g.us" in remote_jid:
                # Ignore group messages for now
                continue
                
            # Extract text content
            message_content = message.get("message", {})
            text = message_content.get("conversation") or message_content.get("extendedTextMessage", {}).get("text", "")
            
            if text:
                print(f"Received message from {remote_jid}: {text}")
                text_lower = text.lower()
                
                if "inventory" in text_lower or "stock" in text_lower or "inputs" in text_lower:
                    inventory = get_inventory()
                    if inventory:
                        reply_text = "Here is our current Mosop Farm Inputs inventory:\n\n"
                        for item in inventory:
                            reply_text += f"🌱 {item.get('item', 'Unknown')} - Stock: {item.get('stock', 0)} - Price: KES {item.get('price', 0)}\n"
                    else:
                        reply_text = "Sorry, I couldn't fetch the inventory right now. Please try again later."
                else:
                    reply_text = "Welcome to Mosop Farm Inputs! 🚜\nReply with 'inventory' or 'stock' to see available inputs."

                # Send reply asynchronously
                await send_whatsapp_message(instance, remote_jid, reply_text)
                
    return {"status": "success"}

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "Mosop Farm Inputs Backend"}
