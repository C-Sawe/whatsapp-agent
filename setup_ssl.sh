
#!/bin/bash
set -e

echo "Updating package list and installing nginx + certbot..."
sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt install -y nginx certbot python3-certbot-nginx

echo "Configuring Nginx reverse proxy..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/portal
server {
    listen 80;
    server_name portal.mosopfarminputs.co.ke;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "Enabling site and restarting Nginx..."
sudo ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
# Remove default nginx site if it conflicts
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "Running Certbot to generate SSL..."
sudo certbot --nginx -d portal.mosopfarminputs.co.ke --non-interactive --agree-tos -m MosopAdmin@mosopfarminputs.co.ke --redirect

echo "SSL Configuration Complete!"
