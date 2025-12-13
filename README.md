# WhatsApp RAG Chatbot - Premium Weight Loss Clinic

AI-powered WhatsApp assistant for lead qualification and appointment scheduling, built on n8n with Claude (Anthropic).

## Features

- Conversational lead qualification in Portuguese & English
- RAG-powered responses from clinic knowledge base
- Google Calendar integration for scheduling
- Human handoff via Telegram for complex cases
- LGPD-compliant data handling

## Architecture

```
Meta Ads --> WhatsApp --> n8n Orchestrator --> Claude AI
                              |
              +---------------+---------------+
              |               |               |
           Qdrant         Supabase      Google Calendar
        (Knowledge)     (Lead Data)    (Scheduling)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Automation | n8n (self-hosted) |
| LLM | Claude (Anthropic) |
| Vector DB | Qdrant |
| Database | Supabase |
| Scheduling | Google Calendar |
| Channel | WhatsApp Business Cloud API |
| Notifications | Telegram |

## Project Structure

```
ragbot/
├── workflows/           # n8n workflow JSON files
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
- WhatsApp Business API access
- Anthropic API key
- OpenAI API key (for embeddings)
- Google Calendar API access
- Telegram bot

### 2. WhatsApp Business API
Follow the guide in `docs/WHATSAPP_SETUP_GUIDE.md`

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

### 5. Import n8n Workflows
Import the JSON files from `workflows/` into your n8n instance.

### 6. Knowledge Base
1. Edit documents in `knowledge-base/`
2. Run embedding script to index in Qdrant

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

## License

Private - All rights reserved
