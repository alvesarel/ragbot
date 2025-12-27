#!/bin/bash

# Evolution API Webhook Setup Script
# This script helps configure the Evolution API instance with the correct webhooks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Evolution API Webhook Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if required environment variables are set
check_env() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${RED}Error: $var_name is not set${NC}"
        echo "Please set it in your .env file or export it:"
        echo "  export $var_name=your-value"
        exit 1
    fi
}

# Load .env file if it exists
if [ -f "../.env" ]; then
    echo -e "${BLUE}Loading .env file...${NC}"
    export $(cat ../.env | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    echo -e "${BLUE}Loading .env file...${NC}"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
echo -e "${YELLOW}Checking required environment variables...${NC}"
check_env "EVOLUTION_API_URL"
check_env "EVOLUTION_API_KEY"
check_env "EVOLUTION_INSTANCE_NAME"
check_env "N8N_WEBHOOK_URL"

echo -e "${GREEN}All required variables are set!${NC}"
echo ""
echo "Configuration:"
echo "  Evolution API URL: $EVOLUTION_API_URL"
echo "  Instance Name: $EVOLUTION_INSTANCE_NAME"
echo "  n8n Webhook URL: $N8N_WEBHOOK_URL"
echo ""

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" "${EVOLUTION_API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -H "apikey: ${EVOLUTION_API_KEY}" \
            -d "$data"
    else
        curl -s -X "$method" "${EVOLUTION_API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -H "apikey: ${EVOLUTION_API_KEY}"
    fi
}

# Step 1: Check if instance exists
echo -e "${YELLOW}Step 1: Checking instance status...${NC}"
instance_status=$(api_call GET "/instance/connectionState/${EVOLUTION_INSTANCE_NAME}" 2>/dev/null || echo '{"error": true}')

if echo "$instance_status" | grep -q '"error"'; then
    echo -e "${YELLOW}Instance not found. Creating new instance...${NC}"

    # Create instance
    create_result=$(api_call POST "/instance/create" "{
        \"instanceName\": \"${EVOLUTION_INSTANCE_NAME}\",
        \"integration\": \"WHATSAPP-BAILEYS\",
        \"qrcode\": true,
        \"webhook\": {
            \"url\": \"${N8N_WEBHOOK_URL}/evolution-router\",
            \"events\": [\"MESSAGES_UPSERT\", \"CONNECTION_UPDATE\", \"QRCODE_UPDATED\"]
        }
    }")

    echo -e "${GREEN}Instance created!${NC}"
    echo "$create_result" | python3 -m json.tool 2>/dev/null || echo "$create_result"
else
    state=$(echo "$instance_status" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}Instance exists. State: $state${NC}"
fi

echo ""

# Step 2: Configure webhook
echo -e "${YELLOW}Step 2: Configuring webhook...${NC}"

webhook_config=$(api_call PUT "/webhook/set/${EVOLUTION_INSTANCE_NAME}" "{
    \"url\": \"${N8N_WEBHOOK_URL}/evolution-router\",
    \"enabled\": true,
    \"webhookByEvents\": false,
    \"events\": [
        \"MESSAGES_UPSERT\",
        \"CONNECTION_UPDATE\",
        \"QRCODE_UPDATED\"
    ]
}")

echo -e "${GREEN}Webhook configured!${NC}"
echo "$webhook_config" | python3 -m json.tool 2>/dev/null || echo "$webhook_config"

echo ""

# Step 3: Get connection status and QR code if needed
echo -e "${YELLOW}Step 3: Checking connection...${NC}"
connection_status=$(api_call GET "/instance/connectionState/${EVOLUTION_INSTANCE_NAME}")
state=$(echo "$connection_status" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

if [ "$state" == "open" ]; then
    echo -e "${GREEN}WhatsApp is connected!${NC}"
else
    echo -e "${YELLOW}WhatsApp is not connected. Getting QR code...${NC}"

    # Connect and get QR code
    qr_result=$(api_call GET "/instance/connect/${EVOLUTION_INSTANCE_NAME}")

    # Check if there's a QR code URL
    if echo "$qr_result" | grep -q "base64"; then
        echo -e "${BLUE}QR Code is available!${NC}"
        echo ""
        echo "To scan the QR code, you can either:"
        echo "1. Open this URL in your browser:"
        echo "   ${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE_NAME}"
        echo ""
        echo "2. Or use the Evolution API dashboard if available"
        echo ""
        echo "After scanning, run this script again to verify connection."
    else
        echo "$qr_result" | python3 -m json.tool 2>/dev/null || echo "$qr_result"
    fi
fi

echo ""

# Step 4: Verify webhook configuration
echo -e "${YELLOW}Step 4: Verifying webhook configuration...${NC}"
webhook_status=$(api_call GET "/webhook/find/${EVOLUTION_INSTANCE_NAME}")
echo "$webhook_status" | python3 -m json.tool 2>/dev/null || echo "$webhook_status"

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Import the workflows from evolution/workflows/ into n8n"
echo "2. Update the 'Execute Workflow' nodes with correct workflow IDs"
echo "3. Configure n8n credentials (evolution-api-creds)"
echo "4. Activate the Router workflow"
echo "5. Test by sending a WhatsApp message"
echo ""
echo "Webhook URL configured: ${N8N_WEBHOOK_URL}/evolution-router"
echo ""
