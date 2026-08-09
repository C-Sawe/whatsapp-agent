#!/bin/bash
set -e

echo "Setting up Mosop Portal on VM..."

sudo apt-get update && sudo apt-get install -y unzip

# 1. Unzip
mkdir -p ~/mosop-portal
rm -rf ~/mosop-portal/frontend/dist
unzip -o ~/portal.zip -d ~/mosop-portal

# 2. Setup Venv & Install Dependencies
cd ~/mosop-portal
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install psycopg2-binary uvicorn psutil

# 3. Stop old dashboard
sudo systemctl stop inventory-dashboard.service || true
sudo systemctl disable inventory-dashboard.service || true

# 4. Create new service for the unified portal
cat << 'EOF' | sudo tee /etc/systemd/system/mosop-portal.service
[Unit]
Description=Mosop Farm Unified Portal
After=network.target

[Service]
User=sawe
WorkingDirectory=/home/sawe/mosop-portal
ExecStart=/home/sawe/mosop-portal/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 5. Start and Enable
sudo systemctl daemon-reload
sudo systemctl enable mosop-portal.service
sudo systemctl start mosop-portal.service

echo "Unified portal deployed successfully!"
