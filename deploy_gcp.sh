#!/bin/bash
# ==============================================================================
# Master Deployment Script: Mosop Farm Inputs WhatsApp Bot
# ==============================================================================
set -e

# Global Configuration Variables
ZONE="us-central1-a"
REGION="us-central1"
VM_NAME="mosop-gateway-vm"
FIREWALL_RULE_NAME="allow-evolution-api"
BACKEND_SERVICE_NAME="mosop-bot-backend"

echo "================================================================="
echo " Starting GCP Provisioning for Mosop Farm Inputs Bot"
echo "================================================================="

# 1. Provision Free Tier Compliant Compute Engine VM
echo "Step 1: Creating Compute Engine VM (${VM_NAME})..."
gcloud compute instances create "${VM_NAME}" \
    --zone="${ZONE}" \
    --machine-type="e2-micro" \
    --boot-disk-size="30GB" \
    --boot-disk-type="pd-standard" \
    --image-family="ubuntu-2204-lts" \
    --image-project="ubuntu-os-cloud" \
    --tags="evolution-api" \
    --metadata-from-file=startup-script=startup.sh

# 2. Add Firewall Rule for Evolution API Access
echo "Step 2: Creating Firewall rule to allow port 8080..."
gcloud compute firewall-rules create "${FIREWALL_RULE_NAME}" \
    --allow=tcp:8080 \
    --target-tags="evolution-api" \
    --description="Allow inbound TCP traffic on port 8080 targeting evolution-api VMs" \
    --direction=INGRESS

# 3. Deploy Cloud Run FastAPI Service Directly From Source Code
echo "Step 3: Deploying FastAPI Backend service (${BACKEND_SERVICE_NAME}) to Cloud Run..."
gcloud run deploy "${BACKEND_SERVICE_NAME}" \
    --region="${REGION}" \
    --source=. \
    --allow-unauthenticated

echo "================================================================="
echo " Infrastructure Provisioned Successfully!"
echo "================================================================="
