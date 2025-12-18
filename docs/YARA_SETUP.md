# Yara - Executive Assistant AI Agent Setup Guide

Yara is a Telegram-based AI assistant that provides centralized access to clinic data from Diana (patient check-ins) and Sofia (lead qualification), with analytical capabilities for pattern recognition and insights.

## Overview

### What Yara Does
- **Queries Patient Data**: Access treatment status, doses, remaining weeks from Diana's system
- **Analyzes Check-in Logs**: Review check-in history, side effects, follow-up needs
- **Provides Insights**: Identify patterns in side effects, treatment adherence, and renewal rates
- **Accesses Knowledge Base**: Answer questions about clinic treatments and protocols
- **Communicates via Telegram**: Chat interface for management team

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM                                  │
│              (Management Chat)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              YARA AI AGENT                                   │
│         (Claude Haiku 4.5 + Memory)                         │
└─────────┬─────────────┬─────────────┬───────────────────────┘
          │             │             │
          ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   QUERY     │ │   QUERY     │ │  KNOWLEDGE  │
│  PATIENTS   │ │  CHECK-INS  │ │    BASE     │
│   (Tool)    │ │   (Tool)    │ │   (RAG)     │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   GOOGLE    │ │   GOOGLE    │ │   QDRANT    │
│   SHEETS    │ │   SHEETS    │ │   VECTOR    │
│ (Patients)  │ │(CheckInLog) │ │   STORE     │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Prerequisites

Before setting up Yara, ensure you have:

1. **n8n Instance** running and accessible
2. **Diana Workflow** set up with Google Sheets (Patients & CheckInLog sheets)
3. **Knowledge Base** populated in Qdrant (`sofia_knowledge` collection)
4. **Credentials** configured:
   - Anthropic API (Claude)
   - OpenAI API (embeddings)
   - Qdrant API
   - Google Sheets OAuth
   - Telegram Bot API

## Step 1: Create Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. Send `/newbot` and follow the prompts:
   - Name: `Yara - Clinic Assistant` (or your preferred name)
   - Username: `YaraClinicBot` (must end in 'bot')
3. **Save the API token** provided by BotFather
4. **Configure privacy settings** (optional):
   ```
   /setprivacy - Choose your bot - Disable (to read all messages in groups)
   /setjoingroups - Choose your bot - Disable (if you want private only)
   ```

## Step 2: Get Your Telegram IDs

### Get Your User ID
1. Search for `@userinfobot` on Telegram
2. Send `/start` - it will reply with your user ID
3. Save this as `YARA_AUTHORIZED_USER_ID`

### Get Group/Channel Chat ID (if using)
1. Add your bot to the group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":-XXXXXXXXX}` - that negative number is your chat ID
5. Save this as `TELEGRAM_CHAT_ID`

## Step 3: Configure Environment Variables

Add these to your n8n environment or `.env` file:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=-123456789  # Group chat ID (negative number)
YARA_AUTHORIZED_USER_ID=123456789  # Your personal Telegram user ID

# Sub-workflow IDs (get these after importing workflows)
YARA_FETCH_PATIENTS_WORKFLOW_ID=workflow_id_here
YARA_FETCH_CHECKINS_WORKFLOW_ID=workflow_id_here

# Existing variables (should already be set from Diana/Sofia)
PATIENT_SHEET_ID=your_google_sheet_id
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
```

## Step 4: Import Workflows into n8n

### Import Order (Important!)

1. **First**: Import sub-workflows
   - `yara-fetch-patients.json`
   - `yara-fetch-checkin-logs.json`

2. **Note the workflow IDs** after import (visible in URL when editing each workflow)

3. **Update environment variables** with the workflow IDs

4. **Then**: Import main workflow
   - `yara-executive-assistant.json`

### Import Process

1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select the JSON file
4. Click **Save**
5. Note the workflow ID from the URL

## Step 5: Configure Credentials

### Telegram Bot Credentials
1. Go to **Settings** → **Credentials**
2. Click **Add Credential** → **Telegram API**
3. Name: `Telegram Bot`
4. Access Token: Your bot token from BotFather
5. Save

### Google Sheets OAuth (if not already configured)
1. Go to **Settings** → **Credentials**
2. Click **Add Credential** → **Google Sheets OAuth2 API**
3. Follow OAuth flow to authorize

### Verify Other Credentials
Ensure these are configured (from Diana/Sofia setup):
- Anthropic API
- OpenAI API
- Qdrant API

## Step 6: Activate Workflows

1. **Activate sub-workflows first**:
   - Open `Yara - Fetch Patients`
   - Toggle **Active** in top-right
   - Repeat for `Yara - Fetch Check-in Logs`

2. **Activate main workflow**:
   - Open `Yara - Executive Assistant AI Agent`
   - Toggle **Active** in top-right

## Step 7: Test the Bot

1. Open Telegram and find your bot
2. Send `/start` or `Ola`
3. Yara should respond with her introduction

### Test Commands

Try these queries:
- "Quantos pacientes estao em tratamento?"
- "Qual o status do paciente Maria?" (use a real patient name)
- "Quais pacientes reportaram efeitos colaterais?"
- "Liste os pacientes com follow-up pendente"
- "Quais tratamentos a clinica oferece?"
- "Gere uma analise dos efeitos colaterais"

## Configuration Options

### Authorization

By default, Yara only responds to:
- Messages in the specified `TELEGRAM_CHAT_ID`
- Messages from `YARA_AUTHORIZED_USER_ID`

To add more authorized users, modify the `Check Authorized User` node in the workflow.

### Memory Settings

The workflow uses a 20-message window buffer memory. To adjust:
1. Open the main workflow
2. Find `Window Buffer Memory` node
3. Change `contextWindowLength` parameter

### Response Style

To customize Yara's communication style, edit the system prompt in:
- The main workflow's `Yara AI Agent` node
- Or update `/prompts/yara-prompt.md` for reference

## Troubleshooting

### Bot Not Responding
1. Check workflow is **Active**
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Check n8n execution logs for errors
4. Ensure your user ID is authorized

### "Unauthorized" Response
1. Verify `TELEGRAM_CHAT_ID` or `YARA_AUTHORIZED_USER_ID` are correct
2. Check the values in n8n environment variables
3. Test by temporarily adding your user ID to the authorized list

### Sub-workflow Errors
1. Verify sub-workflow IDs are correct in environment variables
2. Ensure sub-workflows are **Active**
3. Check Google Sheets credentials are valid
4. Verify `PATIENT_SHEET_ID` points to correct spreadsheet

### No Patient Data
1. Verify Diana workflow is set up with patient data
2. Check Google Sheets has "Patients" and "CheckInLog" sheets
3. Verify column names match expected format

### RAG Not Working
1. Verify Qdrant connection is working
2. Ensure `sofia_knowledge` collection exists and is populated
3. Run the knowledge base setup workflow if needed

## Workflows Reference

| File | Purpose | Dependencies |
|------|---------|--------------|
| `yara-executive-assistant.json` | Main AI agent | All sub-workflows |
| `yara-fetch-patients.json` | Query patient data | Google Sheets |
| `yara-fetch-checkin-logs.json` | Query check-in logs | Google Sheets |

## Data Flow

```
User Message (Telegram)
    │
    ▼
Authorization Check
    │
    ├── Unauthorized → Reject
    │
    └── Authorized → Prepare Context
                         │
                         ▼
                   Yara AI Agent
                         │
                    ┌────┴────┐
                    │  Tools  │
                    ├─────────┤
                    │ query_patients → Sub-workflow → Google Sheets
                    │ query_checkin_logs → Sub-workflow → Google Sheets
                    │ query_knowledge_base → Qdrant Vector Store
                    └─────────┘
                         │
                         ▼
                  Send Response (Telegram)
```

## Security Considerations

- **Authorization**: Only configured users/groups can interact with Yara
- **Patient Data**: Ensure Telegram group is private and access-controlled
- **API Keys**: Store all API keys securely in n8n credentials
- **LGPD Compliance**: Patient data is processed according to clinic's LGPD policies

## Support

For issues or questions:
1. Check n8n execution logs for detailed error messages
2. Review workflow configuration
3. Test individual sub-workflows in isolation
4. Verify all credentials are valid and not expired
