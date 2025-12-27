# Google Sheets Templates

CSV templates for the Google Sheets used by the clinic agents:
- **Diana**: Patient check-ins (Patients, CheckIns)
- **Sofia**: Multi-role virtual secretary (AllPatients, Leads)

## Setup Instructions

### 1. Create New Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it: `Clinic Patient Management`

### 2. Import Patients Sheet
1. Go to **File → Import**
2. Select **Upload** tab
3. Upload `Patients.csv`
4. Choose **Replace current sheet**
5. Rename the sheet tab to `Patients`

### 3. Create CheckIns Sheet
1. Click the **+** button to add a new sheet
2. Go to **File → Import**
3. Upload `CheckIns.csv`
4. Choose **Insert new sheet(s)**
5. Rename the sheet tab to `CheckIns`

### 4. Get Sheet ID
Copy the Sheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
```

### 5. Update Workflows
Update the `PATIENT_SHEET_ID` value in:
- `workflows/diana-patient-checkin.json`
- `workflows/yara-executive-assistant.json`

Search for `your_google_sheet_id_here` and replace with your actual Sheet ID.

## Sheet Structures

### Patients Sheet (Master Data)
| Column | Description | Example |
|--------|-------------|---------|
| NAME | Patient full name | Maria Silva |
| PHONE | Phone number (no country code) | 11999998888 |
| STARTING_DATE | Treatment start date | 2024-12-01 |
| TOTAL_WEEKS_CONTRACTED | Plan duration | 12 |
| REMAINING_WEEKS | Weeks left | 10 |
| CURRENT_DOSE | Tirzepatide dose | 2.5mg |
| PAYMENT_METHOD | Payment type | PIX, Cartão |
| LAST_PAYMENT | Last payment date | 2024-12-01 |
| LAST_CHECKIN | Last check-in date | 2024-12-07 |
| STATUS | active/completed | active |

### CheckIns Sheet (Simple Log)
| Column | Description |
|--------|-------------|
| DATE | Check-in timestamp |
| PATIENT_NAME | Patient name |
| PHONE | Phone with country code |
| WEEK | Week number of treatment |
| SUMMARY | AI-generated summary of patient's report |
| FOLLOW_UP_NEEDED | YES/NO - whether team needs to follow up |

## How It Works

1. **Diana sends weekly check-in** (Saturday 11 AM)
2. **Patient responds** via WhatsApp (may send multiple messages)
3. **Diana responds** conversationally using AI
4. **AI generates summary** of the patient's report
5. **Single row logged** to CheckIns with: Date, Patient, Week, Summary, Follow-up
6. **If follow-up needed** → Team alerted via Telegram with full context

## Treatment Plans

| Plan | Duration |
|------|----------|
| Starter | 4 weeks |
| Standard | 12 weeks |
| Extended | 16 weeks |

## Tirzepatide Doses

Standard escalation: 2.5mg → 5mg → 7.5mg → 10mg → 12.5mg → 15mg

---

## Sofia Multi-Role Sheets

Sofia uses a separate Google Sheet for sender identification and lead tracking.

### Setup Sofia Sheet

1. Create new Google Sheet named `Sofia Multi-Role`
2. Import `AllPatients.csv` → Rename tab to `AllPatients`
3. Import `Leads.csv` → Rename tab to `Leads`
4. Share with n8n service account
5. Copy Sheet ID for workflow configuration

### AllPatients Sheet
Master list of all clinic patients (used for sender identification).

| Column | Description | Example |
|--------|-------------|---------|
| PHONE | Phone with country code (no +) | 5511999998888 |
| NAME | Patient full name | Maria Silva |
| EMAIL | Email address | maria@email.com |
| CPF | Brazilian ID | 123.456.789-00 |
| DOB | Date of birth | 1985-03-15 |
| REGISTRATION_DATE | When registered | 2024-12-01 |
| TREATMENT_TYPE | Tirzepatide/Other | Tirzepatide |
| STATUS | active/inactive | active |
| NOTES | Free text notes | Patient from referral |

### Leads Sheet
All leads for remarketing and qualification tracking.

| Column | Description | Example |
|--------|-------------|---------|
| PHONE | Phone with country code (no +) | 5511966665555 |
| NAME | Lead name | Paula Oliveira |
| EMAIL | Email if collected | paula@email.com |
| CEP | Postal code | 01310-100 |
| DOB | Date of birth | 1992-04-20 |
| CPF | CPF if collected | |
| SOURCE | Lead source | Meta Ads, Instagram |
| STAGE | Conversation stage | greeting/discovery/qualification/value_building/scheduling/confirmation |
| STATUS | Lead status | active/awaiting_human/scheduled/completed/cold |
| NOTES | AI-generated notes | Interested in consultation |
| LAST_MESSAGE | Last message from lead | Quero agendar |
| FIRST_CONTACT | First interaction timestamp | 2024-12-15 14:30 |
| LAST_CONTACT | Most recent interaction | 2024-12-18 09:15 |

### Phone Number Format

**Important**: All phone numbers are stored WITHOUT the + prefix (e.g., `5511999998888`).
- Evolution API sends numbers WITH + prefix
- Workflow normalizes: strips + for lookups, adds + for sending

---

## Interactive Booking Sheets

### BookingSessions Sheet
Tracks multi-step booking sessions for interactive appointment scheduling.

| Column | Description | Example |
|--------|-------------|---------|
| PHONE | User phone number | 5511999998888 |
| STATE | Current booking state | awaiting_date/awaiting_time/awaiting_confirmation/completed |
| SELECTED_DATE | Selected appointment date | 2024-12-30 |
| SELECTED_TIME | Selected appointment datetime (ISO) | 2024-12-30T14:00:00.000Z |
| AVAILABLE_SLOTS | JSON array of available slots | [{"date":"2024-12-30",...}] |
| CREATED_AT | Session creation timestamp | 2024-12-27T10:00:00.000Z |
| EXPIRES_AT | Session expiry (1 hour) | 2024-12-27T11:00:00.000Z |
| COMPLETED_AT | When booking was completed | 2024-12-27T10:15:00.000Z |

### Appointments Sheet
Logs all completed appointment bookings.

| Column | Description | Example |
|--------|-------------|---------|
| PHONE | Patient phone number | 5511999998888 |
| NAME | Patient name | Maria Silva |
| APPOINTMENT_DATE | Appointment datetime (ISO) | 2024-12-30T14:00:00.000Z |
| CALENDAR_EVENT_ID | Google Calendar event ID | abc123xyz |
| STATUS | Appointment status | scheduled/completed/cancelled/no_show |
| CREATED_AT | Booking creation timestamp | 2024-12-27T10:15:00.000Z |
| SOURCE | Booking source | whatsapp_bot/manual |

---

## NPS Survey Sheets

### NPSSurveys Sheet
Tracks NPS survey sends and responses.

| Column | Description | Example |
|--------|-------------|---------|
| PHONE | Patient phone number | 5511999998888 |
| NAME | Patient name | Maria Silva |
| SENT_AT | When survey was sent | 2024-12-01T10:00:00.000Z |
| SCORE | NPS score (0-10) | 9 |
| CATEGORY | NPS category | promoter/passive/detractor |
| RESPONDED_AT | When patient responded | 2024-12-01T14:30:00.000Z |
| REVIEW_SENT | Whether Google Review link was sent | true/false |
| FOLLOW_UP_NEEDED | Whether team should follow up (detractors) | true/false |

**NPS Categories:**
- **Promoter** (9-10): Loyal enthusiasts, send Google Review request
- **Passive** (7-8): Satisfied but vulnerable to competition
- **Detractor** (0-6): Unhappy, need team follow-up
