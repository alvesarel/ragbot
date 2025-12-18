# Google Sheets Templates

CSV templates for the Google Sheets required by Diana (Patient Check-in Agent).

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
