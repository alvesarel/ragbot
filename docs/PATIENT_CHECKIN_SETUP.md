# Patient Check-in AI Agent Setup Guide

Complete setup guide for the Tirzepatide Weekly Patient Check-in Agent.

## Overview

This workflow automates weekly check-ins with patients on Tirzepatide (Mounjaro) treatment plans. It:
- Sends personalized weekly check-in messages via WhatsApp (Saturdays at 11 AM)
- Handles patient responses with AI-powered conversations (no emojis, professional tone)
- Tracks treatment progress in Google Sheets
- Alerts medical team when follow-up is needed
- Sends renewal reminders at 2 weeks and 1 week remaining
- Hands off to team with full patient information for renewal discussions

**Treatment Plans Available:** 4, 12, or 16 weeks

## Prerequisites

- n8n instance (self-hosted or cloud)
- Google Account with Sheets access
- Meta Business Account with WhatsApp API access
- Anthropic API key (Claude Haiku 4.5)
- OpenAI API key (for embeddings)
- Qdrant instance (for RAG knowledge base)
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

Create a sheet named `Patients` with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| NAME | Patient full name | Maria Silva |
| PHONE | Phone number (with country code) | 5511999998888 |
| STARTING_DATE | Treatment start date | 2024-01-15 |
| TOTAL_WEEKS_CONTRACTED | Total weeks in plan | 12 |
| REMAINING_WEEKS | Weeks remaining | 8 |
| CURRENT_DOSE | Current dosage | 5mg |
| PAYMENT_METHOD | Payment method | Credit Card |
| LAST_PAYMENT | Last payment date | 2024-01-10 |
| NOTES | Additional notes | Started on lower dose |
| STATUS | Treatment status | active |

**Column Headers (copy this row):**
```
NAME | PHONE | STARTING_DATE | TOTAL_WEEKS_CONTRACTED | REMAINING_WEEKS | CURRENT_DOSE | PAYMENT_METHOD | LAST_PAYMENT | NOTES | STATUS
```

### Sheet 2: CheckInLog

Create a sheet named `CheckInLog` with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| DATE | Check-in date/time | 2024-01-22 09:00:00 |
| PATIENT_NAME | Patient name | Maria Silva |
| PHONE | Phone number | 5511999998888 |
| WEEK_NUMBER | Week # in treatment | 4 |
| DOSE_AT_CHECKIN | Dose at time of check-in | 5mg |
| REMAINING_WEEKS | Weeks remaining | 8 |
| MESSAGE_SENT | Message sent to patient | [message text] |
| STATUS | Check-in status | sent / response_received |
| RESPONSE | Patient response | [response text] |
| SIDE_EFFECTS_REPORTED | Any side effects mentioned | nausea, fadiga |
| FOLLOW_UP_NEEDED | Flag for follow-up | YES / NO |

**Column Headers (copy this row):**
```
DATE | PATIENT_NAME | PHONE | WEEK_NUMBER | DOSE_AT_CHECKIN | REMAINING_WEEKS | MESSAGE_SENT | STATUS | RESPONSE | SIDE_EFFECTS_REPORTED | FOLLOW_UP_NEEDED
```

### Sample Patient Data

Add some test patients to the Patients sheet:

```
NAME              | PHONE         | STARTING_DATE | TOTAL_WEEKS_CONTRACTED | REMAINING_WEEKS | CURRENT_DOSE | PAYMENT_METHOD | LAST_PAYMENT | NOTES           | STATUS
Maria Silva       | 5511999998888 | 2024-01-15    | 12                     | 8               | 5mg          | Credit Card    | 2024-01-10   | Tolerating well | active
Joao Santos       | 5521988887777 | 2024-01-08    | 24                     | 20              | 2.5mg        | PIX            | 2024-01-05   | Initial phase   | active
Ana Costa         | 5531977776666 | 2023-12-01    | 12                     | 1               | 10mg         | Credit Card    | 2023-11-28   | Last week       | active
```

## Step 2: Google Sheets Credentials in n8n

### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - `https://your-n8n-instance.com/rest/oauth2-credential/callback`
7. Note down **Client ID** and **Client Secret**

### Configure in n8n

1. Go to **Credentials** in n8n
2. Create new **Google Sheets OAuth2 API** credential
3. Enter Client ID and Client Secret
4. Click **Connect** and authorize with your Google account
5. Name it `google-sheets-creds`

## Step 3: Environment Variables

Add these environment variables to your n8n instance:

```env
# Google Sheets
PATIENT_SHEET_ID=your_spreadsheet_id_here

# WhatsApp (from Meta Developer Console)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Telegram (for team notifications)
TELEGRAM_CHAT_ID=your_telegram_group_chat_id
```

### Setting Environment Variables in n8n

**For n8n Cloud:**
1. Go to Settings > Variables
2. Add each variable

**For self-hosted n8n:**
Add to your `.env` file or docker-compose environment section.

## Step 4: Import the Workflow

1. Open your n8n instance
2. Go to **Workflows** > **Import from File**
3. Select `workflows/patient-checkin-agent.json`
4. Update credential references in each node

### Credentials to Configure

| Node Type | Credential Name | How to Configure |
|-----------|-----------------|------------------|
| Google Sheets | `google-sheets-creds` | OAuth2 as above |
| WhatsApp | `whatsapp-creds` | WhatsApp Business API |
| WhatsApp Trigger | `whatsapp-trigger-creds` | WhatsApp OAuth |
| Claude | `anthropic-creds` | Anthropic API Key |
| OpenAI | `openai-creds` | OpenAI API Key |
| Qdrant | `qdrant-creds` | Qdrant API credentials |
| Telegram | `telegram-creds` | Telegram Bot Token |

## Step 5: Index Tirzepatide Knowledge

Make sure the knowledge base includes Tirzepatide information:

1. The file `knowledge-base/treatments/tirzepatide_checkin.md` contains detailed treatment info
2. Run the RAG setup workflow OR the embedding script:

```bash
node scripts/embed_knowledge_base.js
```

This indexes the Tirzepatide documentation for the AI agent to reference.

## Step 6: Configure Schedule

The workflow is set to trigger every **Saturday at 11 AM** by default.

To change the schedule:
1. Open the workflow in n8n
2. Click on **Weekly Check-in Schedule** node
3. Modify the schedule trigger settings:
   - Day of week (default: Saturday)
   - Time (default: 11:00)
   - Timezone

## Step 7: WhatsApp Webhook Setup

The workflow has two entry points:

### 1. Scheduled Outbound (Weekly Check-in Schedule)
This triggers automatically based on the schedule.

### 2. Inbound Responses (WhatsApp Response Trigger)
Configure the webhook for patient responses:

1. Activate the workflow
2. Copy the webhook URL from the **WhatsApp Response Trigger** node
3. In Meta Developer Console:
   - Go to WhatsApp > Configuration > Webhooks
   - Set Callback URL to your webhook URL
   - Set Verify Token
   - Subscribe to `messages`

## Step 8: Test the Workflow

### Test Outbound Check-ins

1. Add a test patient to the Patients sheet with your phone number
2. Manually trigger the **Weekly Check-in Schedule** node
3. Verify you receive the WhatsApp message
4. Check the CheckInLog sheet for the logged entry

### Test Inbound Responses

1. Reply to the check-in message
2. Verify the AI agent responds
3. Check the CheckInLog for the response entry
4. If you mention side effects, verify the Telegram notification

## Workflow Flow Diagram

### Outbound Flow (Scheduled)
```
Schedule Trigger
      |
      v
Get Active Patients (Google Sheets)
      |
      v
Filter Active Patients (REMAINING_WEEKS > 0)
      |
      v
Prepare Patient Context (JavaScript)
      |
      v
Check-in AI Agent (Claude Haiku 4.5 + Memory + RAG)
      |
      v
Send WhatsApp Message
      |
      v
Log to CheckInLog Sheet
      |
      v
Deduct Remaining Week
      |
      v
Check Treatment Status
      |
      +---> If Last Week: Mark Complete + Notify Team
      |
      +---> If Ongoing: Done
```

### Inbound Flow (Patient Responses)
```
WhatsApp Trigger
      |
      v
Handle Message Type
      |
      +---> Text: Continue
      |
      +---> Other: Reply "text only"
      |
      v
Lookup Patient (Google Sheets)
      |
      +---> Found: Continue
      |
      +---> Not Found: Reply "unknown number"
      |
      v
Response AI Agent (Claude Haiku 4.5 + Memory + RAG)
      |
      v
Send Response to Patient
      |
      v
Analyze for Side Effects/Concerns
      |
      v
Log to CheckInLog
      |
      v
Check if Follow-up Needed
      |
      +---> Yes: Notify Team (Telegram)
      |
      +---> No: Done
```

## Troubleshooting

### Workflow not triggering on schedule
- Check n8n timezone settings
- Verify workflow is **Active**
- Check n8n execution logs

### WhatsApp messages not sending
- Verify WhatsApp credentials are valid
- Check phone number format (must include country code)
- Verify WhatsApp Business API is active
- Check n8n execution logs for API errors

### Google Sheets errors
- Verify sheet names match exactly (`Patients`, `CheckInLog`)
- Check OAuth credentials are connected
- Verify PATIENT_SHEET_ID is correct
- Check sheet sharing permissions

### AI responses not working
- Verify Anthropic API key is valid
- Check Claude Haiku 4.5 model ID is correct
- Review n8n execution logs for API errors

### RAG not returning relevant info
- Verify Qdrant is running and accessible
- Check if tirzepatide knowledge was indexed
- Try querying Qdrant directly to test

### Telegram notifications not arriving
- Verify bot token is correct
- Check chat ID (should be negative for groups)
- Verify bot is added to the group

## Customization Options

### Change Check-in Day/Time
Edit the **Weekly Check-in Schedule** node parameters.

### Modify AI Personality
Edit the `systemMessage` in the AI Agent nodes.

### Add More Side Effect Keywords
Edit the **Analyze Response** code node to add more keywords.

### Change Escalation Rules
Modify the **Needs Follow-up?** node conditions.

### Localization
The workflow is configured for Brazilian Portuguese. To change:
1. Update system prompts in AI Agent nodes
2. Update reply messages in WhatsApp nodes
3. Update the knowledge base documents

## Security Considerations

- Patient data is stored in Google Sheets - ensure proper access controls
- WhatsApp messages are end-to-end encrypted
- API keys should be stored securely in n8n credentials
- Consider LGPD/HIPAA compliance requirements for your region
- Regularly audit access to the spreadsheet

## Support

For issues with this workflow:
1. Check n8n execution logs
2. Review this documentation
3. Verify all credentials are configured correctly
4. Test each component individually