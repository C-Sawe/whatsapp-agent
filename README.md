# Mosop Farm Inputs WhatsApp Bot

This project is a complete deployment architecture for a WhatsApp automation bot for Mosop Farm Inputs. It uses a Python FastAPI backend and the open-source Evolution API, fully orchestrated for deployment on Render.com.

## Architecture & Stack

1. **PostgreSQL Database:** Managed by Render, used exclusively by Evolution API to persist instance sessions so your WhatsApp QR code does not reset on container restarts.
2. **Evolution API Gateway:** A Dockerized web service (`atendai/evolution-api:latest`) configured to use the PostgreSQL DB. Redis is disabled to simplify the stack.
3. **Python FastAPI Backend:** Handles incoming webhooks, filters out bot messages (`fromMe: true`), queries Google Sheets for inventory using `gspread`, and replies to customers.

---

## 🚀 Deployment to Render.com

1. **Push to GitHub**
   Commit all the files in this project (`render.yaml`, `main.py`, `requirements.txt`, `README.md`) and push them to a new GitHub repository.

2. **Deploy via Render Blueprint**
   * Go to your [Render Dashboard](https://dashboard.render.com/).
   * Click **New** -> **Blueprint**.
   * Connect the GitHub repository you just created.
   * Render will automatically detect the `render.yaml` file and deploy the Database, the Evolution API, and the FastAPI backend.
   * Click **Apply** and wait for all services to become live.

3. **Link the Services Together**
   * Once the **evolution-api** service is live, copy its public URL (e.g., `https://evolution-api-xxxx.onrender.com`).
   * Go to your **mosop-farm-backend** service in the Render dashboard.
   * Under the **Environment** tab, update the `EVOLUTION_API_URL` variable with the URL you copied.
   * Wait for the backend service to redeploy with the new environment variable.

4. **Set Webhooks on Evolution API**
   Configure Evolution API to forward WhatsApp messages to your backend. The webhook endpoint will be:
   `https://mosop-farm-backend-<your-id>.onrender.com/webhook/evolution`
   (You can set this globally in Evolution API env vars or per-instance using their webhook endpoints).

---

## 📱 Generating the WhatsApp QR Code

Once the Evolution API is successfully deployed, use the following `curl` commands from your local terminal to create a WhatsApp instance and generate the QR code to scan from your phone.

> **Note:** Replace `<YOUR_EVOLUTION_API_RENDER_URL>` with your actual Evolution API URL (e.g., `https://evolution-api-xxxx.onrender.com`) and `<YOUR_API_KEY>` with your `AUTHENTICATION_API_KEY` (default in `render.yaml` is `mosop-secure-global-api-key`).

**Step 1: Create a new WhatsApp Instance**

```bash
curl -X POST "<YOUR_EVOLUTION_API_RENDER_URL>/instance/create" \
-H "Content-Type: application/json" \
-H "apikey: <YOUR_API_KEY>" \
-d '{
    "instanceName": "MosopFarm",
    "token": "mosop-secret-token",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
}'
```

The response will contain a `base64` string of the QR code. You can copy this `base64` string and paste it into an online "Base64 to Image converter" to scan it with your WhatsApp app on your phone.

**Step 2: Retrieve the QR Code again (Optional)**
If you need to fetch the QR code again because it timed out:

```bash
curl -X GET "<YOUR_EVOLUTION_API_RENDER_URL>/instance/connect/MosopFarm" \
-H "apikey: <YOUR_API_KEY>"
```

---

## 📊 Setting up Google Sheets Integration

To pull live inventory data from Google Sheets:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Sheets API** and **Google Drive API**.
3. Create a **Service Account** and download its JSON key file.
4. Rename the downloaded file to `credentials.json` and put it in the root folder of this project (Make sure to add it to `.gitignore` so you don't commit secrets to GitHub).
5. Open your Mosop Farm Inventory Google Sheet and share it as an Editor with the email address of the Service Account.
