# Clinic AI Agents - Sofia & Diana

AI-powered WhatsApp assistants for a premium weight loss clinic, built with n8n AI Agent, Claude Haiku 4.5, and RAG.

## Agents Overview

| Agent | Purpose | Trigger |
|-------|---------|---------|
| **Sofia** | Sales assistant for lead qualification and appointment scheduling | WhatsApp incoming messages |
| **Diana** | Patient check-in agent for Tirzepatide weekly treatment follow-ups | Scheduled (Saturdays 11 AM) + WhatsApp responses |

## Architecture

```
                           ┌─────────────────────────────────────┐
                           │         Clinic AI System            │
                           └─────────────────────────────────────┘
                                            │
              ┌─────────────────────────────┴─────────────────────────────┐
              │                                                           │
              ▼                                                           ▼
    ┌─────────────────┐                                         ┌─────────────────┐
    │      SOFIA      │                                         │      DIANA      │
    │  Sales Agent    │                                         │  Check-in Agent │
    └─────────────────┘                                         └─────────────────┘
              │                                                           │
    ┌─────────┴─────────┐                                       ┌─────────┴─────────┐
    │                   │                                       │                   │
    ▼                   ▼                                       ▼                   ▼
WhatsApp           Claude Haiku 4.5                       Schedule Trigger   Claude Haiku 4.5
Trigger            + Memory + RAG                         (Sat 11AM)         + Memory + RAG
    │                   │                                       │                   │
    │                   ▼                                       │                   ▼
    │           Qdrant Vector Store                             │           Google Sheets
    │           (Knowledge Base)                                │           (Patient Data)
    │                   │                                       │                   │
    └───────────┬───────┘                                       └───────────┬───────┘
                │                                                           │
                ▼                                                           ▼
         WhatsApp Reply                                              WhatsApp Reply
                │                                                           │
    ┌───────────┼───────────┐                               ┌───────────────┼───────────────┐
    ▼           ▼           ▼                               ▼               ▼               ▼
Supabase    Telegram    Handoff                      Google Sheets     Telegram      Treatment
(Logs)      (Alerts)    (if needed)                   (Check-in Log)   (Renewals)    Complete
```

## Tech Stack

| Component | Sofia | Diana |
|-----------|-------|-------|
| Automation | n8n AI Agent Node | n8n AI Agent Node |
| LLM | Claude Haiku 4.5 | Claude Haiku 4.5 |
| Memory | Window Buffer (20 msgs) | Window Buffer (10 msgs) |
| Vector DB | Qdrant | Qdrant |
| Embeddings | OpenAI text-embedding-3-small | OpenAI text-embedding-3-small |
| Data Storage | Supabase | Google Sheets |
| WhatsApp | Official Business Cloud API | Official Business Cloud API |
| Notifications | Telegram | Telegram |

## Project Structure

```
ragbot/
├── workflows/
│   ├── sofia-assistant.json         # Sofia - Sales AI Agent
│   ├── sofia-alternative-flow.json  # Sofia - Alternative flow
│   ├── diana-patient-checkin.json   # Diana - Patient Check-in Agent
│   └── knowledge-base-setup.json    # RAG ingestion workflow
├── knowledge-base/
│   ├── institutional/
│   │   └── about_clinic.md
│   ├── treatments/
│   │   ├── methodology.md
│   │   └── tirzepatide_checkin.md   # Tirzepatide treatment info
│   ├── faq/
│   │   └── general_questions.md
│   ├── objection_handling/
│   │   └── price_objections.md
│   └── compliance/
│       └── medical_disclaimers.md
├── prompts/
│   ├── system-prompt.md             # Sofia system prompt
│   └── diana-prompt.md              # Diana system prompt
├── database/
│   └── schema.sql                   # Supabase schema (Sofia)
├── dashboard/
│   ├── index.html                   # Combined dashboard
│   ├── app.js
│   └── styles.css
└── docs/
    ├── SETUP.md                     # Sofia setup guide
    └── PATIENT_CHECKIN_SETUP.md     # Diana setup guide
```

## Quick Start

### Prerequisites

- n8n instance (self-hosted or cloud)
- Qdrant vector database
- Supabase account (for Sofia)
- Google Sheets (for Diana)
- WhatsApp Business API access
- OpenAI API key (for embeddings)
- Anthropic API key (for Claude Haiku 4.5)
- Telegram bot (for notifications)

### Setup Guides

- **Sofia Setup**: See [docs/SETUP.md](docs/SETUP.md)
- **Diana Setup**: See [docs/PATIENT_CHECKIN_SETUP.md](docs/PATIENT_CHECKIN_SETUP.md)

---

## Sofia - Sales Assistant

### Purpose
WhatsApp assistant for lead qualification, value building, and appointment scheduling.

### Features
- **Conversation Memory**: 20-message window buffer per user
- **RAG Knowledge Base**: Retrieves clinic info, treatments, FAQ
- **Natural Data Collection**: Collects name, email, CEP naturally
- **Handoff Detection**: Triggers human escalation when needed
- **Conversation Logging**: Stores all interactions in Supabase

### Conversation Flow

1. **Greeting** - Welcome, LGPD consent
2. **Discovery** - Understand user goals
3. **Qualification** - Collect contact data naturally
4. **Value Building** - Explain methodology, handle objections
5. **Scheduling** - Book appointment
6. **Confirmation** - Send details

### Sofia Personality

- Warm, caring, professional
- Portuguese (Brazilian) primary language
- Maximum 1-2 emojis per message
- Natural conversational data collection
- Never pushy, always empathetic

### Pricing Rules

| Item | Rule |
|------|------|
| Consultation (R$700) | Can mention after building value |
| Treatment (R$3,000+) | NEVER mention specific value |

### Handoff Triggers

- Pregnancy/breastfeeding
- Serious medical conditions
- User frustration (negative sentiment)
- Direct request for human
- Business negotiations

---

## Diana - Patient Check-in Agent

### Purpose
Weekly check-in automation for patients on Tirzepatide (Mounjaro) treatment plans.

### Features
- **Scheduled Check-ins**: Sends messages every Saturday at 11 AM
- **Treatment Tracking**: Monitors remaining weeks, deducts automatically
- **Side Effect Detection**: Analyzes responses for side effects
- **Renewal Reminders**: Alerts at 2 weeks and 1 week remaining
- **Team Handoff**: Telegram notifications with full patient info
- **Google Sheets Integration**: Patient data and check-in logs

### Treatment Plans

| Plan | Duration | Use Case |
|------|----------|----------|
| Starter | 4 weeks | Initial evaluation |
| Standard | 12 weeks | Recommended plan |
| Extended | 16 weeks | Best results |

### Check-in Flow

```
Saturday 11 AM
      │
      ▼
Read Active Patients (Google Sheets)
      │
      ▼
Filter: REMAINING_WEEKS > 0
      │
      ▼
For Each Patient:
      │
      ├─► Generate personalized message (Claude Haiku 4.5)
      │   - Greeting with name
      │   - Current dose reminder
      │   - Weeks remaining
      │   - Well-being questions
      │   - Side effects check
      │
      ├─► Send via WhatsApp
      │
      ├─► Log to CheckInLog sheet
      │
      ├─► Deduct 1 from REMAINING_WEEKS
      │
      └─► Check Treatment Status:
          │
          ├─► 2 weeks remaining: Notify team for renewal outreach
          │
          ├─► Last week: Mark complete + Notify team
          │
          └─► Ongoing: Continue
```

### Renewal Flow

1. **2 Weeks Remaining**: Diana sends reminder, asks about renewal, team notified
2. **1 Week Remaining**: Final check-in, asks about experience, marks treatment complete
3. **Team Handoff**: Telegram message with full patient info for follow-up

### Diana Personality

- Warm, professional, empathetic
- Portuguese (Brazilian) default, switches to English if patient uses it
- NO emojis - clean, professional messages
- Never provides medical advice
- Always encourages contacting doctor for concerns

### Google Sheets Structure

**Patients Sheet:**
```
NAME | PHONE | STARTING_DATE | TOTAL_WEEKS_CONTRACTED | REMAINING_WEEKS | CURRENT_DOSE | PAYMENT_METHOD | LAST_PAYMENT | NOTES | STATUS
```

**CheckInLog Sheet:**
```
DATE | PATIENT_NAME | PHONE | WEEK_NUMBER | DOSE_AT_CHECKIN | REMAINING_WEEKS | MESSAGE_SENT | STATUS | RESPONSE | SIDE_EFFECTS_REPORTED | FOLLOW_UP_NEEDED
```

---

## Environment Variables

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Supabase (Sofia)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx

# Google Sheets (Diana)
PATIENT_SHEET_ID=your_spreadsheet_id

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_key
QDRANT_COLLECTION=sofia_knowledge

# Notifications
TELEGRAM_BOT_TOKEN=123:ABC
TELEGRAM_CHAT_ID=-100123
```

## Dashboard

The unified dashboard provides monitoring for both agents:

### Sofia Section
- Total conversations
- Active conversations
- Scheduled appointments
- Handoff queue
- Conversation analytics
- Stage distribution

### Diana Section
- Active patients
- Treatments in progress
- Pending renewals
- Completed treatments
- Check-in history
- Side effects tracking
- Renewal flow visualization

### Setup
1. Deploy `dashboard/` folder to any static hosting
2. Enter Supabase credentials for Sofia data
3. Diana data is read from Google Sheets (configure in n8n)

## Adding New Knowledge

1. Create/edit markdown file in `knowledge-base/`
2. Use frontmatter for metadata:
```yaml
---
category: treatments
language: pt
tags: [treatment, protocol]
priority: high
---
```
3. Run Knowledge Base Setup workflow
4. New content is immediately available to both agents

## License

Private - All rights reserved
