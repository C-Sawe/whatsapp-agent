import urllib.request
import json
import base64
import os
import time

url_base = "http://34.173.125.119:8080"
headers = {
    "Content-Type": "application/json",
    "apikey": "mosop-secure-global-api-key"
}

print("1. Deleting old instance...")
try:
    req = urllib.request.Request(f"{url_base}/instance/delete/MosopFarm", headers={"apikey": headers["apikey"]}, method="DELETE")
    urllib.request.urlopen(req)
    print("Deleted old instance.")
except Exception as e:
    print(f"Delete returned: {e}")

time.sleep(2)

print("2. Creating instance & fetching QR...")
data = json.dumps({
    "instanceName": "MosopFarm",
    "token": "mosop-secret-token",
    "qrcode": True,
    "integration": "WHATSAPP-BAILEYS"
}).encode('utf-8')

req = urllib.request.Request(f"{url_base}/instance/create", data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        resp_data = json.loads(response.read().decode('utf-8'))
        
        qr_base64 = None
        if "qrcode" in resp_data and isinstance(resp_data["qrcode"], dict):
            qr_base64 = resp_data["qrcode"].get("base64")
        elif "qrcode" in resp_data and isinstance(resp_data["qrcode"], str):
            qr_base64 = resp_data["qrcode"]
            
        if qr_base64 and qr_base64.startswith("data:image"):
            header, encoded = qr_base64.split(",", 1)
            image_data = base64.b64decode(encoded)
            artifact_dir = "/Users/sawe/.gemini/antigravity-ide/brain/3eac17ca-e4fb-49b3-b269-fdfbb71dff09"
            out_path = os.path.join(artifact_dir, "qrcode_final.png")
            with open(out_path, "wb") as f:
                f.write(image_data)
            print(f"QR_SUCCESS:{out_path}")
        else:
            print("Could not find base64 qrcode in response.")
            print(json.dumps(resp_data, indent=2))
except Exception as e:
    print(f"Failed to fetch QR code: {e}")

time.sleep(2)

print("3. Setting Webhook...")
webhook_data = json.dumps({
  "webhook": {
    "enabled": True,
    "url": "https://mosop-bot-backend-556553559160.us-central1.run.app/webhook/evolution",
    "webhookByEvents": False,
    "webhookBase64": False,
    "events": ["MESSAGES_UPSERT"]
  }
}).encode('utf-8')

try:
    req = urllib.request.Request(f"{url_base}/webhook/set/MosopFarm", data=webhook_data, headers=headers, method="POST")
    urllib.request.urlopen(req)
    print("Webhook set.")
except Exception as e:
    print(f"Webhook error: {e}")
