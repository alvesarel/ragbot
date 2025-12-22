# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-agent AI system for a weight loss clinic built with **n8n AI Agent**, **Claude Haiku 4.5**, and **RAG (Qdrant + OpenAI embeddings)**. Three specialized agents handle different communication channels:

| Agent | Channel | Purpose | Data Store |
|-------|---------|---------|------------|
| **Sofia** | WhatsApp | Lead qualification from Meta Ads | Supabase |
| **Diana** | WhatsApp | Weekly patient check-ins (Tirzepatide) | Google Sheets |
| **Yara** | Telegram | Executive assistant for management | Reads from Diana/Sofia |

## Architecture

```
Management (Telegram) → Yara → [Google Sheets, Qdrant, Sofia Data]
                                       ↓
Patients (WhatsApp) ← Diana ← Google Sheets (Patients + CheckIns)
Leads (WhatsApp) ← Sofia ← Supabase + Qdrant
```

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
├── workflows/               # n8n workflow JSON exports (Meta WhatsApp API)
│   ├── sofia-alternative-flow.json    # Lead qualification (WhatsApp)
│   ├── sofia-zapi-flow.json           # Lead qualification (Z-API alternative)
│   ├── diana-patient-checkin.json     # Patient check-ins (WhatsApp)
│   └── yara-executive-assistant.json  # Executive assistant (Telegram)
├── evolution/               # Evolution API integration (self-hosted WhatsApp)
│   ├── README.md            # Comprehensive setup guide
│   ├── .env.example         # Environment variables template
│   ├── docker-compose.yml   # Local development setup
│   ├── scripts/
│   │   └── setup-webhooks.sh    # Webhook configuration script
│   └── workflows/           # Standalone Evolution API workflows
│       ├── sofia-standalone.json    # Sofia with Evolution API
│       ├── diana-standalone.json    # Diana with Evolution API
│       └── yara-evolution.json      # Yara with Evolution API
├── prompts/                 # Agent system prompts (markdown)
│   ├── system-prompt.md     # Sofia personality/rules
│   ├── diana-prompt.md      # Diana personality/rules
│   └── yara-prompt.md       # Yara personality/rules
├── knowledge-base/          # RAG documents (markdown with YAML frontmatter)
│   ├── institutional/       # About clinic, mission, values
│   ├── treatments/          # Tirzepatide protocols, dosage, side effects
│   ├── faq/                 # General questions
│   ├── objection_handling/  # Price objections, concerns
│   └── compliance/          # LGPD, medical disclaimers
├── scripts/
│   └── embed_knowledge_base.js  # Chunks, embeds, uploads to Qdrant
├── database/
│   └── schema.sql           # Supabase schema (Sofia data)
├── dashboard/               # Static HTML/CSS/JS dashboard
│   ├── index.html
│   ├── app.js               # n8n API integration
│   ├── styles.css
│   └── config.example.js    # Configuration template
├── templates/               # Google Sheets CSV templates
│   ├── Patients.csv         # Patient master data structure
│   ├── CheckIns.csv         # Simplified check-in log
│   └── README.md            # Import instructions
└── docs/                    # Setup guides
    ├── SETUP.md             # Sofia setup
    ├── PATIENT_CHECKIN_SETUP.md  # Diana setup
    ├── YARA_SETUP.md        # Yara setup
    ├── WHATSAPP_SETUP.md    # WhatsApp Business API
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

### Handoff Detection Pattern
Sofia uses embedded tags in AI responses:
- `[AGENDAR_CONSULTA]` → Lead ready to schedule
- `[TRANSFERIR_HUMANO]` → Immediate human transfer needed
- `[DADOS_LEAD]...[/DADOS_LEAD]` → Structured lead data block

Response processing node parses these tags and routes accordingly.

---

## Agent-Specific Patterns

### Sofia (Lead Qualification)

**Trigger**: WhatsApp messages from Meta Ads leads

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
3. Notify human support with full context (WhatsApp to designated number)

### Diana (Patient Check-ins)

**Dual Flow Architecture**:

1. **Outbound (Scheduled)**: Every Saturday 11 AM (America/Sao_Paulo)
   - Read Patients sheet → Filter `REMAINING_WEEKS > 0`
   - Generate personalized AI message per patient
   - Send via WhatsApp → Deduct week → Check renewal status
   - Notify team on Telegram if 2 weeks or last week remaining

2. **Inbound (Patient Responses)**:
   - WhatsApp trigger → Lookup patient in Sheets
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

## Database Schema (Supabase - Sofia Only)

**Tables**:
- `conversations` - One row per lead (phone, stage, collected_data JSONB, status)
- `messages` - All message logs with RAG analytics

**Conversation Stages**: greeting → discovery → qualification → value_building → scheduling → confirmation

**Status Values**: active, awaiting_human, scheduled, completed, cold

**Views** (pre-built analytics):
- `daily_metrics` - Inbound/outbound counts, unique users
- `conversion_funnel` - Stages to scheduling conversion rate
- `stage_distribution` - Current pipeline breakdown
- `hourly_activity` - Peak hours analysis
- `recent_conversations` - Dashboard quick view

**Functions**:
- `get_dashboard_summary()` - Returns JSON with totals
- `get_conversation_details(phone)` - Full conversation + messages

---

## Dashboard (Static HTML/JS)

**Architecture**: Pure HTML/CSS/JS connecting to n8n API (no build step)

**Configuration**:
- `config.js` (git-ignored) or localStorage settings
- Requires: n8n URL, n8n API key, workflow IDs for each agent

**Features**:
- Agent status (live/offline) from workflow active state
- Recent executions list
- Per-agent execution history and stats
- Execution filtering by workflow/status

**Not Yet Implemented** (per ROADMAP.md):
- Supabase connection for Sofia data
- Google Sheets connection for Diana data
- Real conversation/patient metrics

---

## Configuration

**Credentials** (n8n Credentials Manager):
- `google-sheets-creds` - Google Sheets OAuth2 (Diana, Yara)
- `anthropic-creds` - Anthropic API (all agents)
- `openai-creds` - OpenAI API (embeddings, Whisper, RAG LLM)
- `qdrant-creds` - Qdrant API (all agents)
- `telegram-creds` - Telegram API (Diana alerts, Yara)
- `whatsapp-creds` - WhatsApp Business API (Sofia, Diana)
- `whatsapp-trigger-creds` - WhatsApp Trigger (Sofia, Diana)
- `whatsapp-bearer-creds` - HTTP Header Auth for media download (Sofia)

**Hardcoded Values** (in workflow JSONs):
- Google Sheet IDs (Patients, CheckIns)
- Telegram chat IDs (authorized users, notification groups)
- Human support phone number (Sofia handoffs)
- WhatsApp phone number IDs

**Environment Variables** (embedding script only):
```env
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

---

## WhatsApp Architecture

**Current**: Dual phone numbers (Sofia = leads, Diana = patients) to avoid routing conflicts.

**Future option**: Unified single-number workflow with routing:
```
Message → Lookup Patients sheet → Found? → Diana : Sofia
```
To implement: merge workflows, add patient lookup at entry, route based on result.

---

## Evolution API Integration

Alternative WhatsApp integration using self-hosted Evolution API (Baileys-based) instead of official Meta API.

### Architecture

```
                                    ┌→ Sofia (unknown contact = lead)
WhatsApp ← QR → Evolution API → n8n Router →→ Diana (known patient)
       (Railway)        ↑                   └→ Yara (authorized team member)
                 n8n HTTP Request
```

### Routing Logic
1. Sender in `AUTHORIZED_PHONES` → Yara
2. Sender in Patients Google Sheet → Diana
3. Otherwise → Sofia

### Deployment Options
- **Railway** (recommended): Deploy `atendai/evolution-api:latest` with persistent volume
- **Docker**: Use `evolution/docker-compose.yml` for local development

### Key Differences from Official API

| Feature | Official API | Evolution API |
|---------|--------------|---------------|
| Stability | High | Medium (WhatsApp Web protocol) |
| Setup | Complex (Meta approval) | Simple (QR scan) |
| Cost | Per-message pricing | Self-hosted (free) |
| Templates | Required for outbound | Not needed |
| Risk | Low | Medium (unofficial) |

### Credentials
- `evolution-api-creds` - Header auth with API key

### Setup Guide
See `evolution/README.md` for complete deployment instructions.

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

### Dashboard Deployment
1. Copy `dashboard/` to static hosting
2. Create `config.js` from `config.example.js` or use Settings UI
3. No build step required

---

## Related Documentation

| Doc | Purpose |
|-----|---------|
| `docs/SETUP.md` | Sofia setup guide |
| `docs/PATIENT_CHECKIN_SETUP.md` | Diana setup guide |
| `docs/YARA_SETUP.md` | Yara setup guide |
| `docs/WHATSAPP_SETUP.md` | WhatsApp Business API credentials setup |
| `docs/ROADMAP.md` | Future improvements and planned features |
| `evolution/README.md` | Evolution API setup and deployment guide |
| `templates/README.md` | Google Sheets import instructions |
