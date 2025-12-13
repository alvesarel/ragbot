# Railway Deployment Guide

Deploy n8n + Qdrant on the same Railway project to minimize costs.

---

## Architecture Options

### Option A: Railway for Everything (Recommended for simplicity)
```
Railway Project
├── n8n (workflow automation)
├── Qdrant (vector database)
└── PostgreSQL (for n8n + can use for app data)

External:
└── Supabase Free Tier (for conversation state - better dashboard)
```

### Option B: Minimal Railway
```
Railway Project
├── n8n (workflow automation)
└── Qdrant (vector database)

External:
├── Supabase Free Tier (database)
└── (WhatsApp, Claude, OpenAI APIs)
```

**Recommendation**: Option B - Use Supabase free tier for database (500MB free, great dashboard for viewing leads)

---

## Cost Estimate

| Service | Railway Cost | Notes |
|---------|-------------|-------|
| n8n | ~$5-10/month | Depends on executions |
| Qdrant | ~$3-5/month | Light usage |
| **Total** | **~$8-15/month** | Hobby plan |

Plus external costs:
- Supabase: Free tier (500MB)
- Claude API: Pay per use (~$3/1M tokens for Sonnet)
- OpenAI (embeddings): ~$0.02/1M tokens
- WhatsApp: Free for first 1000 conversations/month

---

## Step-by-Step Deployment

### 1. Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Sign up / Login with GitHub
3. Click "New Project"
4. Select "Empty Project"
5. Name it: `clinic-whatsapp-bot`

---

### 2. Deploy n8n

#### 2.1 Add n8n Service
1. In your project, click "+ New"
2. Select "Docker Image"
3. Enter: `n8nio/n8n`
4. Click "Deploy"

#### 2.2 Configure n8n Variables
Click on the n8n service → Variables → Add these:

```env
# n8n Configuration
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Security
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password_here

# Database (Railway PostgreSQL)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}
DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}

# Execution
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168

# Timezone
GENERIC_TIMEZONE=America/Sao_Paulo
TZ=America/Sao_Paulo
```

#### 2.3 Add PostgreSQL for n8n
1. Click "+ New" → "Database" → "PostgreSQL"
2. Wait for deployment
3. The variables above will auto-connect

#### 2.4 Generate Public URL
1. Click on n8n service → Settings → Networking
2. Click "Generate Domain"
3. You'll get: `n8n-production-xxxx.up.railway.app`

#### 2.5 Access n8n
- URL: `https://your-n8n-domain.up.railway.app`
- Login with the basic auth credentials you set

---

### 3. Deploy Qdrant

#### 3.1 Add Qdrant Service
1. Click "+ New" → "Docker Image"
2. Enter: `qdrant/qdrant`
3. Click "Deploy"

#### 3.2 Configure Qdrant
Click on Qdrant service → Variables:

```env
QDRANT__SERVICE__HTTP_PORT=6333
QDRANT__SERVICE__GRPC_PORT=6334
```

#### 3.3 Add Volume for Persistence
1. Click on Qdrant service → Settings → Volumes
2. Click "Add Volume"
3. Mount Path: `/qdrant/storage`
4. This persists your vector data

#### 3.4 Internal Networking
Qdrant doesn't need public access - n8n connects internally:
- Internal URL: `qdrant.railway.internal:6333`

**Important**: Do NOT generate a public domain for Qdrant (security)

---

### 4. Configure n8n to Connect to Qdrant

Add these variables to n8n service:

```env
# Qdrant Connection (internal)
QDRANT_URL=http://qdrant.railway.internal:6333
QDRANT_COLLECTION_NAME=clinic_knowledge_base

# No API key needed for internal connection
```

---

### 5. Set Up Supabase (External - Free Tier)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Paste contents of `database/schema.sql`
5. Run the script
6. Go to Settings → API
7. Copy:
   - Project URL
   - `service_role` key (for n8n)

Add to n8n variables:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx
```

---

### 6. Complete n8n Environment Variables

Here's the full list for n8n:

```env
# ===== n8n Core =====
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# ===== Database =====
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}
DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}

# ===== Timezone =====
GENERIC_TIMEZONE=America/Sao_Paulo
TZ=America/Sao_Paulo

# ===== WhatsApp =====
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token

# ===== AI APIs =====
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# ===== Supabase =====
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx

# ===== Qdrant (Internal) =====
QDRANT_URL=http://qdrant.railway.internal:6333
QDRANT_COLLECTION_NAME=clinic_knowledge_base

# ===== Telegram =====
TELEGRAM_BOT_TOKEN=123456789:ABCxxxxx
TELEGRAM_CHAT_ID=-1001234567890

# ===== Email =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
HANDOFF_EMAIL=atendimento@clinica.com.br

# ===== Business Settings =====
BUSINESS_HOURS_START=8
BUSINESS_HOURS_END=18
GOOGLE_CALENDAR_ID=primary

# ===== Execution =====
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
```

---

### 7. Import Workflows into n8n

1. Access your n8n instance
2. Create credentials first:
   - Anthropic API
   - OpenAI API
   - Supabase API
   - Qdrant API
   - HTTP Header Auth (for WhatsApp)
   - Google Calendar OAuth2
   - SMTP

3. Import workflows:
   - `whatsapp-webhook-handler.json`
   - `conversation-orchestrator-v2.json` (recommended)
   - `calendar-booking.json`
   - `human-handoff.json`

4. Update workflow IDs in variables after import

5. Activate all workflows

---

### 8. Configure WhatsApp Webhook

In Meta Business Suite:
1. Go to your WhatsApp app
2. Configuration → Webhook
3. Set Callback URL: `https://your-n8n-domain.up.railway.app/webhook/whatsapp`
4. Set Verify Token: same as `WHATSAPP_VERIFY_TOKEN`
5. Subscribe to `messages` field

---

### 9. Initialize Qdrant Collection

Run this once to create the collection:

```bash
curl -X PUT "https://your-n8n-domain.up.railway.app/webhook/init-qdrant" \
  -H "Content-Type: application/json"
```

Or create a simple n8n workflow to initialize:

```javascript
// HTTP Request node to Qdrant
// PUT http://qdrant.railway.internal:6333/collections/clinic_knowledge_base
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  }
}
```

---

### 10. Embed Knowledge Base

Option A: Run locally
```bash
cd ragbot
export OPENAI_API_KEY=sk-xxxxx
export QDRANT_URL=https://your-public-qdrant-url  # Temporarily expose
node scripts/embed_knowledge_base.js
```

Option B: Create n8n workflow
Create a workflow that reads files and embeds them (can provide if needed)

---

## Railway Project Structure

After setup, your Railway project should look like:

```
clinic-whatsapp-bot (Project)
├── n8n (Service)
│   ├── Domain: n8n-xxxxx.up.railway.app ✓
│   └── Variables: 25+ configured
├── qdrant (Service)
│   ├── Domain: (none - internal only)
│   ├── Volume: /qdrant/storage
│   └── Variables: 2 configured
└── Postgres (Database)
    └── Auto-connected to n8n
```

---

## Monitoring & Maintenance

### Railway Dashboard
- Monitor CPU/Memory usage
- Check deployment logs
- View costs in real-time

### n8n Executions
- Go to Executions tab
- Filter by workflow
- Check for errors

### Useful Commands

```bash
# Check Qdrant health (from n8n Code node)
const response = await fetch('http://qdrant.railway.internal:6333/health');

# Check collection info
const info = await fetch('http://qdrant.railway.internal:6333/collections/clinic_knowledge_base');
```

---

## Scaling Considerations

### If you outgrow Railway Hobby:

1. **More executions**: Upgrade Railway plan
2. **More vector data**: Add more storage to Qdrant volume
3. **High availability**: Consider Qdrant Cloud for production

### Cost Optimization:

1. Use `claude-haiku` for simple responses, `claude-sonnet` for complex
2. Cache frequent knowledge base queries
3. Prune old executions regularly
4. Use Supabase free tier as long as possible

---

## Troubleshooting

### n8n not starting
- Check PostgreSQL is running
- Verify all required env vars are set
- Check Railway logs

### Qdrant connection failed
- Ensure using internal URL: `qdrant.railway.internal`
- Check Qdrant service is running
- Verify port 6333

### Webhook not receiving
- Check public domain is generated
- Verify WhatsApp webhook configuration
- Test with: `curl https://your-domain/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test`

### Out of memory
- Increase Railway service memory
- Reduce n8n execution history
- Optimize Qdrant collection
