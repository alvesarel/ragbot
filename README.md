# WhatsApp RAG Chatbot - Premium Weight Loss Clinic

AI-powered WhatsApp assistant for lead qualification and appointment scheduling, built on n8n with Claude (Anthropic).

## Features

- Conversational lead qualification in Portuguese & English
- RAG-powered responses from clinic knowledge base
- Google Calendar integration for scheduling
- Human handoff via Telegram or Chatwoot for complex cases
- LGPD-compliant data handling
- Evolution API integration (no Meta Business verification needed)
- Optional Chatwoot inbox for agent management

## Architecture

```
Meta Ads --> WhatsApp --> Evolution API --> n8n Orchestrator --> Claude AI
                              |                   |
                              |     +-------------+-------------+
                              |     |             |             |
                              |  Qdrant       Supabase    Google Calendar
                              | (Knowledge)  (Lead Data)   (Scheduling)
                              |
                              └──────> Chatwoot (Optional)
                                      (Agent Inbox)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Automation | n8n (self-hosted) |
| LLM | Claude Haiku 4.5 (Anthropic) |
| Vector DB | Qdrant |
| Database | Supabase |
| Scheduling | Google Calendar |
| WhatsApp | Evolution API (Baileys-based) |
| Agent Inbox | Chatwoot (optional) |
| Notifications | Telegram |

## Project Structure

```
ragbot/
├── workflows/           # n8n workflow JSON files
│   ├── whatsapp-webhook-handler.json      # Evolution API webhook
│   ├── conversation-orchestrator-v2.json  # AI Agent (main)
│   ├── chatwoot-webhook-handler.json      # Chatwoot integration
│   ├── human-handoff.json                 # Escalation logic
│   ├── calendar-booking.json              # Scheduling
│   └── ...
├── database/           # Supabase schema and migrations
├── prompts/            # Claude system prompts
├── knowledge-base/     # RAG documents
│   ├── institutional/  # About clinic, team, location
│   ├── treatments/     # Medical weight loss info
│   ├── patient_journey/# What to expect
│   ├── faq/           # Common questions
│   ├── objection_handling/  # Price, trust objections
│   └── compliance/    # LGPD, disclaimers
├── scripts/           # Utility scripts
├── docs/              # Documentation
└── .env.example       # Environment variables template
```

## Setup

### 1. Prerequisites
- n8n instance (self-hosted or cloud)
- Supabase account
- Qdrant instance
- Evolution API server
- Anthropic API key
- OpenAI API key (for embeddings)
- Google Calendar API access
- Telegram bot
- Chatwoot instance (optional)

### 2. Evolution API & Chatwoot Setup
Follow the guide in `docs/EVOLUTION_API_SETUP_GUIDE.md`

### 3. Database Setup
```bash
# Run the Supabase schema
psql -f database/schema.sql
```

### 4. Environment Variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

Key variables:
```env
# Evolution API
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_INSTANCE_NAME=clinic-bot
EVOLUTION_API_KEY=your_api_key

# Chatwoot (optional)
CHATWOOT_ENABLED=false
CHATWOOT_API_URL=https://your-chatwoot.com
CHATWOOT_ACCOUNT_ID=1
```

### 5. Import n8n Workflows
Import the JSON files from `workflows/` into your n8n instance:
1. `whatsapp-webhook-handler.json` - Receives WhatsApp messages
2. `conversation-orchestrator-v2.json` - AI processing (main workflow)
3. `chatwoot-webhook-handler.json` - Agent replies (if using Chatwoot)
4. Other supporting workflows

### 6. Configure Credentials in n8n
Create HTTP Header Auth credentials:
- **Evolution API Key**: Header `apikey` with your API key
- **Chatwoot API Key** (optional): Header `api_access_token`

### 7. Knowledge Base
1. Edit documents in `knowledge-base/`
2. Run embedding script to index in Qdrant:
```bash
node scripts/embed_knowledge_base.js
```

## Bot Personality: Sofia

- Warm, caring, professional
- Bilingual (Portuguese primary, English supported)
- Never mentions treatment prices
- Consultation price (R$700) shared with value context
- Focuses on personalized experience and results

## Lead Qualification Flow

1. **Greeting** - Welcome, detect language
2. **Discovery** - Understand goals and motivation
3. **Qualification** - Collect name, email, CEP, DOB, CPF
4. **Value Building** - Explain methodology, handle objections
5. **Scheduling** - Check calendar, book appointment
6. **Confirmation** - Send details and prep materials

## Handoff Triggers

- Under 16 years old (auto-disqualify)
- Medical complexity (pregnancy, conditions)
- Negative sentiment (3+ messages)
- Complex negotiations (partnerships, B2B)
- User requests human

## Chatwoot Integration (Optional)

When Chatwoot is enabled:
- All conversations are synced to Chatwoot inbox
- Human agents can take over conversations
- Agent replies are automatically sent to WhatsApp
- Bot can be paused per conversation

## Documentation

- `docs/EVOLUTION_API_SETUP_GUIDE.md` - WhatsApp + Chatwoot setup
- `docs/N8N_WORKFLOW_GUIDE.md` - Workflow configuration
- `docs/QDRANT_SETUP_GUIDE.md` - Vector database setup
- `docs/RAILWAY_DEPLOYMENT.md` - Production deployment

## License

Private - All rights reserved
