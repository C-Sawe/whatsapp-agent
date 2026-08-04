import os
import httpx
from datetime import datetime
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
import sheets_handler
import config_manager

load_dotenv()

app = FastAPI()

# Add Session Middleware for authentication
SECRET_KEY = os.getenv("SESSION_SECRET", "super_secret_whatsapp_bot_key_2026")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Global activity log store (in-memory)
activity_logs = []

def is_authenticated(request: Request) -> bool:
    """Checks if the user is authenticated via session."""
    return request.session.get("authenticated", False) == True

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
    response_text = sheets_handler.lookup_inventory(text_body)
    
    # Store in activity logs
    activity_logs.insert(0, {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sender": sender_id,
        "query": text_body,
        "response": response_text
    })
    
    # Run the async function synchronously within the background task
    import asyncio
    asyncio.run(send_whatsapp_message(sender_id, response_text))


# --- Public Webhook Endpoints ---

@app.get("/webhook")
async def verify_webhook(request: Request):
    """Handles Meta's standard hub.challenge handshake using VERIFY_TOKEN."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    verify_token_env = os.getenv("VERIFY_TOKEN")
    print(f"DEBUG: mode={mode}, received_token='{token}', expected_token='{verify_token_env}'")
    
    if mode == "subscribe" and token and verify_token_env and token.strip() == verify_token_env.strip():
        print("WEBHOOK_VERIFIED")
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=challenge, status_code=200)
            
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook")
async def webhook_post(request: Request, background_tasks: BackgroundTasks):
    """Parses WhatsApp Cloud API JSON payload."""
    body = await request.json()
    
    if body.get("object") == "whatsapp_business_account":
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                if "statuses" in value:
                    print("Received status update, ignoring to prevent infinite loop.")
                    continue
                    
                messages = value.get("messages", [])
                if messages:
                    message = messages[0]
                    if message.get("type") == "text":
                        sender_id = message.get("from", "")
                        text_body = message.get("text", {}).get("body", "")
                        
                        if sender_id and text_body:
                            background_tasks.add_task(process_message, sender_id, text_body)
                    else:
                        print(f"Ignored non-text message of type: {message.get('type')}")
                        
    return {"status": "success"}


# --- Authentication Routes ---

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    if is_authenticated(request):
        return RedirectResponse(url="/overview", status_code=303)
    return templates.TemplateResponse(request, name="login.html", context={"request": request, "error": None})


@app.post("/login", response_class=HTMLResponse)
async def login_submit(request: Request, username: str = Form(...), password: str = Form(...)):
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    
    if username.strip() == admin_user and password.strip() == admin_pass:
        request.session["authenticated"] = True
        return RedirectResponse(url="/overview", status_code=303)
    
    return templates.TemplateResponse(
        request,
        name="login.html",
        context={"request": request, "error": "Invalid username or password. Please try again."}
    )


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


# --- Protected Dashboard Routes ---

@app.get("/")
async def root(request: Request):
    if is_authenticated(request):
        return RedirectResponse(url="/overview", status_code=303)
    return RedirectResponse(url="/login", status_code=303)


@app.get("/overview", response_class=HTMLResponse)
async def overview_page(request: Request):
    if not is_authenticated(request):
        return RedirectResponse(url="/login", status_code=303)
        
    vars = config_manager.get_env_vars()
    conn_info = sheets_handler.test_sheet_connection()
    sheet_count = conn_info.get("count") if conn_info.get("success") else None
    
    return templates.TemplateResponse(
        request,
        name="overview.html",
        context={
            "request": request,
            "active_page": "overview",
            "vars": vars,
            "total_queries": len(activity_logs),
            "sheet_count": sheet_count,
            "logs": activity_logs
        }
    )


@app.get("/credentials", response_class=HTMLResponse)
async def credentials_page(request: Request, success: bool = False):
    if not is_authenticated(request):
        return RedirectResponse(url="/login", status_code=303)
        
    vars = config_manager.get_env_vars()
    return templates.TemplateResponse(
        request,
        name="credentials.html",
        context={
            "request": request,
            "active_page": "credentials",
            "vars": vars,
            "success": success
        }
    )


@app.post("/api/credentials")
async def update_credentials(
    request: Request,
    WHATSAPP_TOKEN: str = Form(...),
    WHATSAPP_PHONE_NUMBER_ID: str = Form(...),
    VERIFY_TOKEN: str = Form(...),
    SPREADSHEET_ID: str = Form(...),
    GOOGLE_APPLICATION_CREDENTIALS: str = Form(...)
):
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    config_manager.update_env_vars({
        "WHATSAPP_TOKEN": WHATSAPP_TOKEN,
        "WHATSAPP_PHONE_NUMBER_ID": WHATSAPP_PHONE_NUMBER_ID,
        "VERIFY_TOKEN": VERIFY_TOKEN,
        "SPREADSHEET_ID": SPREADSHEET_ID,
        "GOOGLE_APPLICATION_CREDENTIALS": GOOGLE_APPLICATION_CREDENTIALS
    })
    
    return RedirectResponse(url="/credentials?success=true", status_code=303)


@app.get("/inventory", response_class=HTMLResponse)
async def inventory_page(request: Request):
    if not is_authenticated(request):
        return RedirectResponse(url="/login", status_code=303)
        
    records = sheets_handler.get_all_inventory()
    return templates.TemplateResponse(
        request,
        name="inventory.html",
        context={
            "request": request,
            "active_page": "inventory",
            "records": records
        }
    )


@app.post("/api/test-inventory")
async def api_test_inventory(request: Request, query: str = Form(...)):
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    response_text = sheets_handler.lookup_inventory(query)
    activity_logs.insert(0, {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sender": "Dashboard Tester",
        "query": query,
        "response": response_text
    })
    return JSONResponse(content={"result": response_text})


@app.get("/logs", response_class=HTMLResponse)
async def logs_page(request: Request):
    if not is_authenticated(request):
        return RedirectResponse(url="/login", status_code=303)
        
    return templates.TemplateResponse(
        request,
        name="logs.html",
        context={
            "request": request,
            "active_page": "logs",
            "logs": activity_logs
        }
    )


@app.post("/api/test-sheets")
async def api_test_sheets(request: Request):
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    res = sheets_handler.test_sheet_connection()
    return JSONResponse(content=res)
