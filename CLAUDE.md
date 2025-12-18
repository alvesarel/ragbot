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
Patients (WhatsApp) ← Diana ← Google Sheets (Patients + CheckInLog)
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

## Key Files

### Agent Prompts (markdown with structured personality/rules)
- `prompts/system-prompt.md` - Sofia (Portuguese, warm, lead qualification)
- `prompts/diana-prompt.md` - Diana (Portuguese default, no emojis, patient check-ins)
- `prompts/yara-prompt.md` - Yara (Portuguese, executive/analytical tone)

### n8n Workflows
- `sofia-alternative-flow.json` - Sofia lead qualification agent
- `diana-patient-checkin.json` - Diana weekly check-in agent
- `yara-executive-assistant.json` - Yara management assistant (consolidated, no sub-workflows)

### Knowledge Base Structure
Files in `knowledge-base/` use YAML frontmatter for metadata:
```yaml
---
category: treatments
language: pt
tags: [treatment, protocol]
priority: high
---
```
Categories: `institutional`, `treatments`, `faq`, `objection_handling`, `compliance`

### Database Schema
`database/schema.sql` defines Supabase tables:
- `conversations` - Sofia lead tracking (stages: greeting → discovery → qualification → value_building → scheduling → confirmation)
- `messages` - All message logs with RAG analytics
- Views: `daily_metrics`, `conversion_funnel`, `stage_distribution`, `recent_conversations`

## Agent-Specific Patterns

### Sofia Response Format
Sofia's LLM output must be JSON with structured data extraction:
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

### Diana Check-in Flow
- Scheduled: Saturdays 11 AM (America/Sao_Paulo)
- Deducts `REMAINING_WEEKS` each check-in
- Renewal alerts at 2 weeks and 1 week remaining
- Side effects tracked and escalated via Telegram

### Yara Architecture (Consolidated)
Yara pre-fetches data on each message instead of using sub-workflows:
- Patient data and check-in logs fetched in parallel from Google Sheets
- Pre-calculated analytics injected into AI context (summaries, renewals, follow-ups)
- Only RAG tool (`query_knowledge_base`) remains for clinic information queries

## Business Rules

**Pricing (Sofia only)**:
- Consultation (R$700): Can mention after building value
- Treatment (R$3,000+): NEVER mention specific value

**Handoff Triggers**:
- Pregnancy/breastfeeding, serious medical conditions
- User frustration or explicit human request
- Severe side effects (Diana): persistent vomiting, allergic reactions, hypoglycemia

**Language**: Brazilian Portuguese default. Diana switches to English if patient uses it.

## Dashboard

Static HTML/CSS/JS in `dashboard/` connecting to Supabase. No build step required - deploy directly or open `index.html` locally. Configure Supabase credentials in Settings view.
