# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-agent AI system for a weight loss clinic built with **n8n AI Agent**, **Claude Haiku 4.5**, and **RAG (Qdrant + OpenAI embeddings)**. Four specialized agents handle different communication channels via **Evolution API** (WhatsApp), Telegram, and Instagram:

| Agent | Channel | Purpose | Data Store |
|-------|---------|---------|------------|
| **Sofia** | WhatsApp | Lead qualification | Google Sheets |
| **Diana** | WhatsApp | Weekly patient check-ins (Tirzepatide) | Google Sheets |
| **Yara** | Telegram | Executive assistant for management | Reads from Diana/Sofia |
| **Lara** | Instagram | Comment replies & DM welcome | Google Sheets |

## Architecture

```
                                    ┌→ Sofia (unknown contact = lead)
WhatsApp ← QR → Evolution API → n8n Router →→ Diana (known patient)
       (Railway)        ↑                   └→ Yara (authorized team member)
                 n8n HTTP Request

Instagram → n8n-nodes-instagram-integrations → Lara (comments & DMs)
         (Meta Graph API webhooks)
```

**Routing Logic:**
1. Sender in `AUTHORIZED_PHONES` → Yara
2. Sender in Patients Google Sheet → Diana
3. Otherwise → Sofia

All agents share the **Qdrant knowledge base** (`clinic_knowledge_base` collection) for RAG retrieval.

## Commands

### Embed Knowledge Base
```bash
# Set required env vars first (OPENAI_API_KEY, QDRANT_URL, QDRANT_COLLECTION_NAME)
node scripts/embed_knowledge_base.js
```

### Run Qdrant (self-hosted)
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Create Qdrant Collection
```bash
curl -X PUT 'http://localhost:6333/collections/clinic_knowledge_base' \
  -H 'Content-Type: application/json' \
  -d '{"vectors": {"size": 1536, "distance": "Cosine"}}'
```

---

## Directory Structure

```
ragbot/
├── workflows/               # n8n workflow JSON exports (Evolution API)
│   ├── sofia-standalone.json     # Lead qualification
│   ├── diana-standalone.json     # Patient check-ins
│   ├── yara-evolution.json       # Executive assistant (Telegram)
│   ├── instagram-automation.json # Instagram comments & DMs
│   ├── appointment-booking.json  # Interactive appointment scheduling
│   └── nps-survey.json           # NPS survey with Google Review routing
├── prompts/                 # Agent system prompts (markdown)
│   ├── system-prompt.md     # Sofia personality/rules
│   ├── sofia-patient-prompt.md   # Sofia patient flow variant
│   ├── diana-prompt.md      # Diana personality/rules
│   ├── yara-prompt.md       # Yara personality/rules
│   └── lara-instagram-prompt.md  # Lara Instagram rules
├── knowledge-base/          # RAG documents (markdown with YAML frontmatter)
│   ├── institutional/       # About clinic, mission, values
│   ├── treatments/          # Tirzepatide protocols, dosage, side effects
│   ├── faq/                 # General questions
│   ├── objection_handling/  # Price objections, concerns
│   └── compliance/          # LGPD, medical disclaimers
├── scripts/
│   ├── embed_knowledge_base.js   # Chunks, embeds, uploads to Qdrant
│   └── setup-webhooks.sh         # Evolution API webhook configuration
├── templates/               # Google Sheets CSV templates
│   └── README.md            # Import instructions
└── docs/
    ├── EVOLUTION_SETUP.md   # Complete Evolution API setup guide
    └── ROADMAP.md           # Future improvements
```

---

## Workflow Architecture Patterns

### Common n8n AI Agent Pattern
All three agents follow the same architecture:

```
Trigger → Message Handling → AI Agent Node → Response Processing → Output
              ↓                    ↓
        Type Switch         Langchain Components:
        (text/audio/         - Claude Haiku 4.5 (LLM)
         video/etc)          - Window Buffer Memory
                             - Vector Store Tool (RAG)
                             - Qdrant + OpenAI Embeddings
```

### Memory Keys (Session Isolation)
- **Sofia**: `sofia-whatsapp-{phone}` - 50 message window
- **Diana**: `checkin-{phone}` - 10 message window
- **Yara**: `yara-telegram-{chatId}` - 20 message window
- **Lara**: `instagram-dm-{userId}` - 20 message window (DMs only, comments are stateless)

### Handoff Detection Pattern
Sofia uses embedded tags in AI responses:
- `[AGENDAR_CONSULTA]` → Lead ready to schedule
- `[TRANSFERIR_HUMANO]` → Immediate human transfer needed
- `[DADOS_LEAD]...[/DADOS_LEAD]` → Structured lead data block

Response processing node parses these tags and routes accordingly.

---

## Agent-Specific Patterns

### Sofia (Lead Qualification)

**Trigger**: WhatsApp messages via Evolution API webhook

**Message Types Handled**:
- Text → Direct to AI Agent
- Audio/Video → Transcribed via OpenAI Whisper → AI Agent
- Unsupported (image, sticker, document) → Polite rejection message

**Response Format** (JSON structured output):
```json
{
  "message": "...",
  "extracted_data": {"name": null, "email": null, "cep": null, "date_of_birth": null, "referral_source": null},
  "new_stage": "discovery",
  "action": "await_response|schedule_appointment|request_handoff",
  "requires_handoff": false,
  "sentiment": "positive|neutral|negative"
}
```

**Conversation Stages**:
1. `greeting` → LGPD consent, welcome
2. `discovery` → Goals, weight history
3. `qualification` → Collect mandatory data (name, CPF, DOB, email, address/CEP)
4. `value_building` → Methodology, handle objections
5. `scheduling` → Book appointment
6. `confirmation` → Confirm and handoff

**Handoff Flow**:
When AI includes `[AGENDAR_CONSULTA]` or `[TRANSFERIR_HUMANO]`:
1. Parse lead data from `[DADOS_LEAD]` block
2. Send response to lead via WhatsApp
3. Notify human support with full context

### Diana (Patient Check-ins)

**Dual Flow Architecture**:

1. **Outbound (Scheduled)**: Every Saturday 11 AM (America/Sao_Paulo)
   - Read Patients sheet → Filter `REMAINING_WEEKS > 0`
   - Generate personalized AI message per patient
   - Send via WhatsApp → Deduct week → Check renewal status
   - Notify team on Telegram if 2 weeks or last week remaining

2. **Inbound (Patient Responses)**:
   - Evolution API webhook → Lookup patient in Sheets
   - If known: AI response → Parse summary + follow-up flag → Log to CheckIns sheet → Telegram alert if follow-up needed
   - If unknown: Polite "not registered" message

**AI Summary Extraction**:
Diana's AI outputs a JSON block embedded in response:
```json
{"summary": "Brief summary", "follow_up_needed": true/false, "reason": "..."}
```
Parsed and logged to CheckIns sheet with structured columns.

**Side Effect Escalation Triggers**:
- Persistent vomiting (>24h)
- Severe abdominal pain
- Allergic reactions
- Hypoglycemia signs
- Patient distress/wants to stop

### Yara (Executive Assistant)

**Consolidated Architecture** (no sub-workflows):
- On each message, parallel fetch: Patients sheet + CheckIns sheet
- Pre-calculate analytics (totals, renewals, follow-ups)
- Inject all data into AI context
- Only RAG tool (`query_knowledge_base`) for clinic info queries

**Authorization**:
- Checks Telegram chat ID or user ID against hardcoded authorized values
- Unauthorized users get rejection message

**Data Access**:
- Patient list with status, dose, weeks remaining
- Last 50 check-in logs with summaries
- Pre-calculated: active patients, renewal pending, follow-up needed

### Lara (Instagram Automation)

**Dual Trigger Architecture**:
Uses `n8n-nodes-instagram-integrations` community package for Meta Graph API integration.

1. **Comment Auto-Reply**:
   - Instagram webhook triggers on new comments
   - Filters out our own replies (avoid loops)
   - AI generates short response (max 200 chars)
   - Always directs detailed questions to DM
   - Logs interaction to Google Sheets

2. **DM Welcome & Responses**:
   - Instagram webhook triggers on new DMs
   - Filters out echo messages (our own sends)
   - Memory-based session tracking per user
   - Welcome message on first contact
   - RAG-powered responses for clinic questions
   - Directs to WhatsApp for scheduling

**Response Limits**:
- Comments: Max 200 characters (public visibility)
- DMs: Max 1000 characters (Instagram API limit)

**Pricing Rules (Instagram-specific)**:
- Consultation price (R$700): Can mention in DMs if asked
- Treatment price: NEVER mention, direct to WhatsApp

**WhatsApp Handoff**:
For scheduling and detailed treatment info: `wa.me/5511999986838`

**Required Credentials**:
- `instagram-creds` - Instagram OAuth2 (from n8n-nodes-instagram-integrations)

**Required Google Sheet Tab**:
- `InstagramInteractions` - Columns: TIMESTAMP, TYPE, USERNAME, USER_ID, MESSAGE, RESPONSE, COMMENT_ID, MEDIA_ID

### Appointment Booking (Interactive)

**Uses Evolution API Community Node** (`n8n-nodes-evolution-api`) for interactive WhatsApp features.

**Flow Architecture**:
```
Trigger → Send Typing → Fetch Calendar → Send Date Buttons
                                              ↓
                                    User selects date
                                              ↓
                              Send Time List → User selects time
                                              ↓
                              Send Confirmation Buttons
                                              ↓
                     [Confirm] → Create Calendar Event → Notify Beth
                     [Change]  → Back to Date Selection
```

**Interactive Elements**:
- **Date Selection**: Buttons showing next 3 available dates + "Ver mais datas"
- **Time Selection**: List grouped by Morning/Afternoon with available slots
- **Confirmation**: Buttons for confirm or change

**Session State Management**:
Uses `BookingSessions` Google Sheet tab to track multi-step booking state:
| PHONE | STATE | SELECTED_DATE | SELECTED_TIME | AVAILABLE_SLOTS | EXPIRES_AT |

**States**: `awaiting_date` → `awaiting_time` → `awaiting_confirmation` → `completed`

**Google Calendar Integration**:
- Fetches events for next 14 days
- Calculates available slots (9 AM - 6 PM, excluding 12-2 PM lunch)
- Skips Sundays
- Creates 1-hour appointment events with reminders

**Required Credentials**:
- `evolution-api-node-creds` - Evolution API community node
- `google-calendar-creds` - Google Calendar OAuth2
- `google-sheets-creds` - Google Sheets OAuth2

**Required Google Sheet Tabs**:
- `BookingSessions` - Booking state tracking
- `Appointments` - Completed bookings log (PHONE, NAME, APPOINTMENT_DATE, CALENDAR_EVENT_ID, STATUS, CREATED_AT, SOURCE)

### NPS Survey System

**Dual Workflow Architecture**:

1. **Survey Sender** (Scheduled monthly):
   - Fetches all patients from `AllPatients` sheet
   - Filters eligible (active/completed, not surveyed in 30 days)
   - Sends interactive NPS list (0-10 scale)
   - Logs to `NPSSurveys` sheet

2. **Response Handler** (Webhook):
   - Parses NPS score from list response
   - Classifies: Promoter (9-10), Passive (7-8), Detractor (0-6)
   - Routes response appropriately

**Response Routing**:

| Category | Score | Action |
|----------|-------|--------|
| **Promoter** | 9-10 | Thank you → Google Review request with buttons → Review link |
| **Passive** | 7-8 | Thank you message |
| **Detractor** | 0-6 | Empathetic response → Notify Beth → Mark for follow-up |

**NPS Survey Format**:
Interactive list with sections:
- "Muito provável (9-10)" - Promoters
- "Provável (7-8)" - Passives
- "Pouco provável (4-6)" - Low passives
- "Improvável (0-3)" - Detractors

**Required Credentials**:
- `evolution-api-node-creds` - Evolution API community node
- `google-sheets-creds` - Google Sheets OAuth2

**Required Google Sheet Tab**:
- `NPSSurveys` - Columns: PHONE, NAME, SENT_AT, SCORE, CATEGORY, RESPONDED_AT, REVIEW_SENT, FOLLOW_UP_NEEDED

**Configuration**:
- Schedule: 1st of each month at 10 AM
- Batch size: 50 patients per run (rate limiting)
- Delay: 3 seconds between messages
- **Important**: Replace `YOUR_GOOGLE_REVIEW_LINK` in workflow with actual Google Business review URL

---

## Knowledge Base Structure

Files use YAML frontmatter for metadata:
```yaml
---
category: treatments
language: pt
tags: [treatment, protocol]
priority: high
requires_handoff: false
---
```

**Categories**:
- `institutional` - About clinic, mission, values
- `treatments` - Tirzepatide protocols, dosage schedules, side effects
- `faq` - General questions
- `objection_handling` - Price concerns, skepticism responses
- `compliance` - LGPD, medical disclaimers

**Embedding Script** (`scripts/embed_knowledge_base.js`):
- Parses frontmatter metadata
- Chunks text (~500 words, 50 word overlap)
- Generates embeddings via OpenAI `text-embedding-3-small`
- Uploads to Qdrant with payload (content, category, tags, source file)
- Rate limited (100ms between embeddings)

---

## Configuration

**Credentials** (n8n Credentials Manager):
- `evolution-api-creds` - Header auth with API key (WhatsApp HTTP requests)
- `evolution-api-node-creds` - Evolution API community node (`n8n-nodes-evolution-api`)
- `google-sheets-creds` - Google Sheets OAuth2 (all agents)
- `google-calendar-creds` - Google Calendar OAuth2 (appointment booking)
- `anthropic-creds` - Anthropic API (all agents)
- `openai-creds` - OpenAI API (embeddings, Whisper)
- `qdrant-creds` - Qdrant API (all agents)
- `telegram-creds` - Telegram API (Diana alerts, Yara)
- `instagram-creds` - Instagram OAuth2 (Lara) via n8n-nodes-instagram-integrations

**Hardcoded Values** (in workflow JSONs):
- Google Sheet IDs (Patients, CheckIns, Leads)
- Telegram chat IDs (authorized users, notification groups)
- Admin phone number (handoff notifications)
- Evolution API instance name

**Environment Variables** (`.env.example`):
```env
# Evolution API
EVOLUTION_API_URL=https://your-railway-domain.up.railway.app
EVOLUTION_API_KEY=your-api-key
EVOLUTION_INSTANCE_NAME=clinic-whatsapp

# n8n Webhooks
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# Embedding Script
OPENAI_API_KEY=sk-xxxxx
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_key
QDRANT_COLLECTION_NAME=clinic_knowledge_base
```

---

## Business Rules

**Pricing (Sofia only)**:
- Consultation (R$700): Can mention after building value
- Treatment (R$3,000+): NEVER mention specific value

**Handoff Triggers**:
- Pregnancy/breastfeeding, serious medical conditions
- User frustration or explicit human request
- Severe side effects (Diana): persistent vomiting, allergic reactions, hypoglycemia

**Language**: Brazilian Portuguese default. Diana switches to English if patient uses it.

**Communication Style**:
- Sofia: Professional, concise, NO emojis
- Diana: Professional, NO emojis
- Yara: Executive/analytical, minimal emojis
- Lara: Friendly, casual (Instagram tone), max 1-2 emojis

---

## Treatment Plans (Diana)

| Plan | Duration | Use Case |
|------|----------|----------|
| Starter | 4 weeks | Initial evaluation |
| Standard | 12 weeks | Recommended plan |
| Extended | 16 weeks | Best results |

**Dosage Schedule** (Tirzepatide):
- Week 1-4: 2.5mg
- Week 5-8: 5mg
- Week 9-12: 7.5mg
- Week 13+: 10-15mg (maintenance)

**Renewal Alerts**:
- 2 weeks remaining: Diana mentions renewal, team notified
- 1 week remaining: Final check-in, mark complete, team handoff

---

## Development Notes

### Adding New Knowledge
1. Create/edit markdown file in `knowledge-base/`
2. Add YAML frontmatter (category, tags, priority)
3. Run `node scripts/embed_knowledge_base.js`
4. New content immediately available to all agents

### Modifying Agent Behavior
1. Edit prompt in `prompts/*.md`
2. Copy content to workflow JSON `systemMessage` field
3. Re-import workflow to n8n
4. Workflow prompts are the source of truth (prompts/ are documentation)

### Testing Workflows
1. Use n8n test mode with sample WhatsApp/Telegram payloads
2. Check execution logs for AI agent decisions
3. Verify RAG retrieval in vector store tool output
4. Monitor Telegram notifications for handoff triggers

---

## Related Documentation

| Doc | Purpose |
|-----|---------|
| `docs/EVOLUTION_SETUP.md` | Complete Evolution API deployment guide |
| `docs/ROADMAP.md` | Future improvements and planned features |
| `templates/README.md` | Google Sheets import instructions |
