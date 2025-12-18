# Google Sheets Templates

These CSV files are templates for the Google Sheets required by Diana (Patient Check-in Agent).

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

### 3. Import CheckInLog Sheet
1. Click the **+** button to add a new sheet
2. Go to **File → Import**
3. Upload `CheckInLog.csv`
4. Choose **Insert new sheet(s)**
5. Rename the sheet tab to `CheckInLog`

### 4. Get Sheet ID
Copy the Sheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
```

### 5. Update Workflows
Update the `PATIENT_SHEET_ID` value in:
- `workflows/diana-patient-checkin.json` (6 occurrences)
- `workflows/yara-executive-assistant.json` (2 occurrences)

Search for `your_google_sheet_id_here` and replace with your actual Sheet ID.

## Sheet Structures

### Patients Sheet
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
| NOTES | Additional notes | Free text |
| STATUS | active/completed | active |

### CheckInLog Sheet
| Column | Description |
|--------|-------------|
| DATE | Check-in timestamp |
| PATIENT_NAME | Patient name |
| PHONE | Phone with country code |
| WEEK_NUMBER | Week of treatment |
| DOSE_AT_CHECKIN | Current dose |
| REMAINING_WEEKS | Weeks remaining |
| MESSAGE_SENT | Message Diana sent |
| STATUS | sent/response_received |
| RESPONSE | Patient's response |
| SIDE_EFFECTS_REPORTED | Detected side effects |
| FOLLOW_UP_NEEDED | YES/NO |

## Treatment Plans

| Plan | Duration |
|------|----------|
| Starter | 4 weeks |
| Standard | 12 weeks |
| Extended | 16 weeks |

## Tirzepatide Doses

Standard escalation: 2.5mg → 5mg → 7.5mg → 10mg → 12.5mg → 15mg
