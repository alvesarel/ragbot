# Workflow Improvements Roadmap

Strategic plan for enhancing clinic operations and patient experience through AI automation.

---

## Current State

| Agent | Function | Channel |
|-------|----------|---------|
| Sofia | Lead qualification | WhatsApp |
| Diana | Weekly check-ins | WhatsApp |
| Yara | Executive queries | Telegram |

---

## Phase 1: Quick Wins (High Impact, Low Effort)

### 1.1 Appointment Reminders
**Problem:** Patients forget consultations, leading to no-shows.

**Solution:** Automated reminders 24h and 2h before appointments.

```
Trigger: Daily at 8 AM
    │
    ▼
Check appointments for tomorrow + today
    │
    ▼
Send personalized WhatsApp reminders
    │
    ▼
Log confirmation responses
```

**Data needed:** Appointments sheet (DATE, TIME, PATIENT_NAME, PHONE, TYPE, STATUS)

**Impact:** Reduce no-shows by 30-50%

---

### 1.2 Post-Consultation Follow-up
**Problem:** New patients feel abandoned after first consultation.

**Solution:** Sofia follows up 48h after first consultation.

```
Trigger: Daily check for consultations 2 days ago
    │
    ▼
Filter: First-time patients only
    │
    ▼
Send personalized follow-up:
- "How are you feeling about starting treatment?"
- Answer questions
- Encourage next steps
```

**Impact:** Increase conversion from consultation to treatment

---

### 1.3 Weekly Management Report (Yara Enhancement)
**Problem:** Management lacks automated insights.

**Solution:** Yara sends weekly digest every Monday.

```
Monday 9 AM
    │
    ▼
Compile metrics:
- New leads this week
- Consultations scheduled
- Treatments started
- Check-in completion rate
- Patients needing renewal
- Follow-ups pending
    │
    ▼
Send formatted report to Telegram
```

**Impact:** Save 2+ hours of manual reporting weekly

---

## Phase 2: Patient Experience (Medium Effort)

### 2.1 Treatment Progress Updates
**Problem:** Patients don't see their progress, reducing motivation.

**Solution:** Monthly progress message from Diana.

```
Monthly trigger (1st of month)
    │
    ▼
For each active patient:
- Calculate weeks completed
- Summarize check-in history
- Highlight positive trends
- Encourage continued adherence
    │
    ▼
Send motivational progress report
```

**Sample message:**
> "Maria, você completou 8 semanas do seu tratamento!
> Seus check-ins mostram ótima adesão e poucos efeitos colaterais.
> Continue assim - faltam apenas 4 semanas!"

**Impact:** Increase treatment completion rates

---

### 2.2 Dose Day Reminders
**Problem:** Patients forget to take their weekly Tirzepatide dose.

**Solution:** Reminder on their scheduled dose day.

```
Daily trigger
    │
    ▼
Check which patients have dose day = today
(based on STARTING_DATE weekday)
    │
    ▼
Send gentle reminder:
- Confirm dose amount
- Remind injection site rotation
- Ask if they need support
```

**Impact:** Improve treatment adherence

---

### 2.3 Smart Re-engagement
**Problem:** Leads go cold, completed patients don't return.

**Solution:** Automated re-engagement sequences.

**For cold leads (Sofia):**
```
Lead hasn't responded in 7 days
    │
    ▼
Send value-based follow-up
    │
    ▼
Still no response in 14 days
    │
    ▼
Final "door is open" message
    │
    ▼
Mark as cold, notify team
```

**For completed treatments (Diana):**
```
Treatment completed 30 days ago
    │
    ▼
Send check-in: "How are you maintaining results?"
    │
    ▼
60 days: Offer maintenance plan
    │
    ▼
90 days: Share success stories, invite return
```

**Impact:** Recover 10-20% of lost leads/patients

---

## Phase 3: Operational Excellence (Higher Effort)

### 3.1 Unified Patient Timeline
**Problem:** Patient history scattered across systems.

**Solution:** New "PatientHistory" sheet auto-populated by all agents.

```
Every interaction logged:
- DATE
- PATIENT_NAME
- AGENT (Sofia/Diana/Human)
- TYPE (lead_response/checkin/appointment/call)
- SUMMARY
- SENTIMENT
- ACTION_TAKEN
```

Yara can then answer: "Show me everything about Maria Silva"

**Impact:** Complete patient context for any team member

---

### 3.2 Smart Scheduling Integration
**Problem:** Manual appointment scheduling is slow.

**Solution:** Sofia directly books appointments via Google Calendar API.

```
Patient wants to schedule
    │
    ▼
Sofia checks available slots (Google Calendar)
    │
    ▼
Offers 3 options
    │
    ▼
Patient confirms
    │
    ▼
Creates calendar event + sends confirmation
    │
    ▼
Adds to Appointments sheet
```

**Impact:** Reduce scheduling friction, faster conversions

---

### 3.3 Payment & Renewal Automation
**Problem:** Manual tracking of payments and renewals.

**Solution:** Automated payment reminders and renewal offers.

```
Weekly check:
    │
    ├─► Payment due in 7 days → Friendly reminder
    │
    ├─► Payment overdue → Alert team + gentle patient message
    │
    └─► Treatment ending in 2 weeks → Renewal offer with incentive
```

**Impact:** Reduce payment delays, increase renewals

---

### 3.4 Satisfaction Surveys
**Problem:** No systematic feedback collection.

**Solution:** Automated NPS surveys at key moments.

```
Triggers:
- After first consultation (24h)
- Mid-treatment (week 6 of 12)
- Treatment completion
- 30 days post-completion

Survey flow:
- "De 0-10, qual a probabilidade de nos recomendar?"
- If < 7: "O que podemos melhorar?"
- If ≥ 9: "Podemos usar seu depoimento?"
```

**Impact:** Identify issues early, collect testimonials

---

## Phase 4: Advanced Intelligence (Future)

### 4.1 Predictive Churn Detection
Use check-in patterns to predict patients likely to abandon treatment.

**Signals:**
- Negative sentiment in responses
- Delayed responses
- Reported side effects without resolution
- Missed check-ins

**Action:** Proactive outreach before they leave.

---

### 4.2 Personalized Content Delivery
Based on patient profile and stage, send relevant content:
- Recipes for the "sem apetite" phase
- Exercise tips when energy increases
- Success stories from similar patients
- FAQ answers before they ask

---

### 4.3 Voice Message Support
Enable Diana to understand and respond to voice messages using existing transcription capability.

---

## Implementation Priority Matrix

| Workflow | Impact | Effort | Priority |
|----------|--------|--------|----------|
| Appointment Reminders | High | Low | 🔴 P1 |
| Weekly Management Report | High | Low | 🔴 P1 |
| Post-Consultation Follow-up | High | Low | 🔴 P1 |
| Dose Day Reminders | Medium | Low | 🟡 P2 |
| Treatment Progress Updates | High | Medium | 🟡 P2 |
| Smart Re-engagement | High | Medium | 🟡 P2 |
| Unified Patient Timeline | High | Medium | 🟡 P2 |
| Smart Scheduling | High | High | 🟢 P3 |
| Payment Automation | Medium | Medium | 🟢 P3 |
| Satisfaction Surveys | Medium | Medium | 🟢 P3 |
| Predictive Churn | High | High | 🔵 P4 |
| Personalized Content | Medium | High | 🔵 P4 |

---

## Recommended Starting Point

**Start with Phase 1 (3 workflows):**

1. **Appointment Reminders** - Immediate ROI, reduces no-shows
2. **Weekly Management Report** - Gives visibility, builds trust in automation
3. **Post-Consultation Follow-up** - Improves conversion

**Estimated implementation:** 1-2 days per workflow

---

## Data Requirements

New Google Sheets needed:

| Sheet | Purpose | Columns |
|-------|---------|---------|
| Appointments | Scheduling | DATE, TIME, PATIENT_NAME, PHONE, TYPE, DOCTOR, STATUS, REMINDER_SENT |
| PatientHistory | Unified timeline | DATE, PATIENT_NAME, AGENT, TYPE, SUMMARY, SENTIMENT |
| Surveys | NPS tracking | DATE, PATIENT_NAME, SCORE, FEEDBACK, STAGE |

---

## Next Steps

1. Choose which Phase 1 workflow to implement first
2. Create required Google Sheets
3. I'll build the n8n workflow
4. Test with sample data
5. Activate and monitor

Which workflow would you like to start with?
