# Evolution API Setup

WhatsApp integration using Evolution API with a single WhatsApp number and intelligent routing to all three agents (Sofia, Diana, Yara).

## Architecture Overview

```
                                    ┌→ Sofia (unknown contact = lead)
WhatsApp ← QR → Evolution API → n8n Router →→ Diana (known patient)
       (Railway)        ↑                   └→ Yara (authorized team member)
                 n8n HTTP Request
```

**Routing Logic:**
1. If sender is in `AUTHORIZED_PHONES` → Yara (executive assistant)
2. If sender exists in Patients Google Sheet → Diana (patient check-ins)
3. Otherwise → Sofia (lead qualification)

---

## Prerequisites

- Railway account (https://railway.app)
- n8n instance running (self-hosted or cloud)
- Google Sheets API credentials configured in n8n
- OpenAI API key (for embeddings & Whisper)
- Anthropic API key (for Claude Haiku)
- Qdrant instance (for RAG)

---

## Part 1: Deploy Evolution API on Railway

### Step 1: Create New Project

1. Go to https://railway.app and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** OR **"Empty Project"**

### Step 2: Add Evolution API Service

**Option A: Using Railway Template (Recommended)**
1. In your project, click **"+ New"** → **"Template"**
2. Search for "Evolution API" or use this URL:
   ```
   https://railway.app/template/evolution-api
   ```
3. Click **"Deploy"**

**Option B: Manual Docker Deployment**
1. Click **"+ New"** → **"Docker Image"**
2. Enter image: `atendai/evolution-api:latest`
3. Click **"Deploy"**

### Step 3: Configure Environment Variables

In your Evolution API service, go to **Variables** tab and add:

```env
# Server Configuration
SERVER_URL=${{RAILWAY_PUBLIC_DOMAIN}}
PORT=8080

# Authentication
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=<generate-secure-key>
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Database (Railway provides PostgreSQL, but SQLite works too)
DATABASE_ENABLED=true
DATABASE_PROVIDER=sqlite
DATABASE_CONNECTION_URI=file:./evolution.db

# Webhook Configuration (IMPORTANT: Update with your n8n URL)
WEBHOOK_GLOBAL_URL=https://your-n8n-instance.com/webhook/evolution-router
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false

# Enable only necessary webhook events
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
WEBHOOK_EVENTS_APPLICATION_STARTUP=false
WEBHOOK_EVENTS_MESSAGES_SET=false
WEBHOOK_EVENTS_MESSAGES_UPDATE=false
WEBHOOK_EVENTS_MESSAGES_DELETE=false
WEBHOOK_EVENTS_SEND_MESSAGE=false
WEBHOOK_EVENTS_CONTACTS_SET=false
WEBHOOK_EVENTS_CONTACTS_UPSERT=false
WEBHOOK_EVENTS_CONTACTS_UPDATE=false
WEBHOOK_EVENTS_PRESENCE_UPDATE=false
WEBHOOK_EVENTS_CHATS_SET=false
WEBHOOK_EVENTS_CHATS_UPSERT=false
WEBHOOK_EVENTS_CHATS_UPDATE=false
WEBHOOK_EVENTS_CHATS_DELETE=false
WEBHOOK_EVENTS_GROUPS_UPSERT=false
WEBHOOK_EVENTS_GROUPS_UPDATE=false
WEBHOOK_EVENTS_GROUP_PARTICIPANTS_UPDATE=false
WEBHOOK_EVENTS_CALL=false
WEBHOOK_EVENTS_TYPEBOT_START=false
WEBHOOK_EVENTS_TYPEBOT_CHANGE_STATUS=false

# Instance settings
CONFIG_SESSION_PHONE_CLIENT=Evolution API
CONFIG_SESSION_PHONE_NAME=Chrome

# QR Code
QRCODE_LIMIT=30
QRCODE_COLOR=#000000

# Logging
LOG_LEVEL=ERROR
LOG_COLOR=true

# Storage
STORE_MESSAGES=true
STORE_MESSAGE_UP=true
STORE_CONTACTS=true
STORE_CHATS=true
```

**Generate a secure API key:**
```bash
openssl rand -hex 32
```

### Step 4: Add Persistent Volume (Important!)

Evolution API stores WhatsApp session data. Without persistence, you'll need to re-scan QR on every restart.

1. In your Evolution API service, go to **Settings**
2. Scroll to **"Volumes"**
3. Add a volume:
   - Mount path: `/evolution/instances`
   - Size: 1GB (should be plenty)

### Step 5: Get Your Railway Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** or add a custom domain
3. Copy the URL (e.g., `evolution-api-production.up.railway.app`)
4. Update `SERVER_URL` variable to match: `https://evolution-api-production.up.railway.app`

### Step 6: Expose the Port

1. In **Settings** → **Networking**
2. Set **Port** to `8080`

---

## Part 2: Create WhatsApp Instance

Once Evolution API is running on Railway, create a WhatsApp instance.

### Step 1: Access the API

Your Evolution API is now at: `https://your-railway-domain.up.railway.app`

### Step 2: Create Instance via API

Using curl, Postman, or any HTTP client:

```bash
curl -X POST 'https://YOUR_RAILWAY_DOMAIN/instance/create' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_API_KEY' \
  -d '{
    "instanceName": "clinic-whatsapp",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true,
    "webhook": {
      "url": "https://your-n8n-instance.com/webhook/evolution-router",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
    }
  }'
```

### Step 3: Get QR Code

```bash
curl -X GET 'https://YOUR_RAILWAY_DOMAIN/instance/connect/clinic-whatsapp' \
  -H 'apikey: YOUR_API_KEY'
```

This returns a QR code. You can also access it via browser:
```
https://YOUR_RAILWAY_DOMAIN/instance/connect/clinic-whatsapp
```

### Step 4: Scan QR Code

1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices** → **Link a Device**
3. Scan the QR code
4. Wait for connection confirmation

### Step 5: Verify Connection

```bash
curl -X GET 'https://YOUR_RAILWAY_DOMAIN/instance/connectionState/clinic-whatsapp' \
  -H 'apikey: YOUR_API_KEY'
```

Should return: `{"state": "open"}`

---

## Part 3: Configure n8n Workflows

### Step 1: Create Evolution API Credential in n8n

1. In n8n, go to **Credentials** → **Add Credential**
2. Select **"Header Auth"**
3. Configure:
   - Name: `evolution-api-creds`
   - Header Name: `apikey`
   - Header Value: `<your-evolution-api-key>`

### Step 2: Import Workflows

Import the following workflows from `workflows/`:

1. **sofia-standalone.json** - Lead qualification (includes webhook + routing)
2. **diana-standalone.json** - Patient check-ins
3. **yara-evolution.json** - Executive assistant (Telegram)

### Step 3: Configure Workflows

For each workflow, update:

1. **Evolution API URL**: Set to your Railway domain
2. **Credentials**: Select `evolution-api-creds` for HTTP nodes
3. **Google Sheets**: Ensure credential is selected for patient lookup
4. **Admin phone**: Update notification phone numbers

### Step 4: Update Evolution API Webhook

Now that n8n is configured, update Evolution API to send webhooks to your router:

```bash
curl -X PUT 'https://YOUR_RAILWAY_DOMAIN/webhook/set/clinic-whatsapp' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_API_KEY' \
  -d '{
    "url": "https://your-n8n-instance.com/webhook/evolution-router",
    "enabled": true,
    "events": ["MESSAGES_UPSERT"]
  }'
```

---

## Part 4: Testing

### Test 1: Verify Webhook Reception

1. Send a WhatsApp message to your connected number
2. Check n8n execution log for the router workflow
3. Verify payload is received correctly

### Test 2: Test Routing Logic

| Send From | Expected Route | How to Verify |
|-----------|---------------|---------------|
| Unknown number | Sofia | New lead flow triggers |
| Phone in Patients sheet | Diana | Patient response flow |
| Phone in AUTHORIZED_PHONES | Yara | Executive assistant flow |

### Test 3: Test Send Message

Run the `send-whatsapp` workflow manually with test data:
```json
{
  "number": "5511999998888",
  "text": "Test message from n8n"
}
```

### Test 4: Full Agent Tests

- **Sofia**: Send "Olá" from unknown number → Should receive lead qualification response
- **Diana**: Send message from patient phone → Should receive personalized response
- **Yara**: Send "status" from authorized phone → Should receive patient data summary

---

## Troubleshooting

### QR Code Expired / Disconnected

```bash
# Check connection status
curl -X GET 'https://YOUR_RAILWAY_DOMAIN/instance/connectionState/clinic-whatsapp' \
  -H 'apikey: YOUR_API_KEY'

# If disconnected, restart connection
curl -X POST 'https://YOUR_RAILWAY_DOMAIN/instance/restart/clinic-whatsapp' \
  -H 'apikey: YOUR_API_KEY'

# Get new QR code
curl -X GET 'https://YOUR_RAILWAY_DOMAIN/instance/connect/clinic-whatsapp' \
  -H 'apikey: YOUR_API_KEY'
```

### Webhook Not Receiving Messages

1. Verify webhook URL in Evolution API:
   ```bash
   curl -X GET 'https://YOUR_RAILWAY_DOMAIN/webhook/find/clinic-whatsapp' \
     -H 'apikey: YOUR_API_KEY'
   ```

2. Check n8n webhook is active (workflow must be active)

3. Test webhook manually:
   ```bash
   curl -X POST 'https://your-n8n-instance.com/webhook/evolution-router' \
     -H 'Content-Type: application/json' \
     -d '{"event": "test", "data": {}}'
   ```

### Messages Not Sending

1. Check Evolution API logs in Railway dashboard
2. Verify instance is connected
3. Test send directly:
   ```bash
   curl -X POST 'https://YOUR_RAILWAY_DOMAIN/message/sendText/clinic-whatsapp' \
     -H 'Content-Type: application/json' \
     -H 'apikey: YOUR_API_KEY' \
     -d '{
       "number": "5511999998888",
       "text": "Test message"
     }'
   ```

### Railway Service Restarting / Crashing

1. Check Railway logs for errors
2. Verify environment variables are set correctly
3. Ensure volume is mounted for session persistence
4. Check if you're hitting Railway's resource limits

---

## API Reference

### Send Text Message
```bash
POST /message/sendText/{instanceName}
{
  "number": "5511999998888",
  "text": "Message content"
}
```

### Send Media (Image/Audio/Video/Document)
```bash
POST /message/sendMedia/{instanceName}
{
  "number": "5511999998888",
  "mediatype": "image",  # image, audio, video, document
  "media": "base64_encoded_content",
  "fileName": "image.jpg",
  "caption": "Optional caption"
}
```

### Download Media from Message
```bash
POST /chat/getBase64FromMediaMessage/{instanceName}
{
  "message": { /* original message object */ }
}
```

### Check Instance Status
```bash
GET /instance/connectionState/{instanceName}
```

### Fetch Instance Info
```bash
GET /instance/fetchInstances
```

---

## File Reference

| File | Purpose |
|------|---------|
| `.env.example` | Environment variables template |
| `workflows/sofia-standalone.json` | Lead qualification agent |
| `workflows/diana-standalone.json` | Patient check-in agent |
| `workflows/yara-evolution.json` | Executive assistant agent |
| `scripts/setup-webhooks.sh` | Webhook registration script |

---

## Security Considerations

1. **API Key**: Use a strong, randomly generated API key
2. **HTTPS**: Always use HTTPS for production (Railway provides this automatically)
3. **Webhook Validation**: Consider adding signature validation for webhooks
4. **Rate Limiting**: Be mindful of message volume to avoid WhatsApp restrictions
5. **Session Backup**: Regularly backup the Evolution instances volume

---

## Limitations vs Official API

| Feature | Official API | Evolution API |
|---------|--------------|---------------|
| Stability | High | Medium (WhatsApp Web protocol) |
| Meta Support | Yes | No |
| Account Risk | Low | Medium (unofficial usage) |
| Cost | Per-message pricing | Self-hosted (free) |
| Setup | Complex (Meta approval) | Simple (QR scan) |
| Templates | Required for some messages | Not needed |
| Media | Full support | Full support |
| Groups | Limited | Full support |

---

## Maintenance

### Daily
- Monitor Railway logs for errors
- Check n8n execution history for failed workflows

### Weekly
- Verify WhatsApp connection is still active
- Review routing metrics (how many to each agent)

### Monthly
- Update Evolution API image to latest version
- Review and rotate API keys if needed
- Backup Railway volumes
