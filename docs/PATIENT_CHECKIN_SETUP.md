# Diana - Patient Check-in AI Agent Setup Guide

Complete setup guide for Diana, the Tirzepatide Weekly Patient Check-in Agent.

> **Other Agents:**
> - Sofia (Lead Qualification): [SETUP.md](SETUP.md)
> - Yara (Executive Assistant): [YARA_SETUP.md](YARA_SETUP.md)

## Overview

Diana automates weekly check-ins with patients on Tirzepatide (Mounjaro) treatment plans:
- Sends personalized check-in messages via WhatsApp (Saturdays 11 AM)
- Handles patient responses with AI-powered conversations
- Tracks treatment progress in Google Sheets
- Alerts medical team when follow-up is needed
- Sends renewal reminders at 2 weeks and 1 week remaining

**Treatment Plans:** 4, 12, or 16 weeks

## Prerequisites

- n8n instance (self-hosted or cloud)
- Google Account with Sheets access
- Meta Business Account with WhatsApp API access
- Anthropic API key (Claude Haiku 4.5)
- OpenAI API key (for embeddings)
- Qdrant instance (shared with Sofia/Yara)
- Telegram Bot (for team notifications)

## Step 1: Google Sheets Setup

### Create the Spreadsheet

1. Create a new Google Spreadsheet
2. Name it "Patient Check-in Tracker" (or your preference)
3. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### Sheet 1: Patients

Create a sheet named exactly `Patients` with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| NAME | Patient full name | Maria Silva |
| PHONE | Phone with country code | 5511999998888 |
| STARTING_DATE | Treatment start | 2024-01-15 |
| TOTAL_WEEKS_CONTRACTED | Plan duration | 12 |
| REMAINING_WEEKS | Weeks left | 8 |
| CURRENT_DOSE | Current dosage | 5mg |
| PAYMENT_METHOD | Payment method | Credit Card |
| LAST_PAYMENT | Last payment date | 2024-01-10 |
| NOTES | Additional notes | Started on lower dose |
| STATUS | Treatment status | active |

**Copy this header row:**
```
NAME	PHONE	STARTING_DATE	TOTAL_WEEKS_CONTRACTED	REMAINING_WEEKS	CURRENT_DOSE	PAYMENT_METHOD	LAST_PAYMENT	NOTES	STATUS
```

### Sheet 2: CheckInLog

Create a sheet named exactly `CheckInLog` with these columns:

| Column | Description |
|--------|-------------|
| DATE | Check-in timestamp |
| PATIENT_NAME | Patient name |
| PHONE | Phone number |
| WEEK_NUMBER | Week # in treatment |
| DOSE_AT_CHECKIN | Dose at check-in |
| REMAINING_WEEKS | Weeks remaining |
| MESSAGE_SENT | Message sent |
| STATUS | sent / response_received |
| RESPONSE | Patient response |
| SIDE_EFFECTS_REPORTED | Side effects mentioned |
| FOLLOW_UP_NEEDED | YES / NO |

**Copy this header row:**
```
DATE	PATIENT_NAME	PHONE	WEEK_NUMBER	DOSE_AT_CHECKIN	REMAINING_WEEKS	MESSAGE_SENT	STATUS	RESPONSE	SIDE_EFFECTS_REPORTED	FOLLOW_UP_NEEDED
```

### Sample Patient Data

Add test patients to get started:

| NAME | PHONE | STARTING_DATE | TOTAL_WEEKS_CONTRACTED | REMAINING_WEEKS | CURRENT_DOSE | PAYMENT_METHOD | LAST_PAYMENT | NOTES | STATUS |
|------|-------|---------------|------------------------|-----------------|--------------|----------------|--------------|-------|--------|
| Maria Silva | 5511999998888 | 2024-01-15 | 12 | 8 | 5mg | Credit Card | 2024-01-10 | Tolerating well | active |
| Joao Santos | 5521988887777 | 2024-01-08 | 16 | 12 | 2.5mg | PIX | 2024-01-05 | Initial phase | active |

## Step 2: Google Sheets OAuth in n8n

### Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URI:
   ```
   https://your-n8n-instance.com/rest/oauth2-credential/callback
   ```
7. Note down **Client ID** and **Client Secret**

### Configure in n8n

1. Go to **Credentials** in n8n
2. Create new **Google Sheets OAuth2 API** credential
3. Enter Client ID and Client Secret
4. Click **Connect** and authorize
5. Name it `google-sheets-creds`

## Step 3: Qdrant (Shared Knowledge Base)

Diana shares the same Qdrant knowledge base as Sofia and Yara.

If not already set up, run the embedding script:

```bash
export OPENAI_API_KEY=sk-xxxxx
export QDRANT_URL=https://your-cluster.qdrant.io
export QDRANT_API_KEY=your_key
export QDRANT_COLLECTION_NAME=clinic_knowledge_base

node scripts/embed_knowledge_base.js
```

The `knowledge-base/treatments/tirzepatide_checkin.md` file contains treatment-specific information Diana uses.

## Step 4: Environment Variables

Add these to your n8n instance:

```env
# Google Sheets
PATIENT_SHEET_ID=your_spreadsheet_id_here

# WhatsApp (from Meta Developer Console)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Telegram (for team notifications)
TELEGRAM_CHAT_ID=-100123456789
```

### Setting in n8n

**n8n Cloud:** Settings → Variables

**Self-hosted:** Add to `.env` or docker-compose environment

## Step 5: n8n Credentials

Create these credentials in n8n:

| Credential Type | Name | Notes |
|-----------------|------|-------|
| **Google Sheets OAuth2** | `google-sheets-creds` | OAuth as configured above |
| **WhatsApp Business** | `whatsapp-creds` | Phone Number ID + Access Token |
| **WhatsApp Trigger OAuth** | `whatsapp-trigger-creds` | For webhook trigger |
| **Anthropic API** | `anthropic-creds` | API Key |
| **OpenAI API** | `openai-creds` | API Key (for embeddings) |
| **Qdrant API** | `qdrant-creds` | URL + API Key |
| **Telegram API** | `telegram-creds` | Bot Token |

## Step 6: Import the Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `workflows/diana-patient-checkin.json`
4. Click **Save**
5. Update credential references if needed

## Step 7: Configure Schedule

The workflow triggers every **Saturday at 11 AM** (America/Sao_Paulo timezone).

To change:
1. Open the workflow
2. Click **Weekly Check-in Schedule** node
3. Modify:
   - Day of week
   - Time
   - Timezone

## Step 8: WhatsApp Webhook Setup

The workflow has two entry points:

### 1. Scheduled Outbound
Triggers automatically on schedule - no setup needed.

### 2. Inbound Responses
For patient replies:

1. Activate the workflow
2. Copy webhook URL from **WhatsApp Response Trigger** node
3. In Meta Developer Console:
   - WhatsApp → Configuration → Webhooks
   - Callback URL: `https://your-n8n.com/webhook/patient-checkin-webhook`
   - Verify Token: Your token
   - Subscribe to: `messages`

## Step 9: Test the Workflow

### Test Outbound Check-ins

1. Add a test patient with your phone number
2. Manually execute the **Weekly Check-in Schedule** node
3. Verify you receive the WhatsApp message
4. Check CheckInLog sheet for the entry

### Test Inbound Responses

1. Reply to the check-in message
2. Verify Diana responds
3. Check CheckInLog for response entry
4. Mention side effects to test Telegram notification

## Workflow Flow

### Outbound Flow (Scheduled)
```
Saturday 11 AM
      ↓
Get Active Patients (REMAINING_WEEKS > 0)
      ↓
For Each Patient:
      ↓
Generate Message (Claude Haiku 4.5 + RAG)
      ↓
Send WhatsApp Message
      ↓
Log to CheckInLog
      ↓
Deduct 1 from REMAINING_WEEKS
      ↓
Check Status:
├─→ 2 weeks remaining: Notify team (renewal outreach)
├─→ 1 week remaining: Mark complete + Notify team
└─→ Ongoing: Done
```

### Inbound Flow (Patient Responses)
```
WhatsApp Message
      ↓
Check Message Type
├─→ Text: Continue
└─→ Other: "Text only please"
      ↓
Lookup Patient
├─→ Found: Continue
└─→ Not Found: "Unknown number"
      ↓
AI Response (Claude Haiku 4.5 + RAG)
      ↓
Send Response
      ↓
Analyze for Side Effects
      ↓
Log to CheckInLog
      ↓
├─→ Follow-up needed: Notify team (Telegram)
└─→ No follow-up: Done
```

## Renewal Flow

| Remaining Weeks | Diana's Action | Team Notification |
|-----------------|----------------|-------------------|
| 2 weeks | Reminder + asks about renewal | Telegram alert for outreach |
| 1 week (last) | Final check-in + asks about experience | Mark complete + full handoff |

## Diana's Personality

- Warm, professional, empathetic
- Portuguese (Brazilian) default - switches to English if patient uses it
- **NO emojis** - clean, professional messages
- Never provides medical advice
- Always encourages contacting doctor for concerns

## Side Effects Detection

Diana automatically detects mentions of:
- Nausea / enjoo
- Vomiting / vomito
- Pain / dor
- Fatigue / cansaço
- Dizziness / tontura
- GI issues / diarreia / constipação
- Injection site reactions

When detected → Telegram notification to team with `FOLLOW_UP_NEEDED: YES`

## Troubleshooting

### Workflow not triggering on schedule
- Check n8n timezone settings match your expectation
- Verify workflow is **Active**
- Check n8n execution logs

### WhatsApp messages not sending
- Verify WhatsApp credentials
- Check phone format (must include country code: 5511999998888)
- Verify WhatsApp Business API is active
- Check n8n logs for API errors

### Google Sheets errors
- Sheet names must be exactly `Patients` and `CheckInLog`
- Check OAuth credentials are connected
- Verify PATIENT_SHEET_ID is correct
- Check sheet sharing permissions

### AI responses not working
- Verify Anthropic API key is valid
- Check model ID: `claude-haiku-4-5-20251001`
- Review n8n execution logs

### RAG not returning relevant info
- Verify Qdrant connection
- Check if knowledge base was indexed
- Ensure `clinic_knowledge_base` collection exists

### Telegram notifications not arriving
- Verify bot token is correct
- Check chat ID (negative for groups)
- Verify bot is added to the group

## Customization

### Change Check-in Schedule
Edit **Weekly Check-in Schedule** node parameters.

### Modify AI Personality
Edit `systemMessage` in AI Agent nodes, or update `prompts/diana-prompt.md`.

### Add Side Effect Keywords
Edit **Analyze Response** code node.

### Change Escalation Rules
Modify **Needs Follow-up?** node conditions.

### Localization
Update system prompts and reply messages for different languages.

## Security Considerations

- Patient data in Google Sheets - ensure proper access controls
- WhatsApp messages are end-to-end encrypted
- API keys stored securely in n8n credentials
- Consider LGPD/HIPAA compliance for your region
- Regularly audit spreadsheet access
