# CampusSamiksha — Entity-Relationship Diagram

Renders anywhere Mermaid is supported (GitHub, VS Code with a Mermaid extension,
Obsidian, etc.). Mirrors [`prisma/schema.prisma`](../prisma/schema.prisma) and
[`db/schema.sql`](../db/schema.sql).

```mermaid
erDiagram
    users ||--o{ reviews : writes
    users ||--o{ salary_reports : submits
    users ||--o{ interview_reviews : submits
    users ||--o{ review_votes : casts
    users ||--o{ institution_claims : files

    institutions ||--o{ reviews : receives
    institutions ||--o{ salary_reports : receives
    institutions ||--o{ interview_reviews : receives
    institutions ||--o{ institution_claims : "claimed via"
    institutions ||--o{ institutions : "parent of (affiliated)"

    reviews ||--o{ review_scores : has
    reviews ||--o| review_responses : "answered by"
    reviews ||--o{ review_votes : "voted on"
    rating_parameters ||--o{ review_scores : scored_as
    departments ||--o{ reviews : "tagged in"

    reviews ||--o{ content_reports : "reported via"
    salary_reports ||--o{ content_reports : "reported via"
    interview_reviews ||--o{ content_reports : "reported via"

    users {
        uuid id PK
        citext email UK
        enum role
        enum max_badge "unverified|email|employment"
        enum status
    }

    institutions {
        uuid id PK
        text slug UK
        enum type
        enum ownership
        uuid parent_institution_id FK
        text naac_grade
        int  nirf_rank_overall
        bool ugc_recognized
        int  review_count "cached"
        numeric avg_overall "cached"
    }

    rating_parameters {
        smallint id PK
        text code UK
        enum_array applicable_categories "which reviewer types"
        bool is_core
    }

    reviews {
        uuid id PK
        uuid institution_id FK
        uuid user_id FK "internal-only, never public"
        enum category "faculty|staff|scholar"
        enum emp_status "current|former"
        enum emp_type
        text title
        text pros
        text cons
        smallint overall_rating
        enum badge
        enum status "pending|published|..."
    }

    review_scores {
        uuid review_id PK,FK
        smallint parameter_id PK,FK
        smallint score "1-5"
    }

    review_responses {
        uuid id PK
        uuid review_id UK,FK "one reply per review"
        uuid institution_id FK
        text body
    }

    salary_reports {
        uuid id PK
        uuid institution_id FK
        enum category
        numeric gross_monthly
        bool paid_on_time
    }

    interview_reviews {
        uuid id PK
        uuid institution_id FK
        text outcome
        smallint difficulty
    }

    institution_claims {
        uuid id PK
        uuid institution_id FK
        uuid user_id FK
        enum status
    }

    verification_documents {
        uuid id PK
        uuid user_id FK
        text storage_ref "NULLed after purge"
        timestamptz expires_at "retention limit"
    }

    content_reports {
        uuid id PK
        text reason
        bool resolved
    }

    review_votes {
        uuid review_id PK,FK
        uuid user_id PK,FK
        bool is_helpful
    }

    departments {
        uuid id PK
        text name UK
    }

    moderation_log {
        uuid id PK
        text action
        text target_type
        uuid target_id
    }
```

## Reading the model

- **One review, many parameter scores.** `reviews` holds the prose + overall
  star; `review_scores` holds the per-parameter 1–5 stars. `rating_parameters`
  declares *which reviewer categories* each parameter applies to via
  `applicable_categories`, so the same tables serve faculty, staff and scholars
  without per-type columns.
- **Anonymity boundary.** `reviews.user_id` exists only for anti-spam and
  moderation. It must never cross into any public/institution-facing response.
- **Verification without retention.** `verification_documents` is transient —
  a purge job clears `storage_ref` after `expires_at`; the durable outcome is
  the `badge` on `users`/`reviews`.
- **Fairness + legal.** `review_responses` gives each institution one official
  reply per review; `content_reports` + `moderation_log` back the IT-Rules
  notice-and-takedown workflow.
- **Cold-start.** The factual columns on `institutions` (NAAC/NIRF/UGC/AICTE)
  make profiles useful and SEO-indexable before any review exists.
