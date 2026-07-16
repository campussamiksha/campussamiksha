-- ============================================================================
-- CampusSamiksha — Database Schema (PostgreSQL 14+)
-- Glassdoor-style review portal for Indian academic employers.
-- Reviewer categories covered: teaching faculty, non-teaching staff,
-- research scholars.
--
-- Design principles baked in:
--   * Reviewer anonymity: a review links to a user internally (for anti-spam
--     and moderation) but NEVER exposes user identity to the public/institution.
--   * Verified-employee badge WITHOUT retaining proof: verification_documents
--     rows are purged after review; only the badge on the review survives.
--   * Category-specific rating parameters via a master table (rating_parameters)
--     + scores table, so parameters can be added without schema changes.
--   * Institution factual layer is useful even before any reviews exist
--     (cold-start): NAAC/NIRF/UGC/AICTE data lives on the institution row.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";        -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy institution search

-- ---------------------------------------------------------------------------
-- ENUM TYPES  (small, stable value sets)
-- ---------------------------------------------------------------------------

CREATE TYPE reviewer_category AS ENUM (
    'teaching_faculty',
    'non_teaching_staff',
    'research_scholar'
);

CREATE TYPE employment_status AS ENUM (
    'current',
    'former'
);

CREATE TYPE employment_type AS ENUM (
    'permanent',            -- regular/tenured/pensionable
    'tenure_track',
    'contract',             -- fixed-term contractual
    'adhoc_guest',          -- ad-hoc / guest / visiting lecturer
    'visiting',
    'postdoc',
    'phd_scholar',          -- research scholar (PhD)
    'project_staff',        -- funded-project JRF/SRF/RA
    'other'
);

CREATE TYPE institution_type AS ENUM (
    'central_university',
    'state_university',
    'deemed_university',
    'private_university',
    'institute_of_national_importance',   -- IIT/IIM/IISER/NIT/IIIT/AIIMS etc.
    'autonomous_college',
    'affiliated_college',
    'research_institute',                 -- CSIR/ICMR/DAE labs etc.
    'other'
);

CREATE TYPE ownership_type AS ENUM (
    'government',
    'government_aided',
    'private_unaided',
    'autonomous',
    'trust_society'
);

CREATE TYPE moderation_status AS ENUM (
    'pending',      -- in moderation queue
    'published',
    'rejected',
    'flagged',      -- published but under review after a report
    'removed'       -- taken down (takedown/appeal)
);

CREATE TYPE verification_badge AS ENUM (
    'unverified',       -- email-only signup
    'email_verified',
    'employment_verified'   -- proof was reviewed then deleted
);

CREATE TYPE user_role AS ENUM (
    'member',
    'institution_rep',  -- claimed an institution profile
    'moderator',
    'admin'
);

CREATE TYPE user_status AS ENUM (
    'active',
    'suspended',
    'banned'
);

CREATE TYPE claim_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- ---------------------------------------------------------------------------
-- USERS  (reviewers, reps, staff) — identity kept private
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT UNIQUE NOT NULL,
    password_hash       TEXT,                 -- null if OAuth-only
    auth_provider       TEXT NOT NULL DEFAULT 'password',   -- password|google|...
    -- Public pseudonym shown next to reviews (optional). Real name NEVER stored
    -- as a requirement; anonymity is the default.
    display_handle      TEXT,
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    role                user_role NOT NULL DEFAULT 'member',
    status              user_status NOT NULL DEFAULT 'active',
    -- Highest verification the user has ever achieved (drives badge on reviews).
    max_badge           verification_badge NOT NULL DEFAULT 'unverified',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email verification tokens (magic-link style; deleted on use / expiry).
CREATE TABLE email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- INSTITUTIONS  (the employers being reviewed) + factual layer
-- ---------------------------------------------------------------------------

CREATE TABLE institutions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,          -- SEO url segment
    aka                 TEXT[],                        -- alternate names/acronyms
    type                institution_type NOT NULL,
    ownership           ownership_type,
    -- Affiliated colleges roll up to a parent university.
    parent_institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,

    established_year    SMALLINT,
    city                TEXT,
    state               TEXT,
    country             TEXT NOT NULL DEFAULT 'India',
    pincode             TEXT,
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    website             TEXT,
    logo_url            TEXT,
    description         TEXT,

    -- Accreditation / recognition (the value-adding factual layer).
    naac_grade          TEXT,          -- e.g. 'A++'
    naac_cgpa           NUMERIC(3,2),
    nirf_rank_overall   SMALLINT,
    nba_accredited      BOOLEAN,
    ugc_recognized      BOOLEAN,
    aicte_approved      BOOLEAN,
    pay_scale_type      TEXT,          -- '7th CPC / UGC scale' | 'management' | ...

    -- Claim / ownership by an institution representative.
    is_claimed          BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Cached aggregates (kept fresh by app/trigger; see institution_category_stats
    -- for the per-category breakdown).
    review_count        INTEGER NOT NULL DEFAULT 0,
    avg_overall         NUMERIC(3,2),
    recommend_pct       NUMERIC(5,2),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_institutions_name_trgm ON institutions USING gin (name gin_trgm_ops);
CREATE INDEX idx_institutions_state ON institutions (state);
CREATE INDEX idx_institutions_type ON institutions (type);
CREATE INDEX idx_institutions_parent ON institutions (parent_institution_id);

-- Optional normalized department reference (reviews may also store free text).
CREATE TABLE departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT UNIQUE NOT NULL           -- 'Computer Science', 'Administration', ...
);

-- ---------------------------------------------------------------------------
-- RATING PARAMETERS  (master list; which categories each applies to)
-- ---------------------------------------------------------------------------

CREATE TABLE rating_parameters (
    id                   SMALLINT PRIMARY KEY,      -- stable id, referenced in scores
    code                 TEXT UNIQUE NOT NULL,      -- machine key
    label                TEXT NOT NULL,             -- display label
    description          TEXT,
    -- Which reviewer categories are asked this parameter.
    applicable_categories reviewer_category[] NOT NULL,
    -- true = counts toward the headline/overall composite for that review.
    is_core              BOOLEAN NOT NULL DEFAULT TRUE,
    display_order        SMALLINT NOT NULL DEFAULT 0,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------------
-- REVIEWS  (one main review; ratings normalized into review_scores)
-- Anonymity: user_id is internal-only; public API exposes category/role/tenure.
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Reviewer context (shown publicly, but not identity).
    category            reviewer_category NOT NULL,
    emp_status          employment_status NOT NULL,
    emp_type            employment_type NOT NULL,
    designation         TEXT,                       -- 'Assistant Professor', 'Lab Assistant', 'JRF'
    department          TEXT,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    start_year          SMALLINT,
    end_year            SMALLINT,                   -- NULL if current

    -- Content (structured to force balance + limit defamation risk).
    title               TEXT NOT NULL,              -- headline
    pros                TEXT NOT NULL,
    cons                TEXT NOT NULL,
    advice_to_mgmt      TEXT,
    advice_to_candidate TEXT,
    overall_rating      SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    would_recommend     BOOLEAN,

    badge               verification_badge NOT NULL DEFAULT 'unverified',
    status              moderation_status NOT NULL DEFAULT 'pending',
    helpful_count       INTEGER NOT NULL DEFAULT 0,
    report_count        INTEGER NOT NULL DEFAULT 0,

    moderated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    moderated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (end_year IS NULL OR start_year IS NULL OR end_year >= start_year),
    -- One review per user per institution (edit instead of re-post) → anti-spam.
    CONSTRAINT uq_review_user_institution UNIQUE (institution_id, user_id)
);

CREATE INDEX idx_reviews_institution ON reviews (institution_id, status);
CREATE INDEX idx_reviews_category ON reviews (institution_id, category);
CREATE INDEX idx_reviews_status ON reviews (status);

-- Per-parameter star scores for a review (only params valid for its category).
CREATE TABLE review_scores (
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    parameter_id    SMALLINT NOT NULL REFERENCES rating_parameters(id),
    score           SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    PRIMARY KEY (review_id, parameter_id)
);

-- ---------------------------------------------------------------------------
-- SALARY REPORTS  (structured pay data points, separate from reviews)
-- ---------------------------------------------------------------------------

CREATE TABLE salary_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    category            reviewer_category NOT NULL,
    emp_type            employment_type NOT NULL,
    designation         TEXT,
    department          TEXT,
    years_experience    SMALLINT,
    pay_scale           TEXT,                       -- 'Academic Level 10 (7th CPC)'
    gross_monthly       NUMERIC(12,2),
    annual_ctc          NUMERIC(14,2),
    currency            TEXT NOT NULL DEFAULT 'INR',
    paid_on_time        BOOLEAN,                    -- salary punctuality signal
    badge               verification_badge NOT NULL DEFAULT 'unverified',
    status              moderation_status NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_institution ON salary_reports (institution_id, category);

-- ---------------------------------------------------------------------------
-- INTERVIEW REVIEWS  (hiring-process experiences)
-- ---------------------------------------------------------------------------

CREATE TABLE interview_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    category            reviewer_category NOT NULL,
    position_applied    TEXT,
    department          TEXT,
    outcome             TEXT,       -- offer|rejected|no_response|withdrew
    offer_accepted      BOOLEAN,
    difficulty          SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
    process_description TEXT,
    questions_asked     TEXT,
    status              moderation_status NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_institution ON interview_reviews (institution_id);

-- ---------------------------------------------------------------------------
-- INSTITUTION CLAIMS  (rep claims a profile) + OFFICIAL RESPONSES
-- ---------------------------------------------------------------------------

CREATE TABLE institution_claims (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    official_email      CITEXT NOT NULL,
    designation         TEXT,
    -- proof handled via verification_documents then deleted; only status kept.
    status              claim_status NOT NULL DEFAULT 'pending',
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (institution_id, user_id)
);

-- One official reply per review (right-of-reply / fairness + legal shield).
CREATE TABLE review_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id           UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    responder_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    body                TEXT NOT NULL,
    status              moderation_status NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ENGAGEMENT + MODERATION
-- ---------------------------------------------------------------------------

-- Helpfulness votes (one per user per review).
CREATE TABLE review_votes (
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful      BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (review_id, user_id)
);

-- Reports/flags on any content (drives moderation + IT-Rules takedown workflow).
CREATE TABLE content_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- polymorphic target: exactly one of the *_id columns is set.
    review_id           UUID REFERENCES reviews(id) ON DELETE CASCADE,
    salary_report_id    UUID REFERENCES salary_reports(id) ON DELETE CASCADE,
    interview_review_id UUID REFERENCES interview_reviews(id) ON DELETE CASCADE,
    reporter_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    reason              TEXT NOT NULL,   -- defamation|names_individual|fake|spam|abuse|other
    details             TEXT,
    resolved            BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(review_id, salary_report_id, interview_review_id) = 1)
);

-- Verification documents: reviewed then DELETED. Only badge outcome persists.
-- expires_at enforces retention limit; a purge job hard-deletes storage_ref.
CREATE TABLE verification_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id  UUID REFERENCES institutions(id) ON DELETE SET NULL,
    review_id       UUID REFERENCES reviews(id) ON DELETE SET NULL,
    doc_type        TEXT NOT NULL,   -- appointment_letter|payslip|id_card|institutional_email
    storage_ref     TEXT,            -- object-store key; NULLed on purge
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|purged
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail of moderator/admin actions.
CREATE TABLE moderation_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,          -- approve|reject|remove|restore|ban|...
    target_type     TEXT NOT NULL,          -- review|user|institution|...
    target_id       UUID NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- AGGREGATES  (per-institution, per-category, per-parameter averages)
-- Refresh from app on publish, or CONCURRENTLY on a schedule.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW institution_category_stats AS
SELECT
    r.institution_id,
    r.category,
    rs.parameter_id,
    ROUND(AVG(rs.score)::numeric, 2)          AS avg_score,
    COUNT(DISTINCT r.id)                        AS review_count
FROM reviews r
JOIN review_scores rs ON rs.review_id = r.id
WHERE r.status = 'published'
GROUP BY r.institution_id, r.category, rs.parameter_id;

CREATE UNIQUE INDEX idx_inst_cat_stats
    ON institution_category_stats (institution_id, category, parameter_id);
-- Refresh:  REFRESH MATERIALIZED VIEW CONCURRENTLY institution_category_stats;

-- ============================================================================
-- SEED: rating parameters
--   T = teaching_faculty, N = non_teaching_staff, R = research_scholar
-- ============================================================================

INSERT INTO rating_parameters (id, code, label, description, applicable_categories, is_core, display_order) VALUES
 -- Shared across all three categories -------------------------------------
 (1,  'compensation',        'Compensation & Benefits',       'Pay, allowances, benefits relative to role',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 10),
 (2,  'salary_punctuality',  'Salary / Stipend Punctuality',  'Is pay released on time and in full',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 20),
 (3,  'management_quality',   'Management & Administration',   'Transparency, fairness, competence of leadership',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 30),
 (4,  'work_life_balance',    'Work–Life Balance',             'Hours, weekend/admin load, flexibility',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 40),
 (5,  'infrastructure',       'Infrastructure & Facilities',   'Labs, library, internet, campus, quarters',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 50),
 (6,  'inclusion_safety',     'Inclusion & Harassment Safety', 'ICC functioning, gender/caste climate, safety',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 60),
 (7,  'job_security',         'Job Security',                  'Stability of employment / contract terms',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 70),
 (8,  'leave_time_off',       'Leave & Time Off',              'Maternity/paternity, casual & medical leave, vacations — generosity and how freely granted',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 80),
 (9,  'benefits_welfare',     'Benefits, Insurance & Welfare', 'Health insurance, PF/gratuity, medical facilities, childcare and other welfare',
        ARRAY['teaching_faculty','non_teaching_staff','research_scholar']::reviewer_category[], TRUE, 90),

 -- Teaching faculty specific ----------------------------------------------
 (20, 'teaching_workload',    'Teaching Workload',             'Contact hours, subjects, class sizes',
        ARRAY['teaching_faculty']::reviewer_category[], TRUE, 100),
 (21, 'research_support',     'Research Support & Freedom',    'Grants, seed money, freedom of direction',
        ARRAY['teaching_faculty']::reviewer_category[], TRUE, 110),
 (22, 'academic_freedom',     'Academic Freedom & Autonomy',   'Syllabus/grading/publication autonomy',
        ARRAY['teaching_faculty']::reviewer_category[], TRUE, 120),
 (23, 'career_growth',        'Career Growth & Promotion',     'Promotion fairness per UGC/AICTE norms',
        ARRAY['teaching_faculty']::reviewer_category[], TRUE, 130),
 (24, 'student_quality',      'Student Quality & Culture',     'Calibre and engagement of students',
        ARRAY['teaching_faculty']::reviewer_category[], FALSE, 140),

 -- Non-teaching staff specific --------------------------------------------
 (40, 'supervisor_support',   'Supervisor Support',            'Support and fairness from reporting officer',
        ARRAY['non_teaching_staff']::reviewer_category[], TRUE, 200),
 (41, 'workload_fairness',    'Workload Reasonableness',       'Reasonableness of duties and hours',
        ARRAY['non_teaching_staff']::reviewer_category[], TRUE, 210),
 (42, 'growth_training',      'Growth & Training',             'Skilling, training, advancement opportunity',
        ARRAY['non_teaching_staff']::reviewer_category[], TRUE, 220),
 (43, 'workplace_respect',    'Workplace Respect',             'Dignity/respect vs. faculty & management',
        ARRAY['non_teaching_staff']::reviewer_category[], TRUE, 230),
 (44, 'role_clarity',         'Role Clarity',                  'Clarity of responsibilities and expectations',
        ARRAY['non_teaching_staff']::reviewer_category[], FALSE, 240),

 -- Research scholar specific ----------------------------------------------
 (60, 'supervisor_guidance',  'Supervisor / Guide Quality',    'Mentorship, availability, fairness of guide',
        ARRAY['research_scholar']::reviewer_category[], TRUE, 300),
 (61, 'stipend_adequacy',     'Stipend Adequacy',              'Is the stipend adequate for cost of living',
        ARRAY['research_scholar']::reviewer_category[], TRUE, 310),
 (62, 'research_facilities',  'Research Infrastructure',       'Lab, equipment, compute, funding for work',
        ARRAY['research_scholar']::reviewer_category[], TRUE, 320),
 (63, 'research_freedom',     'Freedom in Research',           'Autonomy in problem choice and methods',
        ARRAY['research_scholar']::reviewer_category[], TRUE, 330),
 (64, 'publication_support',  'Publication & Conference Support','Support for papers, travel, funding',
        ARRAY['research_scholar']::reviewer_category[], TRUE, 340),
 (65, 'lab_culture',          'Lab / Group Culture',           'Collaboration, toxicity, peer environment',
        ARRAY['research_scholar']::reviewer_category[], FALSE, 350);
