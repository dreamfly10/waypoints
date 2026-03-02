# Business Logic Gap Analysis
## Career OS for U.S. Marines — PRD v1 vs Current Implementation

This document compares the PRD (see `PRD-Career-OS-Marines-v1.md`) to the current codebase and identifies **business logic that is missing or needs to be added**. No code changes were made; this is an audit only.

---

## Summary

| Area | Status | Gaps |
|------|--------|------|
| **1. User Types / Profile** | Partial | Missing TIS, TIG, medical clearance, PME; rank scope mismatch |
| **2. Digital Career Vault** | Partial | Activation threshold, verification_status, source, upload validation, error handling |
| **3. Readiness Engine** | Partial | Weights, TIG, percentile, “Incomplete”, daily/weekly triggers |
| **4. Alerts** | Partial | Resolution, channels, frequency rules, priority queue |
| **5. AI Advisor** | Partial | Context injection, guardrails, fallbacks |
| **6. Milestone Sharing** | Partial | Shareable events, privacy, referral, verification gate |
| **7. Security** | Not implemented | Encrypted storage, RBAC, share-card rules |

---

## 1. USER TYPES & PROFILE

### PRD Requirements
- Primary user: Active Duty Marine (Enlisted).
- Attributes: Rank (E1–E9), MOS, TIS, TIG, PFT score, Certifications, Medical clearance, PME completion status.

### Current Implementation
- **Schema (`shared/schema.ts`):** `profiles` has `branch`, `rank`, `mos`, `isPro`, `readinessScore`, `pftScore`, `vaultPassword`, `vaultLockEnabled`.
- Seed profile uses `rank: "O-3"` (officer), which is out of scope for v1 (Enlisted E1–E9 only).

### Gaps — To Add
1. **TIS (Time in Service)** — Not in profile; required for readiness/TIG logic.
2. **TIG (Time in Grade)** — Not in profile; required for readiness (20% weight) and eligibility.
3. **Medical clearance** — Not in profile; required for readiness (10%) and alerts.
4. **PME completion status** — Not in profile.
5. **Certifications (list/status)** — Only implied via vault cert docs; no structured field.
6. **Rank scope** — Enforce E1–E9 for v1; reject or map O-series if present.
7. **user_id** — PRD assumes multi-user; current code uses single profile (e.g. `profileId: 1`). Either add user identity or document “single-user prototype” explicitly.

---

## 2. DIGITAL CAREER VAULT

### PRD Requirements
- Document types: PFT Scorecard, Promotion Letter, Fitness Report, Training Certification, Medical Clearance, Awards, Orders.
- Data model: document_id, user_id, document_type, issue_date, expiration_date, parsed_fields, **verification_status** (pending/verified/rejected), **source** (manual/system), **upload_timestamp**.
- On upload: parse if type recognized; on success update profile + readiness; on failure mark “Needs Manual Input” and prompt confirmation.
- **Activation:** Min **2 structured documents** OR **1 PFT + 1 promotion-related** to unlock Readiness; otherwise Readiness = **"Incomplete"**.
- Error handling: unsupported type, corrupt PDF, duplicate (same issue_date + type), expiration in past, invalid score range, missing required fields → clear error, no readiness recalc if invalid, log failure.

### Current Implementation
- **Schema:** `vaultItems`: id, profileId, title, type, date, expiresAt, extractedFields. Types in code: `pft`, `cert`, `promotion_letter`, `orders`, `other`.
- No `verification_status`, `source`, or `upload_timestamp`.
- No real parsing; client sends mock `extractedFields`. No “Needs Manual Input” or confirmation flow.
- No activation threshold: readiness is always computed (e.g. 40+ bonuses); no “Incomplete” state.
- Vault create has no validation for: file type, duplicate (issue_date + type), expiration in past, PFT score range, required fields.
- No logging of parsing failures.

### Gaps — To Add
1. **Vault document model**
   - Add `verification_status`: pending | verified | rejected.
   - Add `source`: manual_upload | system_generated.
   - Add `upload_timestamp` (or equivalent).
   - Align `document_type` with PRD list (add Fitness Report, Medical Clearance, Awards if not covered by existing types).
2. **Activation logic**
   - Define “unlock readiness” rule: **2 structured docs** OR **1 PFT + 1 promotion-related**.
   - When not met: set Readiness to **"Incomplete"** (or equivalent) and do not show numeric score (or show 0 with label “Incomplete”).
   - When met: run current readiness calculation.
3. **Upload validation (before save)**
   - Reject unsupported file type (if/when real file upload exists).
   - Reject **duplicate**: same `document_type` + `issue_date` (or equivalent) for same user.
   - Reject **expiration_date** in the past.
   - For PFT docs: validate score in valid range (e.g. 0–300 or PRD range); reject and do not update profile if invalid.
   - Validate required fields per document_type; reject or mark for manual input.
4. **Parsing and manual input**
   - When parsing is implemented: on parse failure → set verification_status = pending, mark “Needs Manual Input”, prompt user to confirm/enter fields.
   - On parse success → set verified, extract fields, update profile, trigger readiness.
5. **Error handling and logging**
   - Return clear, user-facing error messages for each validation failure.
   - Do not call readiness recalculation when document is rejected or invalid.
   - Log parsing/validation failures for debugging.

---

## 3. READINESS ENGINE

### PRD Requirements
- Composite Promotion Readiness Score 0–100.
- Weights (example): Documentation 30%, PFT percentile 25%, TIG 20%, Certifications 15%, Medical 10%.
- Rules: missing required doc → component 0; expired doc → component 0; score out of range → reject update.
- PFT: normalize to **percentile by rank + age group**.
- TIG: if TIG < required minimum → 0; if TIG >= required → full score.
- Recalc triggers: new document, document expiry, profile edit, **midnight daily check**, **weekly “check needed”** (no readiness check in 7 days → mark “Check Needed”, queue alert).
- Error handling: prevent invalid score, flag incomplete profile.

### Current Implementation
- **Storage `recalculateReadiness()`:** Flat bonuses (e.g. +10 for PFT, +10 cert, +5 promo, +5 orders; +5–20 by PFT bands). No explicit 30/25/20/15/10 weights. No TIG, no medical, no percentile.
- No “missing required doc → 0” or “expired → 0” component logic; expiry only drives alerts.
- No midnight job; no weekly “check needed” or “Check Needed” alert.
- No rank/age or percentile; PFT used as raw score bands.
- Cap: isPro ? 100 : 95 (PRD does not specify free-tier cap; document if intentional).

### Gaps — To Add
1. **Weighted component model**
   - Implement the five components with PRD weights (or document chosen weights).
   - **Documentation completeness (30%):** e.g. required doc types present and not expired.
   - **PFT percentile (25%):** use rank + age group (age from profile or DOB); normalize raw PFT to percentile; component 0 if no valid PFT.
   - **TIG eligibility (20%):** require TIG (and TIS) in profile; compare to required minimum for rank; 0 or full per PRD.
   - **Certifications up-to-date (15%):** derive from vault cert docs (valid/not expired).
   - **Medical clearance valid (10%):** require medical in profile or vault; component 0 if missing or expired.
2. **Expired / missing → 0**
   - For each component: if required document is missing or expired, that component score = 0.
3. **PFT normalization**
   - Define rank + age groups and percentile table or formula; convert raw PFT to percentile for the 25% component.
4. **TIG data and rules**
   - Add TIG (and TIS) to profile; define “required minimum TIG” per rank; implement 0 vs full score.
5. **Score validity**
   - Reject updates that would produce invalid score (e.g. out of 0–100); flag incomplete profile when critical data missing.
6. **Scheduled and habit triggers**
   - **Midnight daily check:** job/cron to recalc readiness (e.g. for expirations).
   - **Weekly habit:** track “last readiness check”; if no check in 7 days → set “Check Needed” and create/queue alert.
7. **Activation gate**
   - Tie to Vault activation: if activation threshold not met, readiness remains “Incomplete” (see §2).

---

## 4. COMPLIANCE & EXPIRATION ALERTS

### PRD Requirements
- Types: PFT expiring (60 days), certification expiring, medical expiring, promotion window approaching, missing required doc.
- Trigger: expiration_date - today <= threshold → generate alert.
- Resolution: when user resolves → mark alert resolved, recalculate readiness.
- Channels: In-app, Push (if enabled), Email (if verified).
- Rules: no duplicate within 7 days; max 3 alerts per day; priority (medical > PFT > cert).

### Current Implementation
- Alerts created in `recalculateReadiness()`: missing PFT, expiring items (≤60 days), missing promotion letter. No resolution flow, no channels, no dedupe or cap.
- Schema: id, profileId, severity, title, message, dueDate, actionType, relatedVaultType, isRead. No `resolved_at` or status.

### Gaps — To Add
1. **Alert resolution**
   - When user resolves (e.g. uploads doc, renews cert): mark alert resolved (add `resolved_at` or status), then recalculate readiness.
   - API and UI to mark resolved (and optionally filter by resolved).
2. **Channels**
   - In-app: already present (list).
   - Push: add notification token storage and send when alert created (respect “if enabled”).
   - Email: add verified email and send (respect “if verified”).
3. **Frequency and dedupe**
   - No duplicate for same alert type/entity within 7 days.
   - Max 3 alerts per day (e.g. when creating new alerts, cap total sent in last 24h).
   - Priority queue: medical > PFT > cert when selecting which alerts to send if cap applies.
4. **Alert types**
   - Explicit support: PFT expiring (60 days), certification expiring, medical expiring, **promotion eligibility window approaching**, missing required doc.
5. **Error handling**
   - Expiration date missing: do not create expiry alert; optionally flag for manual review.
   - Timezone: use consistent (e.g. UTC or user TZ) for “today” and thresholds.
   - Invalid notification token: handle gracefully (e.g. disable push until re-registered).
   - Spam prevention: covered by 7-day dedupe and 3/day cap.

---

## 5. CONTEXTUAL AI ADVISOR

### PRD Requirements
- Free: basic readiness breakdown, missing checklist.
- Pro: benchmark vs peers, what-if scenario, promotion probability.
- Context: Rank, MOS, current readiness, missing components, last PFT percentile, TIG status.
- Must not: fabricate regulations, give medical advice, guarantee promotion.
- Errors: API timeout, missing profile, empty vault, Pro feature for free user → generic response or graceful message.

### Current Implementation
- Pro gating: advanced/benchmarking requests return 403 and paywall; basic readiness/missing items in response.
- Advisor builds response from profile + vault + alerts; no structured “context injection” object; no TIG or percentile in prompt (benchmark is hardcoded text).
- No explicit guardrails (no regulations/medical/guarantee disclaimers).
- No timeout or empty-vault fallback; no “generic advisory” fallback.

### Gaps — To Add
1. **Structured context injection**
   - Build a context payload: rank, MOS, current readiness score, missing components (from alerts/vault), last PFT percentile (from readiness engine), TIG status. Pass into advisor (or prompt) on every request.
2. **Guardrails**
   - AI must not fabricate official regulations, give medical advice, or guarantee promotion. Implement via system prompt, response checks, or both; document in PRD/design.
3. **Empty vault / missing profile**
   - If vault empty or profile missing required fields: limit AI (e.g. “Add documents to get personalized advice”) and return generic message; do not assume data that isn’t there.
4. **Pro feature access**
   - Already block Pro features for free user (403); ensure message is clear and consistent.
5. **Fallbacks**
   - API timeout: retry or return generic “Try again later” message.
   - On any advisor failure: graceful error message and optional generic advisory (e.g. “Focus on PFT and required documents”).

---

## 6. MILESTONE SHARING

### PRD Requirements
- Shareable events: readiness improved by X points, promotion achieved, certification completed, PFT personal best.
- Card: Rank, Achievement, Date, Readiness delta.
- Privacy: Public (Marine network), Unit-only, Private.
- On share: prompt to invite 3 peers; referral tracking link; referral unlock = limited Pro preview.

### Current Implementation
- Vault upload can show a “70% readiness” milestone modal and “Post to Community” / “Invite 2 Peers” (text says “Invite 2 Peers” vs PRD “3”); no backend persistence of share or referral link.
- Community posts: author, content, createdAt, type, milestoneCard (title, icon), likes. No privacy, no referral link, no verification gate.
- No explicit “shareable events” (readiness delta, promotion, cert completed, PFT best); no check that milestone is verified before share.

### Gaps — To Add
1. **Shareable event types**
   - Define and support: readiness improved by X points, promotion achieved, certification completed, PFT personal best. Use these to auto-generate cards and to drive “Share” UI.
2. **Card content**
   - Auto-generate card with: Rank, Achievement, Date, Readiness delta (and no sensitive data per security).
3. **Privacy controls**
   - Add visibility: Public (Marine network), Unit-only, Private. Store per post (or per user default); enforce in list/detail and in any “network” scope.
4. **Referral flow**
   - On share: prompt to invite **3** peers (align copy with PRD).
   - Generate and store referral tracking link; attribute signups/usage to referrer.
   - Referral unlock: define “limited Pro feature preview” and implement unlock for referred users.
5. **Verification and duplicate prevention**
   - Do not allow share before milestone is verified (e.g. readiness delta or promotion backed by verified vault/profile).
   - Duplicate milestone post: detect same event type + same date/period and block or warn (e.g. “Already shared this milestone”).
6. **Referral abuse**
   - Define and implement abuse detection (e.g. same IP, same device, excessive referrals) and limit or flag.

---

## 7. SYSTEM DEPENDENCIES & SECURITY

### PRD Requirements
- Vault upstream of Readiness, Alerts, AI, Sharing. If Vault empty: AI limited, Sharing disabled, Alerts minimal.
- Security: encrypted storage, role-based access, no public sharing of documents, no sensitive data on share cards.

### Current Implementation
- Readiness and alerts depend on vault items; AI uses vault; sharing (community) is not gated by vault state. No “empty vault” limits for AI or sharing.
- No encryption at rest described; no RBAC; share cards currently show rank and readiness (PRD says no sensitive data on cards—confirm “sensitive” list).

### Gaps — To Add
1. **Empty vault behavior**
   - If vault empty (or below activation threshold): AI responds with limited/generic only; Sharing disabled or read-only; Alerts only “add documents” type; Readiness = “Incomplete”.
2. **Encrypted storage**
   - Document and implement encryption at rest for documents and PII (e.g. vault items, profile fields).
3. **Role-based access**
   - Define roles (e.g. enlisted user, admin, support) and enforce in API and UI (v1 may be single-role).
4. **Share card content**
   - Ensure share cards do not expose sensitive data (e.g. full PII, document content); only Rank, Achievement, Date, Readiness delta (and similar non-sensitive fields).

---

## 8. CROSS-CUTTING DATA MODEL GAPS

- **document_id / user_id:** Vault uses `id` and `profileId`; align naming with PRD or document mapping (e.g. document_id = id, user_id = profileId).
- **issue_date vs date:** PRD “issue_date”; schema “date”. Treat as same; ensure expiration_date and issue_date both validated (e.g. expiration >= issue_date).
- **Community post vs share:** PRD “milestone sharing” implies share cards and referral; current “community” is broader (chats, groups, channels). Clarify whether “sharing” is a subset of community posts (milestone type) and implement referral + privacy on that subset.

---

## Document Control

- **PRD reference:** `docs/PRD-Career-OS-Marines-v1.md`
- **Scope:** Business logic only; no UI/UX or implementation design beyond “what” must be true.
- **No code changes** were made in this audit.
