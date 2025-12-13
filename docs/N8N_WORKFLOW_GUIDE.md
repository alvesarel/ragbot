# n8n Workflow Implementation Guide

## Overview

This project includes two versions of the conversation orchestrator:

1. **v1 (HTTP-based)**: `conversation-orchestrator.json` - Uses raw HTTP requests to Claude API
2. **v2 (AI Agent-based)**: `conversation-orchestrator-v2.json` - Uses n8n's native AI Agent node

**Recommendation**: Use **v2** for production. It's cleaner, has better error handling, and uses n8n's built-in AI capabilities.

---

## Workflow Files

| File | Purpose |
|------|---------|
| `whatsapp-webhook-handler.json` | Entry point - receives WhatsApp messages |
| `conversation-orchestrator.json` | v1 - HTTP-based Claude integration |
| `conversation-orchestrator-v2.json` | v2 - Native AI Agent (Recommended) |
| `human-handoff.json` | Telegram/Email notifications for escalation |
| `calendar-booking.json` | Google Calendar integration |

---

## n8n Native Nodes Used

### AI Agent Node (`@n8n/n8n-nodes-langchain.agent`)

The core of v2. Benefits:
- Built-in conversation memory
- Native tool calling
- Automatic context management
- Better error handling

### Anthropic Chat Model (`@n8n/n8n-nodes-langchain.lmChatAnthropic`)

Connects directly to Claude without HTTP boilerplate.

```
Settings:
- Model: claude-sonnet-4-20250514
- Max Tokens: 1024
- Temperature: 0.7 (balanced creativity)
```

### Window Buffer Memory (`@n8n/n8n-nodes-langchain.memoryBufferWindow`)

Maintains conversation context automatically.

```
Settings:
- Context Window: 20 messages
```

### Tool: Workflow (`@n8n/n8n-nodes-langchain.toolWorkflow`)

Allows AI to call other workflows as tools:
- `check_calendar_availability` → Calendar Booking workflow
- `escalate_to_human` → Human Handoff workflow

### Qdrant Vector Store (`@n8n/n8n-nodes-langchain.vectorStoreQdrant`)

Native RAG integration:
- Connects to Qdrant collection
- Uses OpenAI embeddings
- Returns top 5 relevant chunks

---

## Credential Setup in n8n

### 1. Anthropic API
```
Name: Anthropic
Type: Anthropic API
API Key: sk-ant-xxxxx
```

### 2. OpenAI API
```
Name: OpenAI
Type: OpenAI API
API Key: sk-xxxxx
```

### 3. Supabase
```
Name: Supabase
Type: Supabase API
Host: https://xxxxx.supabase.co
Service Role Key: eyJxxxxx
```

### 4. Qdrant
```
Name: Qdrant
Type: Qdrant API
URL: http://localhost:6333 (or cloud URL)
API Key: (if using cloud)
```

### 5. WhatsApp Token (HTTP Header Auth)
```
Name: WhatsApp Token
Type: Header Auth
Header Name: Authorization
Header Value: Bearer YOUR_ACCESS_TOKEN
```

### 6. Google Calendar
```
Name: Google Calendar
Type: Google Calendar OAuth2
```

### 7. SMTP (for email handoff)
```
Name: SMTP
Type: SMTP
Host: smtp.gmail.com
Port: 587
User: your_email@gmail.com
Password: app_password
```

---

## Environment Variables

Set these in n8n Settings > Variables:

```
WHATSAPP_PHONE_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=your_secret_token
WHATSAPP_APP_SECRET=abcd1234

QDRANT_COLLECTION_NAME=clinic_knowledge_base

TELEGRAM_BOT_TOKEN=123456789:ABCxxx
TELEGRAM_CHAT_ID=-1001234567890

HANDOFF_EMAIL=atendimento@clinica.com.br
SMTP_FROM=Bot <noreply@clinica.com.br>

BUSINESS_HOURS_START=8
BUSINESS_HOURS_END=18

GOOGLE_CALENDAR_ID=primary

SOFIA_SYSTEM_PROMPT=(paste the full system prompt here)

ORCHESTRATOR_WORKFLOW_ID=(ID of orchestrator workflow)
BOOKING_WORKFLOW_ID=(ID of booking workflow)
HANDOFF_WORKFLOW_ID=(ID of handoff workflow)
```

---

## Importing Workflows

### Method 1: Copy/Paste JSON
1. Open n8n
2. Create new workflow
3. Click three dots menu → "Import from JSON"
4. Paste JSON content

### Method 2: File Import
1. Open n8n
2. Create new workflow
3. Click three dots menu → "Import from File"
4. Select the .json file

### After Import:
1. Update all credential references
2. Set environment variables
3. Update workflow IDs in environment variables
4. Activate workflows

---

## Workflow Execution Flow

```
1. User sends WhatsApp message
   ↓
2. WhatsApp Webhook Handler
   - Validates webhook signature
   - Extracts message content
   - Transcribes audio (if voice note)
   ↓
3. Conversation Orchestrator (v2)
   - Loads conversation state from Supabase
   - Prepares context for AI
   - AI Agent processes with:
     • Claude for reasoning
     • Qdrant for knowledge retrieval
     • Tools for actions (calendar, handoff)
   - Parses response
   - Updates state in Supabase
   ↓
4. Send WhatsApp response to user
```

---

## AI Agent Tool Configuration

### Tool: Knowledge Base
```json
{
  "name": "search_knowledge_base",
  "description": "Busca informacoes na base de conhecimento da clinica. Use para responder perguntas sobre: servicos, tratamentos, metodologia, precos da consulta, diferenciais, FAQ."
}
```

### Tool: Calendar
```json
{
  "name": "check_calendar_availability",
  "description": "Verifica horarios disponiveis no calendario para agendamento de consulta. Use quando o paciente quiser agendar."
}
```

### Tool: Human Handoff
```json
{
  "name": "escalate_to_human",
  "description": "Escala a conversa para um humano. Use em casos de: perguntas medicas complexas, gravidez, condicoes serias, negociacoes, ou quando o paciente solicita."
}
```

---

## Debugging Tips

### Check Execution Logs
1. Go to Executions tab
2. Click on execution to see step-by-step data

### Common Issues

**Webhook not receiving messages:**
- Check webhook URL is publicly accessible
- Verify webhook signature validation
- Check WhatsApp API configuration in Meta

**AI Agent errors:**
- Verify Anthropic credentials
- Check API key has sufficient quota
- Review system prompt length (may need truncation)

**RAG not returning results:**
- Verify Qdrant collection exists
- Check embeddings were generated
- Test with direct Qdrant API query

**Calendar booking fails:**
- Verify Google Calendar OAuth is authorized
- Check calendar ID is correct
- Ensure service account has calendar access

---

## Performance Optimization

### Rate Limiting
- WhatsApp: Max 1000 messages/day on starter tier
- Claude API: Check your tier limits
- Implement queue for high volume

### Caching
- Consider caching frequent knowledge base queries
- Use n8n's static data for semi-static content

### Error Handling
- Set up error workflow for monitoring
- Use Slack/Telegram for error alerts
- Implement retry logic for transient failures

---

## Security Checklist

- [ ] WhatsApp webhook signature validation enabled
- [ ] API keys stored in n8n credentials (not in workflow)
- [ ] Supabase RLS policies configured
- [ ] CPF encryption enabled in database
- [ ] Rate limiting implemented
- [ ] Error workflow configured
- [ ] Audit logging enabled

---

## Useful n8n Resources

- [AI Agent Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/)
- [RAG in n8n](https://docs.n8n.io/advanced-ai/rag-in-n8n/)
- [WhatsApp Business Cloud Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/)
- [Error Handling Best Practices](https://docs.n8n.io/flow-logic/error-handling/)
