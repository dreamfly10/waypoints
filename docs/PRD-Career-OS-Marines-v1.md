# PRODUCT REQUIREMENTS DOCUMENT
## Career OS for U.S. Marines
**Version 1.0 — Core PLG Growth Stack**

---

## 0. PRODUCT PRINCIPLE

**Career-first system.**  
**Community is secondary.**  
All features must strengthen the loop:

**Vault → Readiness → Alerts → Advisor → Sharing**

---

## 1. USER TYPES

**Primary User:** Active Duty Marine (Enlisted)

**Attributes:**
- Rank (E1–E9)
- MOS
- TIS (Time in Service)
- TIG (Time in Grade)
- Current PFT score
- Certifications
- Medical clearance
- PME completion status

**Future (Out of Scope for v1):** Officer, Veteran, Cross-branch

---

## 2. DIGITAL CAREER VAULT

**Purpose:** Structured career document storage with automated parsing.

**Accepted Document Types:**
- PFT Scorecard
- Promotion Letter
- Fitness Report
- Training Certification
- Medical Clearance
- Awards
- Orders

**Data Model:**  
Each document record must store:
- `document_id`
- `user_id`
- `document_type`
- `issue_date`
- `expiration_date` (nullable)
- `parsed_fields` (JSON)
- `verification_status` (pending, verified, rejected)
- `source` (manual upload / system generated)
- `upload_timestamp`

**Business Logic — On Upload:**
- IF document_type recognized → Attempt parsing
- IF parsing successful → Extract relevant fields, update profile fields, trigger readiness recalculation
- IF parsing fails → Mark as "Needs Manual Input", prompt user to confirm fields

**Activation Logic:**  
User must upload minimum:
- **2 structured documents** OR
- **1 PFT + 1 promotion-related document**

To unlock Readiness Score. Before threshold: **Readiness = "Incomplete"**.

**Error Scenarios:**
- Unsupported file type
- Corrupt PDF
- Duplicate upload (same issue_date + type)
- Expiration date in past
- Invalid score range
- Document missing required fields

**System response:** Clear error message; prevent readiness recalculation if data invalid; log parsing failure.

---

## 3. READINESS ENGINE

**Purpose:** Generate composite Promotion Readiness Score (0–100).

**Score Components — Weight Distribution (example v1):**
- Documentation completeness (30%)
- PFT score percentile (25%)
- Time in Grade eligibility (20%)
- Certifications up-to-date (15%)
- Medical clearance valid (10%)

**Score Calculation Logic:**
- IF required document missing → Component score = 0
- IF document expired → Component score = 0
- IF score out of valid range → Reject update
- **PFT normalization:** Convert raw score to percentile by rank + age group
- **Time in Grade:** IF TIG < required minimum → 0; IF TIG >= required → full score

**Score updates automatically when:**
- New document uploaded
- Document expires
- User edits profile
- Midnight daily check
- Weekly Habit Trigger: IF user has not checked readiness in 7 days → Mark as "Check Needed", queue alert

**Error Scenarios:**
- Score calculation failure
- Missing rank
- Conflicting document dates
- Expired medical clearance
- Inconsistent TIG calculation

**System must:** Prevent invalid readiness score; flag incomplete profile.

---

## 4. COMPLIANCE & EXPIRATION ALERTS

**Alert Types:**
- PFT expiring soon (within 60 days)
- Certification expiring
- Medical clearance expiring
- Promotion eligibility window approaching
- Missing required doc

**Alert Logic:**
- **Trigger:** IF expiration_date - today <= threshold → Generate alert
- **Resolution:** IF user resolves issue → Mark alert resolved, recalculate readiness

**Alert channels:** In-app, Push notification (if enabled), Email (if verified)

**Alert Frequency Rules:**
- No duplicate alerts within 7 days
- Max 3 alerts per day
- Priority queue (medical > PFT > cert)

**Error Scenarios:**
- Expiration date missing
- Timezone mismatch
- Notification token invalid
- Alert spam prevention

---

## 5. CONTEXTUAL AI ADVISOR

**Purpose:** Personalized advisory assistant.

**Access Levels:**
- **Free:** Basic readiness breakdown, missing checklist summary
- **Pro:** Benchmark vs peers, "What-if" scenario modeling, promotion probability estimate

**AI Context Injection:**  
Prompt must include: Rank, MOS, Current readiness score, Missing components, Last PFT percentile, TIG status.

**AI must not:** Fabricate official regulations; provide medical advice; guarantee promotion outcome.

**Error Scenarios:**
- API timeout
- Missing profile context
- Empty vault
- Pro feature accessed by free user

**Fallback:** Generic advisory response; graceful error message.

---

## 6. MILESTONE SHARING

**Shareable Events:**
- Readiness improved by X points
- Promotion achieved
- Certification completed
- PFT personal best

**Sharing Logic:**  
Auto-generate card with: Rank, Achievement, Date, Readiness delta.

**Privacy controls:** Public (Marine network), Unit-only, Private.

**Distribution Logic:**
- If shared → Prompt to invite 3 peers; referral tracking link generated
- **Referral unlock:** Unlock limited Pro feature preview

**Error Scenarios:**
- Duplicate milestone post
- User attempts to share before verification
- Privacy mismatch
- Referral abuse detection

---

## SYSTEM DEPENDENCIES

- Vault is upstream of: Readiness, Alerts, AI, Sharing
- If Vault empty: AI limited, Sharing disabled, Alerts minimal

---

## SECURITY REQUIREMENTS

- Encrypted storage
- Role-based access
- No public sharing of documents
- No sensitive data visible in share cards

---
