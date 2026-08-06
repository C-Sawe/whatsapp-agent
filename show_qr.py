import urllib.request
import json
import base64
import os
import sys

url = "http://34.173.125.119:8080/instance/connect/MosopFarm"
headers = {
    "apikey": "mosop-secure-global-api-key"
}

print("Fetching fresh QR code from Evolution API...")
req = urllib.request.Request(url, headers=headers, method="GET")

try:
    with urllib.request.urlopen(req) as response:
        resp_data = json.loads(response.read().decode('utf-8'))
        
        qr_base64 = None
        if "base64" in resp_data:
            qr_base64 = resp_data["base64"]
            
        if qr_base64 and qr_base64.startswith("data:image"):
            header, encoded = qr_base64.split(",", 1)
            image_data = base64.b64decode(encoded)
            out_path = os.path.abspath("fresh_qr.png")
            with open(out_path, "wb") as f:
                f.write(image_data)
            print(f"QR Code saved to {out_path}")
            
            # Open the image automatically on Mac
            os.system(f"open '{out_path}'")
            print("Image opened! You have ~20 seconds to scan it before it expires.")
        else:
            print("Could not find base64 qrcode in response.")
            print(json.dumps(resp_data, indent=2))
except Exception as e:
    print(f"Failed to fetch QR code: {e}")
