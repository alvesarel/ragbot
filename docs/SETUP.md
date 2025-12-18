# Sofia Setup Guide

Complete setup guide for deploying Sofia, the Sales Lead Qualification Assistant.

> **Other Agents:**
> - Diana (Patient Check-in): [PATIENT_CHECKIN_SETUP.md](PATIENT_CHECKIN_SETUP.md)
> - Yara (Executive Assistant): [YARA_SETUP.md](YARA_SETUP.md)

## Overview

Sofia is a WhatsApp AI agent that qualifies leads from Meta Ads, builds value through conversation, and schedules consultations. She uses RAG to retrieve clinic information and handles objections professionally.

## Prerequisites

- n8n instance (self-hosted or cloud)
- Supabase project
- Qdrant instance (self-hosted or cloud)
- Meta Business Account with WhatsApp API access
- Anthropic API key (Claude Haiku 4.5)
- OpenAI API key (embeddings)
- Telegram Bot (for handoff notifications)

## Step 1: Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor**
3. Copy and run the contents of `database/schema.sql`
4. Note down:
   - Project URL: `https://xxxxx.supabase.co`
   - Service Key (Settings > API > service_role key)
   - Anon Key (Settings > API > anon key)

## Step 2: Qdrant Vector Database

### Option A: Qdrant Cloud (Recommended)
1. Create account at https://cloud.qdrant.io
2. Create a new cluster
3. Note down the URL and API key

### Option B: Self-hosted with Docker
```bash
docker run -p 6333:6333 qdrant/qdrant
```

Create the collection (if not using the embedding script):
```bash
curl -X PUT 'http://localhost:6333/collections/clinic_knowledge_base' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

## Step 3: Index Knowledge Base

The knowledge base is shared by all agents (Sofia, Diana, Yara).

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export OPENAI_API_KEY=sk-xxxxx
export QDRANT_URL=https://your-cluster.qdrant.io  # or http://localhost:6333
export QDRANT_API_KEY=your_key
export QDRANT_COLLECTION_NAME=clinic_knowledge_base
```

3. Run embedding script:
```bash
node scripts/embed_knowledge_base.js
```

This indexes all markdown files in `knowledge-base/` into Qdrant.

## Step 4: WhatsApp Business Setup

1. Go to https://developers.facebook.com
2. Create a new app (Business type)
3. Add WhatsApp product
4. Go to WhatsApp > API Setup
5. Note down:
   - **Phone Number ID**
   - **Access Token** (create permanent token via System User for production)
6. Generate a random **Verify Token** string for webhook validation

### For Video/Audio Transcription (Optional)
Sofia can transcribe voice messages and videos using OpenAI Whisper. To enable:
1. Create an HTTP Header Auth credential in n8n named `WhatsApp Bearer Token`
2. Header Name: `Authorization`
3. Header Value: `Bearer YOUR_WHATSAPP_ACCESS_TOKEN`

## Step 5: n8n Credentials

Open your n8n instance and create these credentials:

| Credential Type | Name | Configuration |
|-----------------|------|---------------|
| **Supabase API** | `supabase-creds` | Host: `https://xxxxx.supabase.co`, Service Role Key |
| **OpenAI API** | `openai-creds` | API Key: `sk-xxxxx` |
| **Anthropic API** | `anthropic-creds` | API Key: `sk-ant-xxxxx` |
| **Qdrant API** | `qdrant-creds` | URL + API Key |
| **WhatsApp Business** | `whatsapp-creds` | Phone Number ID + Access Token |
| **Telegram API** | `telegram-creds` | Bot Token + Default Chat ID |

## Step 6: Import Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `workflows/sofia-alternative-flow.json`
4. Click **Save**
5. Update credential references in nodes (if needed)

## Step 7: Environment Variables

Set these in n8n (Settings > Variables) or your `.env` file:

```env
# Qdrant
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_key

# Telegram (for handoff notifications)
TELEGRAM_CHAT_ID=-100123456789

# Human Support (optional)
HUMAN_SUPPORT_PHONE=5511999998888
```

## Step 8: Configure WhatsApp Webhook

1. Activate the workflow in n8n
2. Copy the webhook URL from the **WhatsApp Trigger** node
3. In Meta Developer Console:
   - Go to WhatsApp > Configuration > Webhooks
   - Callback URL: `https://your-n8n.com/webhook/sofia-whatsapp`
   - Verify Token: Your verify token string
   - Subscribe to: `messages`

## Step 9: Test the Bot

1. Go to WhatsApp > API Setup > Send Test Message
2. Add your phone number
3. Send a message to your WhatsApp Business number
4. Check n8n execution logs for the flow
5. Verify conversation is logged to Supabase

## Step 10: Dashboard Setup (Optional)

1. Deploy `dashboard/` folder to any static hosting (Vercel, Netlify, GitHub Pages)
2. Or open `dashboard/index.html` locally
3. Enter your Supabase URL and Anon Key in Settings
4. View real-time conversation analytics

## Conversation Stages

Sofia guides leads through these stages:

| Stage | Goal |
|-------|------|
| `greeting` | Welcome, get consent (LGPD) |
| `discovery` | Understand user's goals |
| `qualification` | Collect name, email, CEP naturally |
| `value_building` | Explain methodology, handle objections |
| `scheduling` | Book consultation appointment |
| `confirmation` | Send appointment details |

## Pricing Rules

| Item | Sofia's Behavior |
|------|------------------|
| Consultation (R$700) | Can mention after building value |
| Treatment (R$3,000+) | **NEVER** mention specific value |

## Handoff Triggers

Sofia escalates to human support when:
- Pregnancy/breastfeeding mentioned
- Serious medical conditions
- User shows frustration (negative sentiment)
- Direct request for human
- Business negotiations

## Troubleshooting

### Webhook not receiving messages
- Verify n8n webhook URL is publicly accessible
- Check the verify token matches
- Ensure Meta app is in **Live** mode (not Development)

### AI responses not working
- Verify Anthropic API key is valid
- Check n8n execution logs for errors
- Ensure Claude Haiku 4.5 model ID is correct

### RAG not returning results
- Verify Qdrant connection and collection exists
- Check if knowledge base was indexed
- Try lowering `score_threshold` in workflow

### Dashboard not connecting
- Verify Supabase URL is correct
- Check Anon Key has read permissions
- Check browser console for CORS errors

## Production Checklist

- [ ] Permanent WhatsApp access token (System User)
- [ ] n8n on reliable hosting (Railway, Render, etc.)
- [ ] Qdrant on cloud or dedicated server
- [ ] Supabase on paid plan for production
- [ ] SSL on all endpoints
- [ ] Backup strategy for database
- [ ] Monitoring and alerts configured
- [ ] Meta app set to Live mode
