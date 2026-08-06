import urllib.request
import json
import base64
import os
import time

url = "http://34.173.125.119:8080/instance/create"
headers = {
    "Content-Type": "application/json",
    "apikey": "mosop-secure-global-api-key"
}
data = json.dumps({
    "instanceName": "MosopFarm",
    "token": "mosop-secret-token",
    "qrcode": True,
    "integration": "WHATSAPP-BAILEYS"
}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers=headers, method="POST")

# Give the server a moment to start
time.sleep(2)

try:
    with urllib.request.urlopen(req) as response:
        resp_data = json.loads(response.read().decode('utf-8'))
        
        # Depending on Evo API version, qrcode might be nested differently
        qr_base64 = None
        if "qrcode" in resp_data and isinstance(resp_data["qrcode"], dict):
            qr_base64 = resp_data["qrcode"].get("base64")
        elif "qrcode" in resp_data and isinstance(resp_data["qrcode"], str):
            qr_base64 = resp_data["qrcode"]
            
        if qr_base64 and qr_base64.startswith("data:image"):
            # Strip the prefix
            header, encoded = qr_base64.split(",", 1)
            image_data = base64.b64decode(encoded)
            artifact_dir = "/Users/sawe/.gemini/antigravity-ide/brain/3eac17ca-e4fb-49b3-b269-fdfbb71dff09"
            out_path = os.path.join(artifact_dir, "qrcode.png")
            with open(out_path, "wb") as f:
                f.write(image_data)
            print(f"SUCCESS:{out_path}")
        else:
            print("Could not find base64 qrcode in response.")
            print(json.dumps(resp_data, indent=2))
except Exception as e:
    print(f"Failed to fetch QR code: {e}")
