# WhatsApp Business API Setup Guide

Complete guide for setting up WhatsApp Business API credentials for Sofia and Diana agents.

## Overview

You'll need to create:
1. **Meta Business Account**
2. **Meta Developer App** with WhatsApp product
3. **WhatsApp Business Account**
4. **Three n8n credentials**: `whatsapp-creds`, `whatsapp-trigger-creds`, `whatsapp-bearer-creds`

---

## Part 1: Meta Business Account

### 1.1 Create Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Click **Create Account** (or use existing)
3. Enter:
   - Business name
   - Your name
   - Business email
4. Complete verification if required

---

## Part 2: Meta Developer App

### 2.1 Create Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Other** → **Next**
4. Select **Business** type → **Next**
5. Enter:
   - App name: `Clinic WhatsApp Bot`
   - Contact email: Your email
   - Business Account: Select your business
6. Click **Create App**

### 2.2 Add WhatsApp Product

1. In your app dashboard, find **Add Products**
2. Find **WhatsApp** → Click **Set Up**
3. Select your Meta Business Account → **Continue**

---

## Part 3: WhatsApp Business Setup

### 3.1 Get Test Phone Number (Development)

1. Go to **WhatsApp** → **API Setup** in left menu
2. You'll see a **Test Phone Number** assigned automatically
3. Note down:
   - **Phone Number ID**: `1234567890123456`
   - **WhatsApp Business Account ID**: `9876543210`

### 3.2 Add Test Recipients

1. In **API Setup**, scroll to **Send and receive messages**
2. Under **To**, click **Manage phone number list**
3. Add your phone number (with country code, e.g., `+5511999998888`)
4. You'll receive a verification code via WhatsApp
5. Enter the code to verify

### 3.3 Generate Access Token

#### Option A: Temporary Token (Development - expires in 24h)
1. In **API Setup**, you'll see a **Temporary access token**
2. Click **Copy** - this is your access token
3. Note: This expires in 24 hours, good for testing only

#### Option B: Permanent Token (Production - recommended)

1. Go to **Business Settings** → [business.facebook.com/settings](https://business.facebook.com/settings)
2. Navigate to **Users** → **System Users**
3. Click **Add** to create a new System User:
   - Name: `n8n-bot`
   - Role: **Admin**
4. Click **Create System User**
5. Click on the system user → **Add Assets**
6. Select **Apps** → Your app → **Full Control**
7. Also add **WhatsApp Accounts** → Your account → **Full Control**
8. Click **Generate New Token**:
   - Select your app
   - Token expiration: **Never**
   - Permissions: Select these:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
9. Click **Generate Token**
10. **COPY AND SAVE THIS TOKEN** - you won't see it again!

---

## Part 4: Webhook Configuration

### 4.1 Get Your n8n Webhook URLs

After importing the workflows into n8n, you'll have webhook URLs like:

**Sofia:**
```
https://your-n8n.com/webhook/sofia-whatsapp
```

**Diana:**
```
https://your-n8n.com/webhook/patient-checkin-webhook
```

To find these:
1. Open the workflow in n8n
2. Click on the **WhatsApp Trigger** node
3. Copy the **Webhook URL** shown

### 4.2 Configure Webhook in Meta

1. Go to your app → **WhatsApp** → **Configuration**
2. Click **Edit** next to Webhook
3. Enter:
   - **Callback URL**: Your n8n webhook URL
   - **Verify Token**: Create a random string (e.g., `my_verify_token_12345`)
4. Click **Verify and Save**

### 4.3 Subscribe to Webhook Fields

1. In **Configuration** → **Webhook fields**
2. Subscribe to:
   - `messages` ✓ (required)
   - `message_status` ✓ (optional, for delivery receipts)

---

## Part 5: n8n Credentials Setup

### 5.1 WhatsApp Business API (`whatsapp-creds`)

1. In n8n: **Credentials** → **Add Credential**
2. Search: **WhatsApp Business Cloud API**
3. Enter:
   - **Phone Number ID**: From Part 3.1
   - **Access Token**: From Part 3.3 (permanent token)
4. Name: `whatsapp-creds`
5. **Save**

### 5.2 WhatsApp Trigger (`whatsapp-trigger-creds`)

1. **Credentials** → **Add Credential**
2. Search: **WhatsApp Business Cloud API** (same type)
3. Enter same values:
   - **Phone Number ID**: Same as above
   - **Access Token**: Same as above
4. Name: `whatsapp-trigger-creds`
5. **Save**

### 5.3 WhatsApp Bearer Token (`whatsapp-bearer-creds`)

Used for downloading media (voice messages, videos).

1. **Credentials** → **Add Credential**
2. Search: **Header Auth**
3. Enter:
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_ACCESS_TOKEN_HERE`

   Example:
   ```
   Name: Authorization
   Value: Bearer EAAxxxxxxx...
   ```
4. Name: `whatsapp-bearer-creds`
5. **Save**

---

## Part 6: Production Setup

### 6.1 Add a Real Business Phone Number

1. Go to **WhatsApp** → **Phone Numbers**
2. Click **Add Phone Number**
3. Enter your business phone number
4. Choose verification method (SMS or Voice call)
5. Complete verification

### 6.2 Set Up Business Profile

1. Go to **WhatsApp** → **Phone Numbers** → Click your number
2. Edit **Business Profile**:
   - Display name (requires approval)
   - Business category
   - Business description
   - Profile picture
   - Website, email, address

### 6.3 Switch to Live Mode

1. Go to your app's **Basic Settings**
2. Toggle **App Mode** from **Development** to **Live**
3. Complete any required verification steps

---

## Part 7: Test Your Setup

### 7.1 Send a Test Message

Use this curl command to test (replace values):

```bash
curl -X POST "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999998888",
    "type": "text",
    "text": {"body": "Hello from the bot!"}
  }'
```

### 7.2 Test n8n Workflow

1. Activate the Sofia or Diana workflow
2. Send a WhatsApp message to your business number
3. Check n8n execution logs

---

## Troubleshooting

### "Message failed to send"
- Check Access Token is valid and not expired
- Verify Phone Number ID is correct
- Ensure recipient has messaged you first (24-hour window)

### "Webhook not receiving messages"
- Verify webhook URL is publicly accessible (HTTPS required)
- Check Verify Token matches
- Ensure you subscribed to `messages` webhook field
- Workflow must be **active** in n8n

### "Media download fails"
- Check `whatsapp-bearer-creds` has correct token
- Token format must be: `Bearer EAAxxxx...` (with space after Bearer)

### "Phone number not verified"
- Add your number to test recipients (Part 3.2)
- In production, use a verified business number

---

## Quick Reference

| Item | Where to Find |
|------|---------------|
| Phone Number ID | App → WhatsApp → API Setup |
| Access Token | System User → Generate Token |
| Webhook URL | n8n workflow → Trigger node |
| Verify Token | You create this (random string) |

---

## Security Notes

- **Never commit** Access Tokens to git
- Use **permanent tokens** from System Users for production
- **Rotate tokens** periodically
- Store credentials **only** in n8n credential manager

---

## Useful Links

- [Meta Business Suite](https://business.facebook.com/)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
