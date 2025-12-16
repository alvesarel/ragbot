# Evolution API + Chatwoot Setup Guide

Complete guide to set up Evolution API and Chatwoot for your clinic chatbot.

---

## Overview

This guide covers setting up:
- **Evolution API**: Self-hosted WhatsApp API (uses WhatsApp Web protocol)
- **Chatwoot** (optional): Customer service platform for human agents

### Benefits over Official WhatsApp Business API

| Feature | Official API | Evolution API |
|---------|--------------|---------------|
| Cost | Pay per message | Free (self-hosted) |
| Approval | Meta business verification | No verification needed |
| Setup time | Days/weeks | Minutes |
| Message limits | Tiered limits | Unlimited |
| Multiple numbers | Complex setup | Easy |
| Human takeover | Build your own | Chatwoot integration |

---

## Prerequisites

- Docker and Docker Compose installed
- Server with public IP (for webhooks)
- WhatsApp account (personal phone)
- n8n instance running

---

## Part 1: Evolution API Setup

### Step 1: Deploy Evolution API

#### Option A: Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      # Server
      - SERVER_URL=https://your-domain.com
      - AUTHENTICATION_API_KEY=your_secure_api_key_here

      # Database (optional - for persistence)
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:password@postgres:5432/evolution

      # Webhook settings
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=https://your-n8n.com/webhook/whatsapp
      - WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true

      # Events to send
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
      - WEBHOOK_EVENTS_MESSAGES_UPDATE=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true
      - WEBHOOK_EVENTS_QRCODE_UPDATED=true

      # Chatwoot (if using)
      - CHATWOOT_ENABLED=false

    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store

  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  evolution_instances:
  evolution_store:
  postgres_data:
```

Start the service:
```bash
docker-compose up -d
```

#### Option B: Railway/Render Deployment

Use the Evolution API template:
- Railway: https://railway.app/template/evolution-api
- Render: Search for "Evolution API" in templates

### Step 2: Create WhatsApp Instance

#### Via API:

```bash
curl -X POST 'https://your-evolution-api.com/instance/create' \
  -H 'apikey: your_secure_api_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "instanceName": "clinic-bot",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true,
    "webhook": {
      "url": "https://your-n8n.com/webhook/whatsapp",
      "webhookByEvents": true,
      "webhookBase64": true,
      "events": [
        "MESSAGES_UPSERT",
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED"
      ]
    }
  }'
```

### Step 3: Connect WhatsApp

1. **Get QR Code**:
```bash
curl -X GET 'https://your-evolution-api.com/instance/connect/clinic-bot' \
  -H 'apikey: your_secure_api_key_here'
```

2. **Scan QR Code**:
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices > Link a Device
   - Scan the QR code from the API response

3. **Verify Connection**:
```bash
curl -X GET 'https://your-evolution-api.com/instance/connectionState/clinic-bot' \
  -H 'apikey: your_secure_api_key_here'
```

Response should show `"state": "open"`.

### Step 4: Configure Webhook

Set webhook to receive messages:

```bash
curl -X POST 'https://your-evolution-api.com/webhook/set/clinic-bot' \
  -H 'apikey: your_secure_api_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://your-n8n.com/webhook/whatsapp",
      "webhookByEvents": true,
      "webhookBase64": true,
      "events": [
        "MESSAGES_UPSERT"
      ]
    }
  }'
```

### Step 5: Test Message Sending

```bash
curl -X POST 'https://your-evolution-api.com/message/sendText/clinic-bot' \
  -H 'apikey: your_secure_api_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "number": "5511999999999",
    "text": "Hello from Evolution API!"
  }'
```

---

## Part 2: Chatwoot Setup (Optional)

Chatwoot provides a beautiful inbox for human agents to take over conversations.

### Step 1: Deploy Chatwoot

#### Option A: Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  chatwoot:
    image: chatwoot/chatwoot:latest
    container_name: chatwoot
    restart: unless-stopped
    depends_on:
      - chatwoot-postgres
      - chatwoot-redis
    ports:
      - "3000:3000"
    environment:
      - SECRET_KEY_BASE=your_secret_key_base_here
      - FRONTEND_URL=https://your-chatwoot.com
      - DEFAULT_LOCALE=pt_BR
      - POSTGRES_HOST=chatwoot-postgres
      - POSTGRES_DATABASE=chatwoot
      - POSTGRES_USERNAME=postgres
      - POSTGRES_PASSWORD=password
      - REDIS_URL=redis://chatwoot-redis:6379
      - RAILS_ENV=production
    volumes:
      - chatwoot_data:/app/storage

  chatwoot-postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=chatwoot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - chatwoot_postgres:/var/lib/postgresql/data

  chatwoot-redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - chatwoot_redis:/data

volumes:
  chatwoot_data:
  chatwoot_postgres:
  chatwoot_redis:
```

#### Option B: Chatwoot Cloud

Use the hosted version at https://www.chatwoot.com (free tier available)

### Step 2: Initial Chatwoot Setup

1. Access Chatwoot at `https://your-chatwoot.com`
2. Create admin account
3. Create your organization
4. Note your **Account ID** (visible in URL: `/app/accounts/{ID}/...`)

### Step 3: Create API Channel Inbox

1. Go to **Settings > Inboxes > Add Inbox**
2. Select **API** channel type
3. Configure:
   - Name: "WhatsApp Bot"
   - Webhook URL: `https://your-n8n.com/webhook/chatwoot`
4. Save and note the **Inbox ID**

### Step 4: Get API Access Token

1. Go to **Settings > Profile > Access Token**
2. Copy the token (starts with...)
3. Save securely - this is your `CHATWOOT_API_ACCESS_TOKEN`

### Step 5: Configure Webhook Events

1. Go to **Settings > Integrations > Webhooks**
2. Add webhook:
   - URL: `https://your-n8n.com/webhook/chatwoot`
   - Events: Select `message_created`
3. Save

---

## Part 3: n8n Configuration

### Step 1: Create HTTP Header Auth Credentials

In n8n, create credentials for Evolution API:

1. Go to **Credentials > Add Credential**
2. Select **HTTP Header Auth**
3. Configure:
   - Name: `Evolution API Key`
   - Header Name: `apikey`
   - Header Value: Your Evolution API key
4. Save

For Chatwoot (if using):
1. Create another HTTP Header Auth
2. Name: `Chatwoot API Key`
3. Header Name: `api_access_token`
4. Header Value: Your Chatwoot access token

### Step 2: Import Workflows

Import the following workflows from `workflows/` directory:

1. `whatsapp-webhook-handler.json` - Receives Evolution API webhooks
2. `conversation-orchestrator-v2.json` - AI Agent processing
3. `chatwoot-webhook-handler.json` - Receives Chatwoot webhooks (if using)

### Step 3: Configure Environment Variables

Set these in your n8n environment:

```env
# Evolution API
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_INSTANCE_NAME=clinic-bot
EVOLUTION_WEBHOOK_SECRET=optional_secret

# Chatwoot (optional)
CHATWOOT_ENABLED=true
CHATWOOT_API_URL=https://your-chatwoot.com
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
```

### Step 4: Activate Workflows

1. Open each imported workflow
2. Update credential references if needed
3. Activate the workflows

---

## Part 4: Testing

### Test 1: Receive Message

1. Send a WhatsApp message to your connected number
2. Check n8n execution log
3. Verify webhook payload received

### Test 2: Send Response

1. Check if AI response was generated
2. Verify message sent via Evolution API
3. Confirm message received on WhatsApp

### Test 3: Chatwoot Sync (if enabled)

1. Send message from WhatsApp
2. Check Chatwoot inbox for conversation
3. Reply from Chatwoot
4. Verify reply received on WhatsApp

---

## Troubleshooting

### Evolution API Issues

**QR Code not generating**
```bash
# Check instance status
curl -X GET 'https://your-evolution-api.com/instance/fetchInstances' \
  -H 'apikey: your_api_key'

# Restart instance
curl -X DELETE 'https://your-evolution-api.com/instance/logout/clinic-bot' \
  -H 'apikey: your_api_key'
```

**Connection drops frequently**
- Use a phone number dedicated to the bot
- Don't open WhatsApp Web on other devices
- Check server stability and memory

**Webhook not receiving events**
- Verify webhook URL is accessible
- Check Evolution API logs: `docker logs evolution-api`
- Ensure events are enabled in instance config

### Chatwoot Issues

**Messages not syncing**
- Verify Chatwoot webhook is configured
- Check n8n workflow is active
- Verify API token has correct permissions

**Inbox not receiving messages**
- Confirm inbox type is API
- Check inbox ID in environment variables

---

## Security Best Practices

1. **API Keys**: Use strong, unique API keys
2. **HTTPS**: Always use HTTPS for all services
3. **Firewall**: Restrict Evolution API access to necessary IPs
4. **Webhook Secret**: Configure webhook validation
5. **Token Rotation**: Rotate API tokens periodically

---

## Architecture Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  WhatsApp   │────▶│  Evolution API  │────▶│     n8n      │
│   Users     │◀────│   (Baileys)     │◀────│   Webhook    │
└─────────────┘     └─────────────────┘     └──────┬───────┘
                                                   │
                    ┌─────────────────┐           │
                    │    Chatwoot     │◀──────────┤
                    │   (Optional)    │───────────▶│
                    └─────────────────┘           │
                                                   │
                    ┌─────────────────┐           │
                    │   Claude AI     │◀──────────┤
                    │    (Haiku)      │           │
                    └─────────────────┘           │
                                                   │
                    ┌─────────────────┐           │
                    │    Supabase     │◀──────────┘
                    │   (Database)    │
                    └─────────────────┘
```

---

## Useful Links

- [Evolution API Documentation](https://doc.evolution-api.com/v2)
- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
- [Chatwoot Documentation](https://www.chatwoot.com/docs)
- [n8n Evolution API Node](https://www.npmjs.com/package/n8n-nodes-evolution-api)

---

## Migration from Official WhatsApp API

If migrating from Meta's official WhatsApp Business API:

1. Keep the old system running during transition
2. Deploy Evolution API and connect your number
3. Update n8n workflows to use new format
4. Update environment variables
5. Test thoroughly before switching
6. Point webhook to new n8n endpoint
7. Deactivate old Meta webhooks

**Note**: The same phone number cannot be connected to both APIs simultaneously.
