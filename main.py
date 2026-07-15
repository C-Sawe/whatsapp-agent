import os
import httpx
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from sheets_handler import lookup_inventory
from config_manager import get_env_vars, update_env_vars

load_dotenv()

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Removing statically assigned env vars to read dynamically during requests.

async def send_whatsapp_message(to_number: str, text: str):
    """Sends a text message back to the user via WhatsApp Graph API."""
    token = os.getenv("WHATSAPP_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": text},
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        if response.status_code != 200:
            print(f"Failed to send message: {response.text}")
        else:
            print(f"Successfully sent message to {to_number}")

def process_message(sender_id: str, text_body: str):
    """Background task to query inventory and send a response."""
    print(f"Received inquiry for: {text_body}")
    response_text = lookup_inventory(text_body)
    
    # Run the async function synchronously within the background task
    import asyncio
    asyncio.run(send_whatsapp_message(sender_id, response_text))

@app.get("/webhook")
async def verify_webhook(request: Request):
    """
    Handles Meta's standard hub.challenge handshake using VERIFY_TOKEN.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    verify_token_env = os.getenv("VERIFY_TOKEN")
    
    if mode and token:
        if mode == "subscribe" and token == verify_token_env:
            print("WEBHOOK_VERIFIED")
            # Meta requires the challenge to be returned as an integer (raw response)
            from fastapi.responses import PlainTextResponse
            return PlainTextResponse(content=challenge, status_code=200)
        else:
            raise HTTPException(status_code=403, detail="Verification failed")
            
    raise HTTPException(status_code=400, detail="Missing parameters")


@app.post("/webhook")
async def webhook_post(request: Request, background_tasks: BackgroundTasks):
    """
    Parses the deeply nested WhatsApp Cloud API JSON payload.
    CRITICAL: Ignores status updates to prevent infinite loops.
    """
    body = await request.json()
    
    # Check if this is a WhatsApp API event
    if body.get("object") == "whatsapp_business_account":
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # CRITICAL: Ignore status updates (delivered, read, sent)
                if "statuses" in value:
                    # Logging for debugging purposes, but we do NOT process it
                    print("Received status update, ignoring to prevent infinite loop.")
                    continue
                    
                # Process only if there is a message
                if "messages" in value:
                    message = value["messages"][0]
                    
                    # Only process text messages
                    if message.get("type") == "text":
                        sender_id = message["from"] # The user's phone number
                        text_body = message["text"]["body"]
                        
                        # Add processing to background tasks so we can return 200 OK immediately
                        background_tasks.add_task(process_message, sender_id, text_body)
                    else:
                        print(f"Ignored non-text message of type: {message.get('type')}")
                        
    # Meta requires a 200 OK response within seconds to avoid resending the webhook
    return {"status": "success"}


@app.get("/", response_class=HTMLResponse)
async def settings_page(request: Request, success: bool = False):
    """Renders the settings dashboard."""
    vars = get_env_vars()
    return templates.TemplateResponse("settings.html", {"request": request, "vars": vars, "success": success})


@app.post("/api/credentials")
async def update_credentials(
    WHATSAPP_TOKEN: str = Form(...),
    WHATSAPP_PHONE_NUMBER_ID: str = Form(...),
    VERIFY_TOKEN: str = Form(...),
    SPREADSHEET_ID: str = Form(...),
    GOOGLE_APPLICATION_CREDENTIALS: str = Form(...)
):
    """Updates the credentials and returns the settings page."""
    update_env_vars({
        "WHATSAPP_TOKEN": WHATSAPP_TOKEN,
        "WHATSAPP_PHONE_NUMBER_ID": WHATSAPP_PHONE_NUMBER_ID,
        "VERIFY_TOKEN": VERIFY_TOKEN,
        "SPREADSHEET_ID": SPREADSHEET_ID,
        "GOOGLE_APPLICATION_CREDENTIALS": GOOGLE_APPLICATION_CREDENTIALS
    })
    
    from fastapi.responses import RedirectResponse
    # Redirect back to settings page with success flag
    return RedirectResponse(url="/?success=true", status_code=303)


