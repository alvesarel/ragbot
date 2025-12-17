# Sofia Setup Guide

Complete setup guide for deploying Sofia Assistant.

## Prerequisites

- n8n instance (self-hosted or cloud)
- Supabase project
- Qdrant instance (self-hosted or cloud)
- Meta Business Account with WhatsApp API access
- Anthropic API key
- OpenAI API key

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

Create the collection:
```bash
curl -X PUT 'http://localhost:6333/collections/sofia_knowledge' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

## Step 3: Index Knowledge Base

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export OPENAI_API_KEY=sk-xxxxx
export QDRANT_URL=http://localhost:6333
export QDRANT_API_KEY=your_key
export QDRANT_COLLECTION=sofia_knowledge
```

3. Run embedding script:
```bash
node scripts/embed_knowledge_base.js
```

## Step 4: WhatsApp Business Setup

1. Go to https://developers.facebook.com
2. Create a new app (Business type)
3. Add WhatsApp product
4. Go to WhatsApp > API Setup
5. Note down:
   - Phone Number ID
   - Temporary Access Token (or create permanent token)
6. Generate a random verify token string

## Step 5: n8n Workflow

1. Open your n8n instance
2. Create credentials:

   **Supabase API**
   - Host: `https://xxxxx.supabase.co`
   - Service Role Key: `eyJxxx...`

   **OpenAI API**
   - API Key: `sk-xxxxx`

   **Anthropic API**
   - API Key: `sk-ant-xxxxx`

   **HTTP Header Auth (WhatsApp)**
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_WHATSAPP_ACCESS_TOKEN`

   **HTTP Header Auth (Qdrant)**
   - Header Name: `api-key`
   - Header Value: `YOUR_QDRANT_API_KEY`

   **Telegram API**
   - Bot Token: `123456789:ABC...`
   - Default Chat ID: `-100123456789`

3. Import `workflows/sofia-assistant.json`
4. Update credential references in nodes
5. Set environment variables in n8n settings:
   - `QDRANT_URL`
   - `QDRANT_COLLECTION`
   - `TELEGRAM_CHAT_ID`

6. Activate the workflow
7. Copy the webhook URL: `https://your-n8n.com/webhook/whatsapp-webhook`

## Step 6: Configure WhatsApp Webhook

1. Go to Meta Developer Console > WhatsApp > Configuration
2. Click **Edit** on Webhook
3. Callback URL: `https://your-n8n.com/webhook/whatsapp-webhook`
4. Verify Token: Your verify token string
5. Subscribe to: `messages`

## Step 7: Test the Bot

1. Go to WhatsApp > API Setup > Send Test Message
2. Add your phone number
3. Send a test message to your WhatsApp Business number
4. Check n8n execution logs

## Step 8: Dashboard Setup

1. Deploy `dashboard/` folder to any static hosting:
   - Vercel
   - Netlify
   - GitHub Pages
   - Or just open `index.html` locally

2. Enter your Supabase URL and Anon Key
3. The dashboard will auto-connect and show conversations

## Troubleshooting

### Webhook not receiving messages
- Check n8n webhook URL is accessible
- Verify the verify token matches
- Check Meta app is in "Live" mode

### AI responses not working
- Verify Anthropic API key is valid
- Check n8n execution logs for errors

### RAG not returning results
- Verify Qdrant connection
- Check if knowledge base was indexed
- Try lowering score_threshold in workflow

### Dashboard not connecting
- Check Supabase URL is correct
- Verify Anon Key has read permissions
- Check browser console for errors

## Production Checklist

- [ ] Permanent WhatsApp access token (System User)
- [ ] n8n on reliable hosting (Railway, Render, etc.)
- [ ] Qdrant on cloud or dedicated server
- [ ] Supabase on paid plan for production
- [ ] SSL on all endpoints
- [ ] Backup strategy for database
- [ ] Monitoring and alerts configured
