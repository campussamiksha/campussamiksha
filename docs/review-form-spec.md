# CampusSamiksha — Review Form Specification

The submission flow for all three reviewer categories. Implemented in
[`app/institutions/[slug]/review/ReviewForm.tsx`](../app/institutions/%5Bslug%5D/review/ReviewForm.tsx)
(client) and validated server-side in
[`app/api/reviews/route.ts`](../app/api/reviews/route.ts).

## Goals

1. **Balance** — force both pros and cons so the corpus stays credible.
2. **Truthfulness** — first-hand, experiential language; no unverifiable
   criminal allegations, no naming individuals.
3. **Anonymity** — collect no field that identifies the reviewer publicly.
4. **Category fit** — show only the rating parameters relevant to the
   reviewer's category.

## Step 0 — Auth gate (before the form; not in scaffold yet)

- Require a verified account (email OTP + captcha) to submit.
- Offer optional **employment verification** (upload appointment letter /
  payslip / institutional-email check). The document is reviewed then **deleted**;
  only a `employment_verified` badge persists. See `verification_documents`.
- One review per institution per account (edit instead of re-post).

## Step 1 — Who are you (context, shown publicly except identity)

| Field | Type | Required | Notes |
|---|---|---|---|
| Reviewer category | select | ✓ | teaching_faculty / non_teaching_staff / research_scholar. **Drives which rating parameters render.** |
| Employment status | select | ✓ | current / former |
| Employment type | select | ✓ | Options vary by category (see below) |
| Designation / role | text | – | "no personal names" hint; e.g. Assistant Professor, Lab Assistant, JRF |
| Department | text | – | free text; optional |
| Start year | number | – | 1950–current |
| End year | number | – | blank if current; must be ≥ start year |

**Employment-type options by category**
- *Teaching faculty:* Permanent, Tenure track, Contract, Ad-hoc/Guest, Visiting, Other
- *Non-teaching staff:* Permanent, Contract, Project staff, Other
- *Research scholar:* PhD scholar, Postdoc, Project JRF/SRF/RA, Other

## Step 2 — Ratings (1–5 stars each)

- **Overall** — required, always shown.
- **Core parameters** for the chosen category — required.
- **Optional parameters** — may be skipped.

Parameters come from [`lib/ratingParameters.ts`](../lib/ratingParameters.ts)
(single source of truth, mirrored in the DB seed). Summary:

| Shared (all categories) | Teaching faculty (extra) | Non-teaching staff (extra) | Research scholar (extra) |
|---|---|---|---|
| Compensation & Benefits | Teaching Workload | Supervisor Support | Supervisor / Guide Quality |
| Salary/Stipend Punctuality | Research Support & Freedom | Workload Reasonableness | Stipend Adequacy |
| Management & Administration | Academic Freedom & Autonomy | Growth & Training | Research Infrastructure |
| Work–Life Balance | Career Growth & Promotion | Workplace Respect | Freedom in Research |
| Infrastructure & Facilities | Student Quality* | Role Clarity* | Publication & Conference Support |
| Inclusion & Harassment Safety | | | Lab / Group Culture* |
| Job Security | | | |

\* optional (not part of the core composite).

## Step 3 — Written review

| Field | Required | Rules |
|---|---|---|
| Headline | ✓ | 5–120 chars |
| Pros | ✓ | ≥ 20 chars |
| Cons | ✓ | ≥ 20 chars |
| Advice to management | – | ≤ 4000 chars |
| Advice to candidates | – | ≤ 4000 chars |
| Would recommend? | ✓ | yes / no |

## Validation rules (server-side, authoritative)

Enforced in the API route with Zod:

- Types/lengths/ranges as above; `endYear ≥ startYear`.
- Scores accepted **only** for parameters valid for the category
  (`parametersFor(category)`), silently dropping others.
- **Personal-data guardrail:** reject if the text contains a 10-digit phone
  number or an email address (first-pass anti-doxxing). Expand later with a
  named-entity check that flags likely personal names for human review.
- New reviews are saved with `status = 'pending'` → **moderation queue**, never
  auto-published.

## Anti-defamation copy (must appear on the form)

> Your identity is never shown or shared with the institution. Please keep it
> honest, first-hand, and **do not name individuals** — describe roles instead
> (e.g. "the HoD", "the accounts office"). By submitting you confirm this is your
> own experience and does not target any individual. Reviews are checked before
> publishing.

## Moderation outcomes

- **published** — visible; feeds aggregates.
- **rejected** — fails guidelines (names a person, unverifiable allegation, spam).
- **flagged** — published but re-opened after a `content_reports` entry.
- **removed** — taken down via notice-and-takedown / appeal.

## Future enhancements

- Employment-verification badge upload step.
- Draft autosave.
- Duplicate/astroturf detection (device fingerprint, velocity, similarity).
- Separate salary-report and interview-experience mini-forms (tables already exist).
