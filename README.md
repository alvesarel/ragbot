# Clinic AI Agents

Multi-agent AI system for a premium weight loss clinic, built with **n8n AI Agent**, **Claude Haiku 4.5**, and **RAG (Qdrant)**. Uses **Evolution API** for WhatsApp integration.

## Agents

| Agent | Channel | Purpose |
|-------|---------|---------|
| **Sofia** | WhatsApp | Lead qualification from Meta Ads |
| **Diana** | WhatsApp | Weekly patient check-ins (Tirzepatide) |
| **Yara** | Telegram | Executive assistant for management |

## Architecture

```
                                    ┌→ Sofia (unknown contact = lead)
WhatsApp ← QR → Evolution API → n8n Router →→ Diana (known patient)
       (Railway)        ↑                   └→ Yara (authorized team member)
                 n8n HTTP Request
```

**Routing Logic:**
1. Sender in `AUTHORIZED_PHONES` → Yara
2. Sender in Patients Google Sheet → Diana
3. Otherwise → Sofia

## Tech Stack

| Component | Technology |
|-----------|------------|
| Automation | n8n AI Agent Node |
| LLM | Claude Haiku 4.5 |
| Vector DB | Qdrant |
| Embeddings | OpenAI text-embedding-3-small |
| Data Storage | Google Sheets |
| WhatsApp | Evolution API (Railway) |
| Notifications | Telegram |

## Project Structure

```
ragbot/
├── workflows/                       # n8n workflow JSON exports
│   ├── sofia-standalone.json        # Lead qualification
│   ├── diana-standalone.json        # Patient check-ins
│   └── yara-evolution.json          # Executive assistant
├── knowledge-base/                  # RAG documents (markdown)
│   ├── institutional/
│   ├── treatments/
│   ├── faq/
│   ├── objection_handling/
│   └── compliance/
├── prompts/                         # Agent system prompts
│   ├── system-prompt.md             # Sofia
│   ├── diana-prompt.md              # Diana
│   └── yara-prompt.md               # Yara
├── scripts/
│   ├── embed_knowledge_base.js      # RAG embedding script
│   └── setup-webhooks.sh            # Evolution API webhooks
├── templates/                       # Google Sheets templates
└── docs/
    ├── EVOLUTION_SETUP.md           # Setup guide
    └── ROADMAP.md                   # Future plans
```

## Quick Start

### Prerequisites

- n8n instance (self-hosted or cloud)
- Railway account (for Evolution API)
- Qdrant vector database
- Google Sheets
- OpenAI API key
- Anthropic API key
- Telegram bot

### Setup

1. **Deploy Evolution API** on Railway - see [docs/EVOLUTION_SETUP.md](docs/EVOLUTION_SETUP.md)
2. **Import workflows** to n8n from `workflows/`
3. **Configure credentials** in n8n
4. **Embed knowledge base**: `node scripts/embed_knowledge_base.js`
5. **Scan QR code** to connect WhatsApp

---

## Sofia - Lead Qualification

Qualifies leads from Meta Ads, builds value, and schedules appointments.

### Flow
1. **Greeting** - Welcome, LGPD consent
2. **Discovery** - Understand goals
3. **Qualification** - Collect contact data
4. **Value Building** - Handle objections
5. **Scheduling** - Book appointment
6. **Handoff** - Transfer to human support

### Personality
- Professional, concise, empathetic
- Brazilian Portuguese
- NO emojis
- Never pushy

---

## Diana - Patient Check-ins

Weekly check-ins for Tirzepatide treatment patients.

### Features
- **Scheduled Check-ins**: Saturdays 11 AM
- **Treatment Tracking**: Auto-deducts weeks
- **AI Summaries**: Logs patient responses
- **Follow-up Detection**: Flags patients needing attention
- **Renewal Reminders**: Alerts at 2 weeks remaining

### Treatment Plans

| Plan | Duration |
|------|----------|
| Starter | 4 weeks |
| Standard | 12 weeks |
| Extended | 16 weeks |

### Escalation Triggers
- Persistent vomiting (>24h)
- Severe abdominal pain
- Allergic reactions
- Hypoglycemia signs

---

## Yara - Executive Assistant

Telegram-based assistant for clinic management.

### Capabilities
- Query patient data
- Review check-in history
- Identify treatment patterns
- Access knowledge base
- Generate analytics

### Sample Queries
```
"Quantos pacientes estao em tratamento?"
"Qual o status do paciente Maria Silva?"
"Liste os pacientes com follow-up pendente"
```

---

## Configuration

### n8n Credentials

| Credential | Type |
|------------|------|
| `evolution-api-creds` | Header Auth |
| `google-sheets-creds` | Google OAuth2 |
| `anthropic-creds` | Anthropic API |
| `openai-creds` | OpenAI API |
| `qdrant-creds` | Qdrant API |
| `telegram-creds` | Telegram Bot |

### Environment Variables

```env
# Evolution API
EVOLUTION_API_URL=https://your-railway-domain.up.railway.app
EVOLUTION_API_KEY=your-api-key

# Embedding Script
OPENAI_API_KEY=sk-xxxxx
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_key
QDRANT_COLLECTION_NAME=clinic_knowledge_base
```

---

## Adding Knowledge

1. Create markdown file in `knowledge-base/`
2. Add YAML frontmatter:
```yaml
---
category: treatments
tags: [treatment, protocol]
priority: high
---
```
3. Run: `node scripts/embed_knowledge_base.js`

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [EVOLUTION_SETUP.md](docs/EVOLUTION_SETUP.md) | Complete setup guide |
| [ROADMAP.md](docs/ROADMAP.md) | Future improvements |
| [templates/README.md](templates/README.md) | Google Sheets setup |

## License

Private - All rights reserved
