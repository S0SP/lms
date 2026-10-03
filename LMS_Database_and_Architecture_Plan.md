# LMS Platform — Database, Architecture & Automation Plan
### Covering Admin, Educator, Learner (Student), and Parent apps

> **Source materials used:** `LMS_TRD_v2.0 (Next.js Edition)`, `LMS_Combined_PRD_v1.0`, `detailed_frontend_backend_prd.md`.
>
> **Important scoping note:** Both source documents explicitly mark the **Learner/Parent Portal as "Deferred / Separate PRD"** — the Admin and Educator portals are the only ones fully specified. Wherever this plan covers Learner/Parent app models, it is **extending the existing schema in the same style** (same naming, same Drizzle conventions) rather than quoting a spec that doesn't exist yet. Those sections are flagged **[Extension — confirm with product]** so you know what's contractually specified vs. what I've designed to fill the gap.

---

## 1. Drizzle Schema — File Layout

Matches the TRD's `/src/db/schema/*` convention, extended with the files needed for Learner/Parent surfaces and content/testing (referenced in PRD §26.3 but not broken into tables in the TRD).

```
src/db/
├── schema/
│   ├── orgs.ts            → orgs
│   ├── users.ts           → users, educator_profiles, learner_profiles, parent_profiles, device_tokens
│   ├── tags.ts             → tags, course_tags, educator_tags, learner_tags
│   ├── courses.ts          → courses, course_enrollments, course_educators, credits, course_bundles, course_bundle_items
│   ├── content.ts          → content_sections, content_resources, video_assets, file_assets           [NEW]
│   ├── testing.ts          → tests, test_questions, test_question_options, test_attempts, test_answers  [NEW]
│   ├── assessments.ts      → assessments, assessment_criteria, assessment_submissions, assessment_scores [NEW]
│   ├── timeline.ts         → timeline_posts, polls, poll_options, poll_responses, timeline_comments      [NEW]
│   ├── sessions.ts         → sessions, session_attendees, session_feedback, session_reports,
│   │                         confidential_feedback_educator, confidential_feedback_learner
│   ├── availability.ts     → availability_profiles, leaves, session_conflicts
│   ├── attendance.ts       → zoom_attendance (auto-populated by Zoom webhooks)
│   ├── payouts.ts          → payouts, payout_session_links
│   ├── reports.ts          → monthly_reports
│   ├── store.ts            → store_settings, course_selling_pages, coupons, payment_plans, course_reviews
│   ├── payments.ts         → payment_transactions                                                        [NEW]
│   ├── consultations.ts    → consultations
│   ├── calendar.ts         → google_oauth_tokens, google_calendar_tokens, google_calendar_channels
│   ├── notifications.ts    → notification_log, notification_preferences                                  [NEW pref table]
│   ├── email.ts            → email_log                                                                   [NEW]
│   ├── jobs.ts             → session_reminder_jobs (QStash message-id tracking)                          [NEW]
│   ├── chat.ts             → chat_threads, chat_members (Postgres mirror of Firestore membership — see §5) [NEW]
│   ├── certificates.ts     → certificates                                                                [NEW, Phase 2 per TRD]
│   └── index.ts            → re-exports all schemas
├── client.ts
└── migrations/
```

---

## 2. Table-by-Table Model (all 4 apps)

Types shown are Drizzle-flavoured (`pgTable`) shorthand. `FK→table` denotes a foreign key. Tables marked **(spec)** come directly from the TRD's Core Tables section; tables marked **[EXT]** are my extension to cover Learner/Parent/content features referenced only narratively in the PRD.

### 2.1 Identity & Org (`orgs.ts`, `users.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `orgs` **[EXT]** | `id`, `name`, `subdomain`, `created_at` | TRD tables all carry `org_id` — this is the tenant root, needed for multi-tenant safety even in single-org v1. |
| `users` **(spec)** | `id` (uuid PK), `email`, `phone`, `role` enum(`owner\|admin\|educator\|learner\|parent`), `password_hash`, `org_id` FK, `created_at` | Central table for **all four apps**. Phone is OTP-verified once, then immutable. `role` drives middleware route-guarding for `/admin/*`, `/educator/*`, `/learner/*`, `/parent/*`. |
| `educator_profiles` **(spec)** | `user_id` PK/FK→users, `tagline`, `about`, `youtube_url`, `payout_default_rate`, `payout_currency`, `calendar_connected`, `pin_hash`, `zoom_user_id` | 1:1 extension of `users`. `pin_hash` = 4-digit educator quick-access PIN (bcrypt). |
| `learner_profiles` **(spec, TRD left blank — filled in)** | `user_id` PK/FK→users, `display_name`, `dob`, `age`, `board`, `avatar_url`, `private_note` (**admin-only**), `created_at` | `private_note` must be excluded via `.omit({ privateNote: true })` on every non-admin query — see §6 Security. |
| `parent_profiles` **(spec)** | `id`, `user_id` FK→users (nullable — a parent may not have login credentials yet), `learner_id` FK→learner_profiles, `name`, `email`, `phone` | Supports the "+ Add parent" flow. One learner can have >1 parent row (mother + father); `user_id` becomes non-null once the parent activates a Parent-app login. |
| `device_tokens` **[EXT]** | `id`, `user_id` FK, `platform` enum(`ios\|android\|web`), `token`, `created_at` | For push notifications to Learner/Parent/Educator mobile apps (complements Firestore in-app notifications). |

### 2.2 Tags (`tags.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `tags` **(spec)** | `id`, `name`, `color_hex`, `org_id`, `category` enum(`core\|language\|curriculum\|custom`) | Used for Educator subject tags, Learner tags, and Course tags (Admin §2.4 Availability filter). |
| `course_tags`, `educator_tags`, `learner_tags` **[EXT]** | `tag_id` FK, `entity_id` FK | Join tables — many-to-many, needed because `tags` is shared across 3 entity types. |

### 2.3 Courses & Commerce (`courses.ts`, `store.ts`, `payments.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `courses` **(spec)** | `id`, `name`, `short_code`, `type` enum(`one_on_one\|group\|recorded`), `status` enum(`draft\|published\|archived`), `org_id`, `selling_page_json`, `cohort_max_learners` (group only), `created_at` | `selling_page_json` stores the full 7-step wizard payload (Details/Highlights/etc. per PRD §6). |
| `course_enrollments` **(spec)** | `id`, `course_id`, `learner_id`, `enrolled_at`, `status` enum(`active\|completed\|cancelled`) | M:M courses↔learners. This is the row the **Learner app "My Courses" list** reads. |
| `course_educators` **(spec)** | `id`, `course_id`, `educator_id`, `payout_rate_override` | Per-course payout override (PRD §6 Step 2). |
| `credits` **(spec)** | `id`, `course_id`, `learner_id`, `total`, `consumed`, `adjusted_by`, `adjusted_at` | `CHECK (consumed <= total)` at DB level; deduction wrapped in `db.transaction()`. Fractional (0.5) credits supported via `numeric(6,2)`. Negative balance is *rejected*, never silently allowed — triggers an Admin notification instead (see §7 automations). |
| `course_bundles`, `course_bundle_items` **[EXT]** | `id`, `name`, `price`, `org_id` / `bundle_id`, `course_id` | Backs PRD §7.2 "Bundles" tab on Group Courses. |
| `payment_plans` **[EXT]** | `id`, `course_id`, `type` enum(`per_session\|bundle\|subscription\|free`), `price`, `currency`, `credit_pack_size` | PRD §6 Step 3. |
| `course_selling_pages` **(spec, referenced)** | `id`, `course_id`, `hero_json`, `highlights_json`, `reviews_selected` (array of `course_review.id`) | Public-facing store page content, separate from the wizard's draft `selling_page_json` so publish/preview can diverge. |
| `coupons` **(spec)** | `id`, `course_id`, `code`, `discount_type` enum(`percent\|flat`), `amount`, `valid_from`, `valid_to`, `usage_limit`, `times_used` | PRD §6 Step 7. |
| `course_reviews` **[EXT]** | `id`, `course_id`, `learner_id`, `rating`, `body`, `is_public`, `created_at` | Backs the "Reviews" wizard step (select which to display) and the Learner-app "leave a review" flow. |
| `payment_transactions` **[EXT]** | `id`, `enrollment_id` FK, `provider` enum(`razorpay`), `provider_ref_id`, `amount`, `currency`, `coupon_id`, `status` enum(`created\|paid\|failed\|refunded`), `raw_payload_json`, `created_at` | Populated by the `POST /api/webhooks/razorpay` handler (TRD §3 payment webhook flow, PRD open item confirms Razorpay). |
| `store_settings` **(spec)** | `id`, `org_id`, `title`, `subtitle`, `bg_color`, `text_color`, `logo_url`, `cover_image_url`, `external_url` | Single row per org — Admin §1 Store Settings Hero. |
| `consultations` **(spec)** | `id`, `org_id`, `prospect_name`, `prospect_email`, `slot_at`, `status`, `converted_to_learner_id` | Discovery/trial booking → converts into a `learner_profiles` row. |

### 2.4 Content — Group & Recorded Courses (`content.ts`) **[EXT — PRD §7.3/§8.1/§26.3 narratively specify this; no table names given]**

| Table | Key Columns | Notes |
|---|---|---|
| `content_sections` | `id`, `course_id`, `title`, `sort_order` | Drag-to-reorder sections (PRD §26.3 "Add a section"). |
| `content_resources` | `id`, `section_id`, `type` enum(`video\|file\|test\|assessment\|poll\|youtube\|link\|embed\|chit_chat`), `title`, `sort_order`, `drip_release_at` (nullable), `access` enum(`free\|paid`), `created_at` | Polymorphic — `type` determines which sibling table (`video_assets`/`tests`/etc.) holds the payload. |
| `video_assets` | `id`, `resource_id`, `cloudflare_stream_uid`, `duration_seconds`, `thumbnail_url` | Cloudflare Stream-backed. |
| `file_assets` | `id`, `resource_id`, `r2_key`, `file_type`, `size_bytes` | Cloudflare R2-backed (PDFs, slides). |
| `learner_content_progress` | `id`, `resource_id` FK, `learner_id` FK, `progress_pct`, `last_position_seconds` (video), `completed_at` | Drives the Learner-app "% completion" bar (PRD §8.1) and feeds course-level progress in `course_enrollments`. |

### 2.5 Testing & Assessment (`testing.ts`, `assessments.ts`) **[EXT — from PRD §26.3.1/§26.3.2]**

| Table | Key Columns | Notes |
|---|---|---|
| `tests` | `id`, `resource_id` FK, `name`, `status` enum(`draft\|published`), `shuffle_options` bool, `negative_marking` numeric | Test Builder header. |
| `test_questions` | `id`, `test_id`, `body_richtext`, `type` enum(`single_correct\|multi_correct\|number\|fill_blank\|ranking\|match\|poll\|long_answer`), `time_limit_seconds`, `sort_order` | |
| `test_question_options` | `id`, `question_id`, `body`, `is_correct`, `sort_order` | |
| `test_attempts` | `id`, `test_id`, `learner_id`, `started_at`, `submitted_at`, `auto_score` | Auto-graded on submit for objective question types. |
| `test_answers` | `id`, `attempt_id`, `question_id`, `answer_json` | Stores whatever shape the question type needs (option ids / text / ranking order). |
| `assessments` | `id`, `resource_id` FK, `title`, `description`, `starts_on`, `ends_on`, `max_marks`, `rubric_enabled` bool | Rubric-graded, not auto-graded (PRD §26.3.2). |
| `assessment_criteria` | `id`, `assessment_id`, `name`, `max_marks`, `sort_order` | Sum of criteria ≤ `max_marks` (validated in app layer). |
| `assessment_submissions` | `id`, `assessment_id`, `learner_id`, `submitted_at`, `file_r2_keys` (array), `total_score`, `graded_by`, `graded_at` | |
| `assessment_scores` | `id`, `submission_id`, `criterion_id`, `marks_awarded`, `comment` | Per-criterion grading breakdown. |

### 2.6 Timeline / Polls (`timeline.ts`) — from PRD §26.1–26.2

| Table | Key Columns | Notes |
|---|---|---|
| `timeline_posts` | `id`, `course_id`, `author_id` FK→users, `body_richtext`, `comments_disabled` bool, `created_at` | Class activity feed — visible to all enrolled learners. |
| `polls` | `id`, `post_id` FK, `is_quiz_mode` bool, `show_results_immediately` bool, `ended_at` | |
| `poll_options` | `id`, `poll_id`, `body`, `is_correct` (quiz mode only), `sort_order` | |
| `poll_responses` | `id`, `option_id`, `learner_id`, `created_at` | Live response % is `COUNT(*) GROUP BY option_id`. |
| `timeline_comments` | `id`, `post_id`, `author_id`, `body`, `created_at` | Disabled if parent post has `comments_disabled = true`. |

### 2.7 Sessions & Feedback (`sessions.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `sessions` **(spec)** | `id`, `course_id`, `educator_id`, `scheduled_at` (timestamptz), `duration_min`, `status` enum(`scheduled\|live\|completed\|cancelled\|no_show`), `zoom_meeting_id`, `zoom_meeting_url`, `credits_consumed`, `hosted_by` enum(`admin\|educator\|learner_self_book`), `actual_start_at`, `actual_end_at` | `zoom_meeting_id` is the join key for the Zoom webhook engine (§7). |
| `session_attendees` **[EXT]** | `id`, `session_id`, `learner_id` | Needed for **group courses**, where one session has many learners (spec's `sessions` table alone assumes 1:1 style scoping via `course_enrollments`; this join table makes per-learner attendance/feedback explicit for cohorts). |
| `session_feedback` **(spec)** | `id`, `session_id`, `educator_id`, `status`, `credits_consumed`, `topics_covered`, `comments`, `submitted_at` | Operational record — visible to learner once submitted (PRD §26 "Session Feedback Form"). |
| `session_reports` **(spec)** | `id`, `session_id`, `learner_id`, `ai_draft`, `edited_content`, `published_at`, `published_by` | AI-drafted, educator-edited, learner sees only after publish. |
| `confidential_feedback_educator` **(spec)** | `id`, `session_id`, `educator_id`, `learner_id`, `content`, `created_at` | **Admin-only.** Never joined into educator/learner queries. |
| `confidential_feedback_learner` **(spec)** | `id`, `session_id`, `learner_id`, `educator_id`, `content`, `created_at` | **Admin-only**, mirror of above. |
| `session_reminder_jobs` **[EXT]** | `id`, `session_id`, `qstash_message_id`, `type` enum(`t_minus_1h\|t_minus_10m\|t_plus_3m_not_started`), `sent_at` | Tracks the 3 QStash-scheduled jobs per session so they can be cancelled/rescheduled if the session time changes (critical — see §8). |

### 2.8 Availability & Conflicts (`availability.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `availability_profiles` **(spec)** | `id`, `educator_id`, `name`, `is_default`, `timezone`, `schedule_json`, `overrides_json` | |
| `leaves` **(spec)** | `id`, `educator_id`, `type` enum(`full\|partial`), `start_date`, `end_date`, `start_time`, `end_time`, `reason` | Single-day leave requires `start_date = end_date` (PRD §20 rule). |
| `session_conflicts` **(spec)** | `id`, `session_id`, `conflict_source` enum(`leave\|google\|lms_overlap`), `details_json`, `resolved_at` | Surfaced as a warning; **never auto-cancels** the session. |

### 2.9 Attendance (`attendance.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `zoom_attendance` **(spec)** | `id`, `session_id`, `user_id` (nullable if unmatched), `role` enum(`educator\|learner`), `event` enum(`joined\|left`), `zoom_participant_id`, `event_at`, `duration_seconds` | One row per join/leave event — fully covered in §9 below. |

### 2.10 Payouts (`payouts.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `payouts` **(spec, TRD left blank — filled in)** | `id`, `educator_id` FK, `cycle_period` (e.g. `2026-08`), `amount`, `currency`, `status` enum(`in_review\|approved\|paid\|rejected`), `payout_date`, `created_at` | Read-only to educators; Admin transitions status. |
| `payout_session_links` **[EXT]** | `id`, `payout_id` FK, `session_id` FK, `rate_applied`, `credits_or_hours` | Line-item breakdown so the Educator Payouts "Ledger" tab can show exactly which sessions built up the total. |

### 2.11 Monthly Reports (`reports.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `monthly_reports` **(spec)** | `id`, `learner_id`, `course_id`, `month_year` (date), `sections_json`, `status` enum(`draft\|sent`), `sent_at` | AI-generated via Claude Haiku, admin-edited, **cannot be unsent** once `status = sent`. |

### 2.12 Calendar (`calendar.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `google_oauth_tokens` **(spec)** | `id`, `user_id`, `access_token_enc`, `refresh_token_enc`, `expiry` | Generic SSO login tokens (distinct from calendar-sync tokens below). |
| `google_calendar_tokens` **(spec)** | `id`, `educator_id`, `access_token_enc`, `refresh_token_enc`, `expiry` | AES-256-GCM encrypted at rest. Per-educator calendar sync. |
| `google_calendar_channels` **(spec)** | `id`, `educator_id`, `channel_id`, `resource_id`, `token_uuid`, `expiry`, `calendar_id` | Renewed via daily QStash cron before expiry. |

### 2.13 Notifications & Email (`notifications.ts`, `email.ts`)

| Table | Key Columns | Notes |
|---|---|---|
| `notification_log` **(spec)** | `id`, `user_id`, `type`, `payload_json`, `read_at`, `created_at` | Persistent audit log; **live delivery is via Firestore**, this table is the durable record + fallback for push/email fan-out. |
| `notification_preferences` **[EXT]** | `id`, `user_id`, `channel` enum(`in_app\|email\|whatsapp\|push`), `type`, `enabled` | Lets Learner/Parent/Educator opt in/out per notification type per channel. |
| `email_log` **[EXT]** | `id`, `to_user_id`, `template`, `related_session_id` (nullable), `resend_message_id`, `status` enum(`queued\|sent\|delivered\|bounced\|failed`), `sent_at` | Every Resend send is logged here — needed for support/debugging "did the reminder email actually go out."|

### 2.14 Chat metadata mirror (`chat.ts`) **[EXT]**

| Table | Key Columns | Notes |
|---|---|---|
| `chat_threads` | `id`, `course_id` (nullable for admin-initiated direct chats), `firestore_chat_id`, `type` enum(`course_group\|direct`), `created_at` | Postgres doesn't hold messages (Firestore does), but mirrors thread existence + `member_ids` so **Route Handlers can validate membership with a relational query** before writing to Firestore (TRD §5 Rule 3 enforcement). |
| `chat_members` | `id`, `thread_id`, `user_id`, `added_at` | Source of truth checked before adding to Firestore's `member_ids` array. |

### 2.15 Certificates (`certificates.ts`) **[EXT, Phase 2 per TRD roadmap item #4 — schema staged now]**

| Table | Key Columns | Notes |
|---|---|---|
| `certificates` | `id`, `enrollment_id` FK, `template_id`, `issued_at`, `pdf_r2_key`, `verification_code` | Flagged "Needs spec" in TRD — table shape is a placeholder to unblock the join in the ER diagram; don't build the issuing flow until PRD confirms the design. |

---

## 3. ER Diagram

A full Mermaid ER diagram covering every table above (with primary attributes on the highest-traffic entities) has been generated as a separate file: **`lms_er_diagram.mermaid`**. Open it as a Mermaid artifact to view the rendered diagram — it's too dense to usefully inline as an image here, but every relationship in §2 is represented in it, including:

- Identity chain: `orgs → users → {educator_profiles | learner_profiles | parent_profiles}`
- Commerce chain: `courses → course_enrollments/course_educators/credits → payment_transactions/coupons`
- Content chain: `courses → content_sections → content_resources → {video_assets|file_assets|tests|assessments}`
- Session chain: `sessions → zoom_attendance / session_feedback / session_reports / confidential_feedback_* / session_conflicts`
- Payout chain: `educator_profiles → payouts → payout_session_links → sessions`
- The two **confidentiality boundaries** (confidential feedback tables, private notes) are visually isolated with no edges into educator/learner-facing tables, matching TRD §5 Rule 1/2.

---

## 4. Which app reads/writes which tables

| Table group | Admin | Educator | Learner (Student) | Parent |
|---|:---:|:---:|:---:|:---:|
| `users`, own profile | CRUD (all) | R/W own | R/W own | R/W own |
| `learner_profiles.private_note` | R/W | ❌ never | ❌ never | ❌ never |
| `confidential_feedback_*` | R/W | ❌ never | ❌ never | ❌ never |
| `courses`, `content_*`, `tests`, `assessments` | CRUD | CRUD (own courses only) | Read published only | Read published only (view child's) |
| `sessions` | CRUD (all) | CRUD (own, via `course_educators` filter) | Read own (via `session_attendees`/`course_enrollments`) | Read child's |
| `session_feedback`, `session_reports` | R/W | Write (own sessions) | Read (published only) | Read (child's, published only) |
| `credits`, `payment_transactions` | CRUD | Read (own course balance, no edit) | Read own | Read child's |
| `payouts` | CRUD (status transitions) | Read-only own | ❌ n/a | ❌ n/a |
| `monthly_reports` | CRUD, send | Read (if co-authoring, optional) | Read (sent only) | Read (sent only, child's) |
| `zoom_attendance` | Read (all, admin review) | Read (own sessions) | Read own | Read child's |
| `chat_threads`/Firestore | Full oversight | Scoped to own course members | Scoped to own chats | Scoped to child's chats (if enabled) |

This table is the basis for every Drizzle query's `WHERE` scoping clause and for Firestore Security Rules.

---

## 5. Deployment Services (Hosting Topology)

Matches the TRD's free-tier-optimised stack, confirmed provider-per-layer:

| Layer | Service | Why |
|---|---|---|
| Frontend + API (Next.js Route Handlers) | **Vercel** | Single deploy for RSC pages + `/api/*` backend, since Admin/Educator/Learner/Parent are all routes in one Next.js app (`/admin/*`, `/educator/*`, `/learner/*`, `/parent/*`, `/store/*`). Hobby free for dev; **Pro ($20/mo) required at first paying customer.** |
| PostgreSQL | **Neon** | Serverless Postgres, HTTP driver (`@neondatabase/serverless`) avoids connection-pool exhaustion on serverless cold starts. Free tier: 512MB / 0.5 CU-hr. |
| Real-time (chat + notifications) | **Firebase Firestore** (Spark free tier) | Vercel is stateless — can't run WebSocket servers, so live chat/notifications live in Firestore instead. |
| Background jobs / cron | **Upstash QStash** | HTTP-based scheduler; the only way to do delayed/scheduled work from stateless serverless functions. |
| Rate limiting | **Upstash Redis** | Needed alongside QStash for API rate limiting (login attempts, search endpoint). |
| File storage | **Cloudflare R2** | S3-compatible, zero egress fees, 10GB free. Client uploads directly via pre-signed PUT URLs — backend never proxies bytes. |
| Video hosting | **Cloudflare Stream** | Adaptive-bitrate video for Recorded Courses; pay-per-use, no free tier but cheap at low volume. |
| Transactional email | **Resend** | 3,000 free emails/mo; used for the scheduling/reminder emails detailed in §8. |
| AI (progress reports) | **Anthropic API** (Claude Haiku) | Pay-per-use; called from `/api/cron/run-ai-report` (via QStash, to dodge Vercel's 10s handler limit). |
| Auth | **Auth.js v5 (NextAuth)**, self-hosted in-app | httpOnly encrypted session cookies; Credentials + Google OAuth providers. |
| CDN | **Vercel Edge Network** | Static assets, ISR pages (public course store). |

**Scaling triggers to plan for (from TRD §14):** Vercel Pro at first paying user; Neon Launch plan ($19/mo) past ~400 users / 512MB; Resend Pro ($20/mo) past 3,000 emails/mo; R2 overage at $0.015/GB past 10GB video/file storage.

---

## 6. Third-Party Services Needed (full list, by function)

| Function | Service | Integration point |
|---|---|---|
| Auth / SSO | Google OAuth2 | Auth.js provider |
| Payments | **Razorpay** (confirmed in PRD open item; INR-first) | `POST /api/webhooks/razorpay`, HMAC-verified, updates `payment_transactions`/`credits`/`course_enrollments` |
| Payouts disbursement (optional Phase 2) | Razorpay Payouts API or manual bank transfer | Flagged as open item #8 in TRD — decide before building the "Paid" status auto-transfer |
| Video conferencing + auto attendance | **Zoom** (Server-to-Server OAuth) | Webhook engine — see §9 |
| Calendar sync | **Google Calendar API** (`googleapis`, `google-auth-library`) | 2-way sync per educator, webhook-driven |
| Real-time chat/notifications | **Firebase** (Firestore + Admin SDK) | Auth-bridged via custom tokens from Auth.js session |
| Email | **Resend** | All transactional email (§8) |
| WhatsApp notifications | **Resend/WhatsApp Business API webhook** (Phase 2, per TRD roadmap — not yet in Phase 1 scope) | Educator invite + optional reminder channel |
| Scheduled/delayed jobs | **Upstash QStash** | Cron + delay-based messages |
| Rate limiting | **Upstash Redis** | Sliding-window limiter middleware |
| Object storage | **Cloudflare R2** | Avatars, course assets, materials, chat files, assessment uploads, report PDFs |
| Video hosting | **Cloudflare Stream** | Recorded course video |
| AI generation | **Anthropic API** (Claude Haiku) | Monthly/session progress reports |
| Search | **PostgreSQL full-text search** (tsvector + GIN index) — no external service needed | Global Ctrl+K search |

---

## 7. Automated Backend Engines — Full List (webhook + cron opportunities)

Beyond what's explicitly in the TRD, here's every place webhooks/cron can (and per the docs, should) remove manual work — organized as "specified" vs "recommended addition":

### Specified in TRD (already covered above)
1. **Zoom webhook** → automated attendance (§9 below, full detail)
2. **Google Calendar webhook** (`x-goog-channel-token` validated) → 2-way session sync + conflict detection
3. **Razorpay webhook** → payment/credit/enrollment updates
4. **QStash cron: `renew-calendar-channels`** (daily 02:00 UTC) → renews Google Calendar watch channels before they expire
5. **QStash cron: `payout-cycle`** (monthly) → generates payout ledger summary
6. **QStash cron: `generate-monthly-reports`** (monthly) → triggers AI report drafting queue
7. **QStash delayed jobs: `session-reminder`** (T-1h, T-10m) and **`session-not-started`** (T+3m) → see §8

### Recommended additions (natural extensions of the same pattern)
8. **Credit low-balance alert** (already named in TRD as a Route-Handler-triggered QStash publish, not a cron) — fires the moment a `credits.consumed` update brings balance below a configurable threshold (e.g. <2 sessions remaining), notifying Admin + Learner/Parent.
9. **No-show auto-detection**: a QStash job scheduled at `session.scheduled_at + duration_min + 15min` checks `zoom_attendance` for the learner; if absent, auto-flags `session.status = no_show` pending educator confirmation (this closes the loop the TRD describes as a "Derived Value" but doesn't schedule automatically).
10. **Educator invite expiry reminder**: if an educator invite (`POST /api/v1/educators/invite`) isn't accepted in 48h, a QStash job resends it once, then flags Admin.
11. **Leave/availability conflict digest**: a nightly QStash job batches new `session_conflicts` rows into a single digest email/notification per educator instead of one email per conflict.
12. **Coupon expiry / low-usage alert**: cron checks `coupons.valid_to` and `usage_limit - times_used`, notifies Admin near expiry so campaigns don't silently lapse.
13. **Google Calendar OAuth token refresh failure alert**: if a token refresh fails (revoked access), notify the educator to reconnect — otherwise sync silently stops.
14. **Assessment grading SLA reminder**: if `assessment_submissions.graded_at` is still null 72h after `submitted_at`, remind the educator.
15. **Drip-content release**: instead of a per-resource cron, compute `drip_release_at <= now()` lazily at read-time in the Learner API (cheaper than a scheduled job — flagging here so it's *not* over-engineered into unnecessary cron jobs).
16. **Certificate issuance** (Phase 2, once spec'd): on `course_enrollments.status = completed`, trigger certificate PDF generation + email.

---

## 8. Automated Email Triggers — Session Scheduling & Reminders

This is the flow the TRD names but doesn't fully thread end-to-end — here's the complete lifecycle:

### 8.1 On session creation/reschedule (`POST/PATCH /api/v1/sessions/`)
Route Handler, in the same transaction as the session write:
1. Insert/update the `sessions` row (creates the Zoom meeting first, stores `zoom_meeting_id`/`zoom_meeting_url`).
2. **Cancel any existing `session_reminder_jobs` for this session** (critical if this is a *reschedule* — otherwise stale reminders fire at the old time). Call QStash's delete-message API using the stored `qstash_message_id`.
3. Publish 3 new QStash delayed messages, each targeting a `/api/cron/*` endpoint, and record each returned `message_id` into `session_reminder_jobs`:
   - `session-reminder` @ `scheduled_at - 1h`
   - `session-reminder` @ `scheduled_at - 10m`
   - `session-not-started` @ `scheduled_at + 3m`
4. Fire an **immediate "session scheduled" email** (not delayed) via Resend to:
   - **Learner** (or **Parent**, if the learner is a minor and parent-contact preference is set) — "Your session with {educator} is confirmed for {date/time}, join link: {zoom_url}"
   - **Educator** — "New session booked with {learner} on {date/time}"
   - **Admin** — logged/batched (not necessarily an individual email per session — see 8.4)
5. Every send is logged to `email_log` with `template` and `related_session_id`.

### 8.2 QStash → `POST /api/cron/session-reminder` (fires twice: T-1h, T-10m)
- Validates `Upstash-Signature`.
- Loads the session; if `status` is no longer `scheduled` (e.g. cancelled), no-op.
- Sends Resend email + Firestore notification to **Learner/Parent** and **Educator** with join link and countdown.
- Logs to `email_log` and `notification_log`.

### 8.3 QStash → `POST /api/cron/session-not-started` (T+3m)
- Checks `zoom_attendance` for a `meeting.started` event / host `joined` row.
- If the educator hasn't joined: email + urgent notification to **Educator** and an **Admin alert** ("Session with {learner} hasn't started, 3 minutes late").
- If neither party joined: soft-flag for the no-show automation in §7 item 9.

### 8.4 Admin visibility (not necessarily 1:1 email per event)
Per PRD §2.2, the Admin Bell icon already aggregates: new enrolments, session reminders, cancellations, low credits, chats, reports, payments. Reminder/scheduling emails to Admin should be **digested** (e.g. one email per hour listing sessions in that reminder window) rather than one email per session, to avoid inbox flooding — the in-app Firestore notification stays real-time and per-event, but the *email* channel should batch. This is a `notification_preferences`-driven decision, not hardcoded.

### 8.5 Templates needed in Resend
`session_scheduled`, `session_reminder_1h`, `session_reminder_10m`, `session_not_started_alert`, `low_credit_alert`, `educator_invite`, `learner_welcome`, `payout_processed`, `monthly_report_sent`, `session_cancelled`, `session_conflict_digest`.

---

## 9. Zoom Webhook — Automated Attendance (full detail)

### 9.1 Setup
Server-to-Server OAuth app in Zoom Marketplace (account-level, no per-user consent needed) → event subscriptions for `meeting.started`, `meeting.ended`, `meeting.participant_joined`, `meeting.participant_left`, `meeting.participant_admitted`, and (for group courses run as webinars) `webinar.participant_joined`/`webinar.participant_left`. Webhook URL: `POST /api/webhooks/zoom`. Store `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET` in Vercel env.

### 9.2 Security (every request, before touching the DB)
1. Construct `v0:{timestamp}:{raw_body}`.
2. HMAC-SHA256 with `ZOOM_WEBHOOK_SECRET`, constant-time compare against `x-zm-signature`.
3. Reject if `x-zm-request-timestamp` is >5 minutes old (replay protection).
4. Respond `200 OK` within 3 seconds (Zoom's hard requirement) — acknowledge first, do heavy DB writes after via a background task/queue, not inline.

### 9.3 Event → DB write mapping

| Zoom Event | Action | Write |
|---|---|---|
| `meeting.started` | `sessions.status = 'live'` | `UPDATE sessions SET status='live', actual_start_at=now() WHERE zoom_meeting_id={id}` |
| `meeting.ended` | `sessions.status = 'completed'` (pending educator feedback) | `UPDATE sessions SET status='completed', actual_end_at=now() WHERE zoom_meeting_id={id}` |
| `meeting.participant_joined` | Record attendance start | `INSERT INTO zoom_attendance(session_id, user_id, role, event='joined', zoom_participant_id, event_at)` |
| `meeting.participant_left` | Record attendance end, compute duration | `INSERT INTO zoom_attendance(..., event='left', duration_seconds = now()-joined_at)` |
| `meeting.participant_admitted` | Audit only (waiting room) | Log only, no session-status change |
| `webinar.participant_joined/left` | Same pattern, group courses | Same table, matched via `zoom_webinar_id` |

### 9.4 User matching
- Primary: `zoom_participant.email` → `users.email`.
- Fallback: fuzzy match on display name → `users.display_name`, logged for admin review either way if confidence is low.
- Unmatched: insert with `user_id = null`, surfaced in an **Admin Review** queue (a filtered view of `zoom_attendance WHERE user_id IS NULL`).
- Host identification: `zoom_meeting_host_id` matched against `educator_profiles.zoom_user_id`.

### 9.5 Derived, read-only computed values (no extra table — computed at query time)

| Value | Computation |
|---|---|
| Educator attended | `EXISTS zoom_attendance WHERE role='educator' AND event='joined'` |
| Learner attended | Same check, `role='learner'` |
| Learner join time | `MIN(event_at) WHERE event='joined' AND role='learner'` |
| Total time in session | `SUM(duration_seconds) WHERE role='learner'` |
| Late join flag | `join_event_at > session.scheduled_at + interval '10 minutes'` |
| No-show (auto) | No `learner` rows after `session.ended` → feeds automation §7.9 |

### 9.6 Session auto-creation (the other half of the loop)
When an educator schedules a session, the Route Handler calls `POST /v2/users/{zoom_user_id}/meetings` **before** committing the `sessions` row, so `zoom_meeting_id`/`zoom_meeting_url` are stored atomically with the session. The educator connects their own Zoom account via OAuth in Educator Settings — no extra Zoom cost to the platform operator since each educator uses their own Zoom plan.

---

## 10. Security & Confidentiality Enforcement (recap, mapped to schema)

| Rule | Table(s) | Enforcement |
|---|---|---|
| Educator/learner post-session confidential feedback never leaks | `confidential_feedback_educator`, `confidential_feedback_learner` | Never joined in educator/learner query builders; admin-only route handlers only |
| Admin private notes never exposed | `learner_profiles.private_note` | Drizzle `.omit({ privateNote: true })` on every non-admin `SELECT` |
| Educators scoped to own courses | `sessions`, `courses`, `content_*` | Every query includes `AND course_educators.educator_id = session.user.id` |
| Chat scoping | `chat_threads`/`chat_members` (Postgres) mirrored into Firestore `member_ids` | Route Handler checks `course_educators` before adding to Firestore array; Firestore Rules re-enforce `auth.uid in member_ids` |
| Parent visibility limited to own child | `parent_profiles.learner_id` | All Parent-app queries join through `parent_profiles.learner_id = learner_profiles.user_id`, scoped exactly like the Educator scoping pattern |

---

## Open Items to Confirm Before Build (carried over from source docs + new ones from this extension)

1. **Learner/Parent Portal spec** — a real, separate PRD is referenced but not provided. Section 2.4–2.6, 2.13 (parent bits), and the Learner/Parent columns in §4 are my best-practice extension, not confirmed spec.
2. Payment gateway — PRD leaves it open between Razorpay/Stripe; this plan assumes **Razorpay** per the TRD's webhook naming (`/api/webhooks/razorpay`) — confirm before building payout disbursement.
3. Test Builder "Advanced Options" exact field set (negative marking, time limits, shuffle) — flagged as unconfirmed in PRD; schema above uses best-guess field names.
4. Certificate Builder — explicitly "needs spec" in TRD; table staged but not built.
5. WhatsApp notifications — Phase 2 per TRD roadmap; `notification_preferences.channel` includes it so the schema won't need a breaking migration when it lands.
