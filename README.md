# Sofia Assistant

AI-powered WhatsApp assistant for a premium weight loss clinic, built with n8n, Claude AI, and RAG.

## Architecture

```
WhatsApp Business API → n8n Webhook → Sofia Workflow
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
              Supabase               Qdrant RAG              Claude AI
           (Conversations)        (Knowledge Base)         (Responses)
                    │                                            │
                    └────────────────────────────────────────────┘
                                           │
                                           ▼
                                    WhatsApp Reply
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Automation | n8n |
| LLM | Claude (Anthropic) |
| Vector DB | Qdrant |
| Database | Supabase |
| WhatsApp | Official Business Cloud API |
| Notifications | Telegram |

## Project Structure

```
ragbot/
├── workflows/           # n8n workflow
│   └── sofia-assistant.json  # Main workflow
├── dashboard/           # Monitoring web app
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── database/           # Supabase schema
│   └── schema.sql
├── prompts/            # AI system prompt
│   └── system-prompt.md
├── knowledge-base/     # RAG documents
│   ├── institutional/
│   ├── treatments/
│   ├── faq/
│   ├── objection_handling/
│   └── compliance/
├── scripts/           # Utilities
└── .env.example       # Environment template
```

## Quick Start

### 1. Database Setup
```sql
-- Run in Supabase SQL Editor
-- Copy contents of database/schema.sql
```

### 2. Knowledge Base
```bash
# Edit markdown files in knowledge-base/
# Then run embedding script
node scripts/embed_knowledge_base.js
```

### 3. n8n Workflow
1. Import `workflows/sofia-assistant.json`
2. Configure credentials:
   - Supabase API
   - OpenAI API (embeddings)
   - Anthropic API (Claude)
   - WhatsApp Bearer Token
   - Qdrant API Key
   - Telegram Bot
3. Activate workflow

### 4. WhatsApp Setup
1. Create WhatsApp Business App in Meta Developer Console
2. Configure webhook: `https://your-n8n.com/webhook/whatsapp-webhook`
3. Subscribe to `messages` field
4. Set verify token

### 5. Dashboard
1. Open `dashboard/index.html`
2. Enter Supabase URL and Anon Key
3. Start monitoring

## Environment Variables

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_VERIFY_TOKEN=your_verify_token

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx
SUPABASE_ANON_KEY=eyJxxxxx

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_key
QDRANT_COLLECTION=sofia_knowledge

# Notifications
TELEGRAM_BOT_TOKEN=123:ABC
TELEGRAM_CHAT_ID=-100123
```

## Conversation Flow

1. **Greeting** - Welcome, LGPD consent
2. **Discovery** - Understand goals
3. **Qualification** - Collect contact data
4. **Value Building** - Explain methodology
5. **Scheduling** - Book appointment
6. **Confirmation** - Send details

## Sofia Personality

- Warm, caring, professional
- Portuguese (primary), English supported
- 1-2 emojis per message max
- Conversational data collection (not form-like)

## Pricing Rules

| Item | Rule |
|------|------|
| Consultation (R$700) | Can mention after building value |
| Treatment (R$3,000+) | Never mention, redirect to consultation |

## Handoff Triggers

- Pregnancy/breastfeeding
- Serious medical conditions
- User frustration (3+ negative messages)
- Direct request for human
- Business negotiations

## Dashboard Features

- Real-time conversation tracking
- Conversion funnel analytics
- Stage distribution
- Message history viewer
- Search and filter

## License

Private - All rights reserved
