# CampusSamiksha

A Glassdoor-style review portal for **Indian academic employers** — universities,
colleges and research institutes. Current and former **teaching faculty,
non-teaching staff, and research scholars** anonymously review their employer so
the academic community can make informed decisions before joining.

> *Samiksha* (समीक्षा) = "review / critical appraisal."

## Why

Academic hiring in India is opaque: workload, pay parity, salary punctuality,
research freedom and management culture vary enormously between institutes and
are almost never disclosed before joining. CampusSamiksha reduces that
information asymmetry.

Differentiators vs. existing sites: it covers the **whole campus workforce**
(not just K-12 teachers, and not students rating professors), with a
higher-ed + research focus and verified-employee trust signals.

## Tech stack

- **Next.js 14** (App Router, SSR) — SEO is the primary acquisition channel.
- **TypeScript**, **PostgreSQL**, **Prisma**, **Zod**.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure DB
cp .env.example .env        # set DATABASE_URL to your Postgres

# 3. Create schema + generate client
npm run db:push             # or: npm run db:migrate
npm run db:generate

# 4. (Recommended) apply raw SQL extras Prisma can't express
#    — the materialized view + pg_trgm search indexes:
psql "$DATABASE_URL" -f db/schema.sql   # optional; db:push covers the tables

# 5. Seed rating parameters + a starter institution directory
npm run db:seed

# 6. Run
npm run dev                 # http://localhost:3000
```

> Postgres extensions `pgcrypto`, `citext`, `pg_trgm` are required
> (declared in the Prisma datasource / `db/schema.sql`).

## What's implemented

| Area | Files |
|---|---|
| Schema (canonical DDL) | [`db/schema.sql`](db/schema.sql) |
| Schema (ORM) | [`prisma/schema.prisma`](prisma/schema.prisma) |
| Seed (params + institutions + admin) | [`prisma/seed.ts`](prisma/seed.ts) |
| Rating parameters (shared config) | [`lib/ratingParameters.ts`](lib/ratingParameters.ts) |
| Home / search | [`app/page.tsx`](app/page.tsx) |
| Institution profile + per-category ratings | [`app/institutions/[slug]/page.tsx`](app/institutions/%5Bslug%5D/page.tsx) |
| Review form (category-aware) | [`app/institutions/[slug]/review/ReviewForm.tsx`](app/institutions/%5Bslug%5D/review/ReviewForm.tsx) |
| API: search | [`app/api/institutions/route.ts`](app/api/institutions/route.ts) |
| API: submit review (auth + validation + guardrails) | [`app/api/reviews/route.ts`](app/api/reviews/route.ts) |
| API: report a review | [`app/api/reviews/[id]/report/route.ts`](app/api/reviews/%5Bid%5D/report/route.ts) |
| **Auth** — session lib + signup/login/logout/verify | [`lib/auth.ts`](lib/auth.ts), [`app/api/auth/`](app/api/auth/) |
| **Moderation console** (role-guarded) | [`app/admin/`](app/admin/) |
| **Aggregate recomputation** | [`lib/aggregates.ts`](lib/aggregates.ts), [`lib/moderation.ts`](lib/moderation.ts) |
| **Institution claim** flow | [`lib/claims.ts`](lib/claims.ts), [`app/api/claims/`](app/api/claims/), [`app/institutions/[slug]/claim/`](app/institutions/%5Bslug%5D/claim/) |
| **Right of reply** (official response) | [`app/api/reviews/[id]/response/`](app/api/reviews/%5Bid%5D/response/), [`components/OfficialResponseForm.tsx`](components/OfficialResponseForm.tsx) |
| **Verified-employee badge** (upload → review → purge) | [`lib/verification.ts`](lib/verification.ts), [`lib/storage.ts`](lib/storage.ts), [`app/verify/`](app/verify/), [`app/admin/verification/`](app/admin/verification/) |
| **Salary reports** (submit + median + moderation) | [`app/api/salary/`](app/api/salary/), [`components/SalaryForm.tsx`](components/SalaryForm.tsx), [`app/admin/salaries/`](app/admin/salaries/) |
| **Interview experiences** (submit + moderation) | [`app/api/interviews/`](app/api/interviews/), [`components/InterviewForm.tsx`](components/InterviewForm.tsx), [`app/admin/interviews/`](app/admin/interviews/) |
| **Legal pages** (Terms, Privacy, Guidelines, Grievance) — *draft templates* | [`app/terms/`](app/terms/), [`app/privacy/`](app/privacy/), [`app/guidelines/`](app/guidelines/), [`app/grievance/`](app/grievance/), [`lib/legal.ts`](lib/legal.ts) |
| **Email delivery** (console + SMTP) + verify-email send/resend | [`lib/mailer.ts`](lib/mailer.ts), [`lib/emails.ts`](lib/emails.ts), [`app/api/auth/resend-verification/`](app/api/auth/resend-verification/) |
| ER diagram | [`docs/ER-diagram.md`](docs/ER-diagram.md) |
| Review-form spec | [`docs/review-form-spec.md`](docs/review-form-spec.md) |

## Auth & moderation

- **Accounts**: email + password, HMAC-signed httpOnly session cookie (no session
  table). Sign up at `/signup`, log in at `/login`.
- **Email verification**: a token is generated on sign-up. In development the
  verification link is printed to the server console (and returned in the API
  response) instead of being emailed — wire an SMTP/provider before production.
- **Posting a review requires a verified account**; one review per institution
  (DB-enforced). New reviews enter the queue as `pending`.
- **Moderation console** at `/admin` (moderator/admin only): review queue
  (approve / reject / remove), and a reports queue. Every action writes to
  `moderation_log` and **recomputes the institution's aggregates** so ratings
  reflect only published reviews.
- **Reporting**: any logged-in user can report a published review; it flips to
  `flagged` and surfaces in the reports queue.
- **Seeded admin**: `npm run db:seed` creates an admin from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` (defaults in `.env.example` — change them).

## Institution claim & right of reply

- **Claim**: an institution rep visits `/institutions/<slug>/claim`, submits an
  official email + designation. A moderator approves it in `/admin/claims`,
  which marks the institution `claimed`, records the owning user, and promotes
  them to `institution_rep`.
- **Right of reply**: on the profile page, the verified rep can post **one**
  official response per review (moderated in `/admin/responses`, then shown
  under the review). Reps can reply — they can never edit or hide honest
  reviews. Claimed profiles show an "Officially responds" badge.

## Email

Verification links are sent through a pluggable transport ([`lib/mailer.ts`](lib/mailer.ts)):

- **`console`** (default) — logs the email to the server console; the dev flow
  also returns the link in the API response.
- **`smtp`** — set `MAIL_TRANSPORT=smtp` and the `SMTP_*` vars (any provider:
  SES, Postmark, SendGrid, or an SMTP relay). `APP_URL` builds absolute links.

Sign-up sends a verification email; unverified users can **resend** it from any
"verify your email" gate. Wire real DNS/SPF/DKIM for your sending domain before
production.

## Importing the institution directory

Bulk-load institutions from a CSV (upsert by slug — safe to re-run):

```bash
npm run db:import -- data/institutions.sample.csv
```

Columns (case-insensitive header; only `name` and `type` are required):
`name, type, ownership, city, state, aka, established_year, website,
naac_grade, naac_cgpa, nirf_rank_overall, ugc_recognized, aicte_approved,
nba_accredited, pay_scale_type`. `aka` (acronyms/alternate names) is `;`- or
`|`-separated. `type`/`ownership` accept enum values or friendly aliases
(`iit`/`nit`/`iim` → institute_of_national_importance, `central` → central_university,
`govt` → government, …). On update, only columns present in the CSV are
overwritten, so a partial file never wipes existing data. Invalid rows are
skipped and reported. See [`data/institutions.sample.csv`](data/institutions.sample.csv).

## Not yet built (next steps)

- **Rate-limiting / astroturf detection** on submissions.
- **Legal review** — draft templates exist (`/terms`, `/privacy`, `/guidelines`,
  `/grievance`); they need a qualified Indian lawyer to review/adapt and the
  `[…]` placeholders in [`lib/legal.ts`](lib/legal.ts) filled before launch.
- **Full institution directory** import from public NIRF/UGC/AICTE/NAAC datasets.
- **Materialized-view aggregates** at scale (currently computed live + cached).

## Verified-employee badge (trust anchor)

The badge design keeps proof only long enough to check it, never longer:

1. A logged-in, email-verified user uploads one proof (appointment letter,
   payslip, ID card, or institutional-email screenshot) at `/verify` — PDF/PNG/JPG,
   max 5 MB. The file goes to a private, **non-web-served** directory
   (`private-uploads/`, gitignored); the DB stores only a reference + a 30-day
   `expiresAt`.
2. A moderator opens it at `/admin/verification` via a **moderator-only** stream
   route and decides.
3. On **either** decision the file is **deleted** and its reference nulled — on
   approve, the user (and their reviews for that institution) gain the
   `employment_verified` badge; the document itself is never retained.
4. Proofs never acted on are swept by `scripts/purge-verification.ts` (schedule
   it daily) once past `expiresAt`.

> Production: swap the local directory for object storage (S3/GCS) with a
> lifecycle rule, and set `VERIFICATION_UPLOAD_DIR` accordingly.

## Smoke test

[`scripts/smoke.ts`](scripts/smoke.ts) drives the real business-logic libs
(moderation, aggregates, claims) against a live database on throwaway data, then
cleans up. It verifies: pending reviews don't affect aggregates; approval math
(count/avg/recommend%); moderation audit logging; claim approval + rep
promotion; right-of-reply moderation; the one-response-per-review constraint;
and report → flag → remove → aggregate recompute.

```bash
DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/smoke.ts
```

Verified passing (11/11) against PostgreSQL 16.4.

## Verification status

- `tsc --noEmit` — clean.
- `next build` — clean (all 25 routes compile; requires **Node ≥ 18.17**).
- DB business logic — 11/11 (`scripts/smoke.ts`) against Postgres 16.4.
- Storage layer — 7/7 (`scripts/storage-test.ts`), incl. path-traversal guard.
- Mailer — 7/7 (`scripts/mail-test.ts`): template, console transport, SMTP MIME build.
- Importer — 15/15 (`scripts/import-test.ts`): CSV edge cases + row mapping/validation.
- **Runtime HTTP smoke** — home/institution SSR, search API, and the full
  auth-gated review flow (401 → signup → 403 unverified → email verify → 201
  pending → 409 duplicate) all verified over HTTP against a live server + DB.
  Institution search matches acronyms via `aka` (search "IIT", "IITB", "BITS").

## Design principles

1. **Reviewer anonymity is structural**, not just a policy — identity never
   enters public responses.
2. **Verified badge without keeping the proof** — documents are transient.
3. **Balance + anti-defamation** built into the form and validation.
4. **Cold-start friendly** — factual institution layer is useful before reviews.
