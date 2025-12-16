# WhatsApp Business API Setup Guide (DEPRECATED)

> **DEPRECATED**: This guide is for Meta's official WhatsApp Business Cloud API, which is no longer the primary integration method for this project.
>
> **For the current setup, please see: [Evolution API Setup Guide](./EVOLUTION_API_SETUP_GUIDE.md)**
>
> Evolution API provides:
> - No Meta Business verification required
> - Free messaging (self-hosted)
> - Faster setup (minutes vs days)
> - Optional Chatwoot integration for agent inbox

---

Complete guide to set up WhatsApp Business Cloud API for your clinic chatbot (legacy method).

---

## Prerequisites

- Facebook/Meta personal account
- Business email address
- Phone number for WhatsApp (can be new or existing)
- Business documentation (CNPJ for Brazil)

---

## Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create Account"
3. Enter:
   - Business name: Your clinic name
   - Your name
   - Business email
4. Complete verification (email confirmation)

---

## Step 2: Create Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select **"Other"** as use case
4. Select **"Business"** as app type
5. Enter:
   - App name: "Clinic WhatsApp Bot" (or similar)
   - Contact email
   - Business Account: Select your business account
6. Click "Create App"

---

## Step 3: Add WhatsApp Product

1. In your app dashboard, find "Add products to your app"
2. Find **"WhatsApp"** and click **"Set up"**
3. You'll be directed to WhatsApp configuration

---

## Step 4: Configure WhatsApp Business Account

### 4.1 Create WhatsApp Business Account
1. In WhatsApp settings, click "Add WhatsApp Business Account"
2. Fill in business details:
   - Business name
   - Business category: **Health/Medical**
   - Business description
3. Submit for review (usually instant for test numbers)

### 4.2 Add Phone Number
1. Go to "Phone Numbers" section
2. Click "Add Phone Number"
3. Choose:
   - **Test number** (free, for development) - Meta provides a test number
   - **Production number** (your clinic's number)

For production:
- Enter your phone number
- Verify via SMS or voice call
- Set display name (your clinic name)

---

## Step 5: Get API Credentials

### 5.1 Temporary Access Token (for testing)
1. In WhatsApp > API Setup
2. Copy the **"Temporary access token"**
3. Note: Expires in 24 hours

### 5.2 Permanent Access Token (for production)
1. Go to [business.facebook.com/settings/system-users](https://business.facebook.com/settings/system-users)
2. Click "Add" to create a System User
3. Set role: **Admin**
4. Click on the system user → "Add Assets"
5. Select your Meta App → Enable all permissions
6. Click "Generate Token"
7. Select permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
8. Copy and save this token securely!

### 5.3 Get Phone Number ID
1. In WhatsApp > API Setup
2. Find "Phone number ID" - looks like: `123456789012345`
3. Copy this value

### 5.4 Get WhatsApp Business Account ID
1. In WhatsApp > API Setup
2. Find "WhatsApp Business Account ID"
3. Copy this value

---

## Step 6: Configure Webhook

### 6.1 Set Webhook URL
1. In WhatsApp > Configuration > Webhook
2. Click "Edit"
3. Enter:
   - **Callback URL**: `https://your-n8n-domain.com/webhook/whatsapp`
   - **Verify token**: Create a secret string (e.g., `your_clinic_secret_2024`)
4. Click "Verify and save"

Note: Your n8n webhook must be publicly accessible and respond to the verification challenge.

### 6.2 Subscribe to Webhook Fields
After verification, subscribe to:
- [x] `messages` - Incoming messages
- [x] `message_status` - Delivery/read receipts (optional)

---

## Step 7: Create Message Templates

For automated messages (confirmations, reminders), you need approved templates.

### 7.1 Go to Message Templates
1. WhatsApp > Message Templates
2. Click "Create Template"

### 7.2 Create Appointment Confirmation Template

```
Name: appointment_confirmation
Category: UTILITY
Language: Portuguese (BR)

Header: None
Body:
Ola {{1}}! ✨

Sua consulta esta confirmada para:
📅 {{2}}
📍 {{3}}

Lembre-se de trazer:
• Documento de identidade
• Exames recentes (se tiver)

Ate breve!

Footer: Clinica [Nome]
Buttons: None
```

### 7.3 Create Reminder Template

```
Name: appointment_reminder
Category: UTILITY
Language: Portuguese (BR)

Body:
Ola {{1}}!

Lembrete: sua consulta e amanha, {{2}}.

📍 {{3}}
⏰ Chegue 15 min antes

Precisa reagendar? Responda esta mensagem.

Footer: Clinica [Nome]
```

### 7.4 Submit for Review
- Templates are usually approved within minutes to hours
- Ensure no promotional content in UTILITY templates
- Don't include pricing in templates

---

## Step 8: Test Your Setup

### 8.1 Send Test Message
Using the API Setup page:
1. Select your test phone number
2. Enter a recipient number (your personal WhatsApp)
3. Send a test message

### 8.2 Via cURL (Terminal)
```bash
curl -X POST \
  'https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "text",
    "text": {
      "body": "Teste do bot da clinica!"
    }
  }'
```

---

## Step 9: Configure n8n Webhook

In your n8n instance, create a webhook that:

1. **Handles verification challenge**
```javascript
// GET request with hub.mode=subscribe
if (query['hub.mode'] === 'subscribe' &&
    query['hub.verify_token'] === 'your_clinic_secret_2024') {
  return query['hub.challenge'];
}
```

2. **Receives messages**
```javascript
// POST request with message data
const message = body.entry[0].changes[0].value.messages[0];
const from = message.from;
const text = message.text?.body;
```

---

## Environment Variables Summary

After setup, you'll have:

```env
# WhatsApp Business API
WHATSAPP_PHONE_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxx...
WHATSAPP_APP_SECRET=abcd1234...
WHATSAPP_VERIFY_TOKEN=your_clinic_secret_2024
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
```

---

## Troubleshooting

### Webhook not verifying
- Ensure your n8n is publicly accessible (not localhost)
- Check verify token matches exactly
- Ensure webhook responds with hub.challenge

### Messages not sending
- Check access token hasn't expired
- Verify phone number is correctly formatted (country code, no spaces)
- Check API version in URL (use v18.0 or later)

### Template not approved
- Remove any pricing or promotional content
- Ensure correct category selection
- Use simple, clear language

---

## Next Steps

1. Save your credentials in `.env` file
2. Set up n8n webhook endpoint
3. Configure the webhook in Meta dashboard
4. Test message sending and receiving

---

## Useful Links

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/overview#rate-limits)
