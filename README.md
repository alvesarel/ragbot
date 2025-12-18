# Sofia AI Agent - WhatsApp Assistant

AI-powered WhatsApp assistant for a premium weight loss clinic, built with n8n AI Agent, Claude Haiku 4.5, and RAG.

## Architecture

```
WhatsApp Business API → n8n Webhook → Sofia AI Agent
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
           Claude Haiku 4.5         Window Buffer           Vector Store Tool
              (Brain)                 Memory                   (RAG)
                    │                       │                       │
                    │                       │                       ▼
                    │                       │               Qdrant + OpenAI
                    │                       │                Embeddings
                    └───────────────────────┼───────────────────────┘
                                            │
                                            ▼
                                    WhatsApp Reply
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
              Supabase               Telegram               Handoff
            (Message Log)          (Notifications)          (if needed)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Automation | n8n AI Agent Node |
| LLM | Claude Haiku 4.5 (Anthropic) |
| Memory | Window Buffer Memory (50 messages) |
| Vector DB | Qdrant |
| Embeddings | OpenAI text-embedding-3-small |
| Database | Supabase |
| WhatsApp | Official Business Cloud API |
| Notifications | Telegram |

## Project Structure

```
ragbot/
├── workflows/
│   ├── sofia-alternative-flow.json  # Main AI Agent workflow
│   └── knowledge-base-setup.json    # RAG ingestion workflow
├── knowledge-base/               # RAG documents
│   ├── institutional/
│   │   └── about_clinic.md
│   ├── treatments/
│   │   └── methodology.md
│   ├── faq/
│   │   └── general_questions.md
│   ├── objection_handling/
│   │   └── price_objections.md
│   └── compliance/
│       └── medical_disclaimers.md
├── prompts/
│   └── system-prompt.md          # Reference system prompt
├── database/
│   └── schema.sql                # Supabase schema
└── docs/
    └── SETUP.md                  # Setup instructions
```

## Quick Start

### 1. Prerequisites

- n8n instance (self-hosted or cloud)
- Qdrant vector database
- Supabase account
- WhatsApp Business API access
- OpenAI API key (for embeddings)
- Anthropic API key (for Claude Haiku 4.5)
- Telegram bot (for handoff notifications)

### 2. Configure Credentials in n8n

Create these credentials:
- **Anthropic** - API key for Claude Haiku 4.5
- **OpenAI** - API key for embeddings
- **Qdrant** - URL and API key
- **Supabase** - URL and service key
- **WhatsApp Business** - Access token
- **Telegram** - Bot token

### 3. Import Workflows

1. Import `workflows/knowledge-base-setup.json` first
2. Import `workflows/sofia-alternative-flow.json`
3. Configure all credential connections

### 4. Setup RAG Knowledge Base

1. Edit/add markdown files in `knowledge-base/` folder
2. Run the **Sofia Knowledge Base - RAG Setup** workflow manually
3. This embeds all documents into Qdrant

### 5. Configure WhatsApp Webhook

1. Create WhatsApp Business App in Meta Developer Console
2. Configure webhook URL: `https://your-n8n.com/webhook/whatsapp-webhook`
3. Subscribe to `messages` webhook field
4. Activate the Sofia AI Agent workflow

## Workflow Components

### Sofia AI Agent Workflow

| Node | Purpose |
|------|---------|
| WhatsApp Webhook | Receives incoming messages |
| Is Verification? | Handles webhook verification |
| Has Message? | Filters actual messages |
| Extract Message | Parses WhatsApp payload |
| Sofia AI Agent | Main AI Agent node |
| Claude Haiku 4.5 | LLM brain |
| Window Buffer Memory | Conversation memory (50 messages) |
| Knowledge Base RAG | Vector store tool for retrieval |
| Qdrant Vector Store | Vector database connection |
| OpenAI Embeddings | Query embeddings |
| Prepare Response | Process AI output |
| Send WhatsApp Message | Reply to user |
| Needs Handoff? | Check for escalation |
| Notify Team | Telegram alert if handoff |
| Log to Database | Store in Supabase |

### Knowledge Base Setup Workflow

| Node | Purpose |
|------|---------|
| Manual Trigger | Start manually |
| List Knowledge Base Files | Define files to process |
| Read Markdown File | Load each document |
| Parse & Chunk Document | Split into sections |
| Insert into Qdrant | Embed and store vectors |
| OpenAI Embeddings | Generate embeddings |
| Recursive Text Splitter | Additional chunking |
| Default Data Loader | Document preparation |

## Environment Variables

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_key
QDRANT_COLLECTION=sofia_knowledge

# Notifications
TELEGRAM_BOT_TOKEN=123:ABC
TELEGRAM_CHAT_ID=-100123

# Human Support Handoff (WhatsApp)
HUMAN_SUPPORT_PHONE=5511999998888
```

## Sofia AI Agent Features

### Memory
- **Window Buffer Memory**: Maintains last 50 messages per conversation
- **Session-based**: Each phone number has its own memory session
- **Automatic context**: Agent sees full conversation history

### RAG (Retrieval-Augmented Generation)
- **Vector Store Tool**: Agent can search knowledge base on demand
- **Semantic search**: Uses OpenAI embeddings for similarity
- **4 results per query**: Returns top 4 relevant chunks
- **Categories**: Institutional, treatments, FAQ, objections, compliance

### Handoff Detection
- Automatic detection when lead agrees to schedule
- Triggers WhatsApp notification to human support team
- Sofia uses `[AGENDAR_CONSULTA]` tag when lead is ready
- Full lead data (name, CPF, DOB, email, address) included in notification

## Conversation Flow

1. **Greeting** - Welcome, LGPD consent
2. **Discovery** - Understand user goals
3. **Qualification** - Collect contact data naturally
4. **Value Building** - Explain methodology, handle objections
5. **Scheduling** - Book appointment
6. **Confirmation** - Send details

## Sofia Personality

- Warm, caring, professional
- Portuguese (Brazilian) primary language
- Maximum 1-2 emojis per message
- Natural conversational data collection
- Never pushy, always empathetic

## Pricing Rules

| Item | Rule |
|------|------|
| Consultation (R$700) | Can mention after building value |
| Treatment (R$3,000+) | NEVER mention specific value |

## Handoff Triggers

- Pregnancy/breastfeeding
- Serious medical conditions
- User frustration (negative sentiment)
- Direct request for human
- Business negotiations

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
4. New content is immediately available to AI Agent

## License

Private - All rights reserved
