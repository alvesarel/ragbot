# Session Summary - December 13, 2025

## Project: WhatsApp RAG Chatbot for Premium Weight Loss Clinic

**Repository:** https://github.com/alvesarel/ragbot

---

## What Was Built

A complete AI-powered WhatsApp assistant for lead qualification and appointment scheduling at a premium Brazilian medical weight loss clinic.

### Architecture
```
Meta Ads --> WhatsApp --> n8n Orchestrator --> Claude AI
                              |
              +---------------+---------------+
              |               |               |
           Qdrant         Supabase      Google Calendar
        (Knowledge)     (Lead Data)    (Scheduling)
              |
              v
          Telegram
       (Notifications)
```

### Technology Stack
| Component | Technology |
|-----------|------------|
| Automation | n8n (self-hosted on Railway) |
| LLM | Claude (Anthropic) |
| Vector DB | Qdrant |
| Database | Supabase |
| Scheduling | Google Calendar |
| Channel | WhatsApp Business Cloud API |
| Notifications | Telegram |

---

## Files Created

### Workflows (`/workflows/`)
| File | Purpose |
|------|---------|
| `whatsapp-webhook-handler.json` | Receives WhatsApp messages, validates signature, routes by type |
| `conversation-orchestrator-v2.json` | Main AI agent with RAG, calendar, and handoff tools |
| `calendar-booking.json` | Checks Google Calendar availability |
| `booking-confirmation.json` | Creates event, updates lead, sends Telegram notification |
| `human-handoff.json` | Escalates to Telegram/Email with context |
| `knowledge-base-sync.json` | Syncs Google Drive docs to Qdrant |
| `daily-report.json` | Daily 8 PM performance summary to Telegram |
| `biweekly-analysis.json` | 1st & 15th comprehensive analysis with recommendations |

### Database (`/database/`)
- `schema.sql` - Complete Supabase schema with:
  - Tables: `conversation_states`, `leads`, `message_log`, `handoff_queue`, `scheduled_reminders`, `analytics_reports`
  - Views: `conversion_funnel`, `stage_dropoff`, `response_metrics`, `source_performance`, `weekly_trends`, `lead_source_roi`, `peak_hours`
  - CPF encryption functions (LGPD compliance)

### Knowledge Base Content (`/google-docs-content/`)
Ready-to-copy content for Google Docs:
- `institutional_both_about-clinic.txt` - Bilingual about us
- `institutional_pt_consulta-inicial.txt` - Consultation details (R$700)
- `treatments_pt_metodologia.txt` - Treatment methodology
- `treatments_pt_medicamentos.txt` - GLP-1 medications info
- `faq_pt_perguntas-frequentes.txt` - Portuguese FAQ
- `faq_en_general-questions.txt` - English FAQ
- `objections_pt_preco.txt` - Price objection handling
- `objections_pt_duvidas-tratamento.txt` - Treatment doubt handling
- `compliance_pt_avisos-legais.txt` - Legal disclaimers, LGPD, handoff rules

### Documentation (`/docs/`)
- `WHATSAPP_SETUP_GUIDE.md` - Meta Business Suite setup
- `QDRANT_SETUP_GUIDE.md` - Vector DB deployment
- `RAILWAY_DEPLOYMENT.md` - n8n + Qdrant on Railway (~$8-15/month)
- `N8N_WORKFLOW_GUIDE.md` - Credentials and workflow import
- `KNOWLEDGE_BASE_SETUP.md` - Google Drive to Qdrant flow

### Other
- `prompts/system-prompt.md` - Complete Sofia personality and rules
- `.env.example` - All required environment variables
- `README.md` - Project overview
- `docker-compose.yml` - Local development setup
- `railway.json` - Railway deployment config

---

## Key Business Rules

### Pricing
- **Consultation (R$700):** CAN reveal, but generate value first
  - Explain what's included: complete evaluation, personalized protocol
  - Mention free 30-day return visit
- **Treatment (R$3000+):** NEVER reveal
  - Redirect: "O valor varia conforme o protocolo recomendado"

### Lead Data Collection
1. Name
2. Phone (from WhatsApp)
3. Referral source ("Como nos conheceu?")
4. Email
5. CEP (postal code)
6. Date of birth (validate >= 16)
7. CPF (for scheduling)

### Handoff Triggers
- Pregnancy/breastfeeding
- Serious medical conditions
- Psychiatric medications
- Under 16 years old
- User distress or requests human
- Complex negotiations (partnerships, B2B)
- Negative sentiment 3+ messages

---

## Telegram Notifications

### On Every Successful Booking
```
🎉 NOVO AGENDAMENTO!

👤 Paciente: [Name]
📞 Telefone: [Phone]
📧 Email: [Email]

📅 Data: [Date]
⏰ Horario: [Time]

📱 Origem: Meta Ads  (or 🤝 Indicacao)
```

### Daily Report (8 PM)
- New conversations, scheduled, conversion rate
- Lead sources breakdown
- Today's bookings list
- Handoffs summary
- Message metrics

### Bi-Weekly Analysis (1st & 15th at 10 AM)
- Full conversion funnel
- Drop-off point identification
- Source performance comparison
- Best scheduling times
- AI-generated recommendations

---

## Next Steps to Go Live

### Phase 1: Infrastructure Setup
- [ ] Create Supabase project and run `database/schema.sql`
- [ ] Deploy n8n on Railway (see `docs/RAILWAY_DEPLOYMENT.md`)
- [ ] Deploy Qdrant on Railway (same project)
- [ ] Set up Telegram bot for notifications

### Phase 2: WhatsApp Setup
- [ ] Create Meta Business Account
- [ ] Set up WhatsApp Business API (see `docs/WHATSAPP_SETUP_GUIDE.md`)
- [ ] Get permanent access token
- [ ] Configure webhook URL

### Phase 3: Knowledge Base
- [ ] Create Google Drive folder "Clinic Knowledge Base"
- [ ] Copy content from `/google-docs-content/` to Google Docs
- [ ] Update placeholders (clinic name, address, doctor names)
- [ ] Run sync workflow

### Phase 4: Testing
- [ ] Import all workflows to n8n
- [ ] Configure credentials (see `docs/N8N_WORKFLOW_GUIDE.md`)
- [ ] Test conversation flow end-to-end
- [ ] Test booking and Telegram notifications

### Phase 5: Go Live
- [ ] Connect Meta Ads to WhatsApp
- [ ] Monitor daily reports
- [ ] Iterate based on bi-weekly analysis

---

## Environment Variables Needed

```env
# WhatsApp Business API
WHATSAPP_PHONE_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# OpenAI (embeddings + Whisper)
OPENAI_API_KEY=

# Google Calendar
GOOGLE_CALENDAR_CREDENTIALS=
GOOGLE_CALENDAR_ID=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Qdrant
QDRANT_URL=
QDRANT_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Google Drive (for KB sync)
GOOGLE_DRIVE_FOLDER_ID=
```

---

## GitHub CLI Installed

GitHub CLI was installed during this session:
- Location: `C:/Program Files/GitHub CLI/gh.exe`
- Authenticated as: `alvesarel`

---

## Questions/Decisions Made

1. **Hosting:** Railway for n8n + Qdrant (consolidated, ~$8-15/month)
2. **Knowledge Base Storage:** Google Drive with auto-sync to Qdrant
3. **Handoff Channel:** Telegram (not Slack)
4. **LLM:** Claude via Anthropic API
5. **Languages:** Portuguese + English (bilingual)

---

*Last updated: December 13, 2025*
