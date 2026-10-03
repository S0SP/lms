# Comprehensive Full-Stack PRD & Architecture Mapping

This document provides an exhaustive, minute-detail mapping of the LMS Platform's PRD (v1.0) and TRD (v2.0). It links exact frontend paths, detailed UI/UX rules, and modal specifications directly to the backend API routes, database functions, Real-time services, and Security boundaries required to support them.

---

## 1. Authentication & Platform Entry
**Frontend Paths:**
- `src/app/(auth)/login/` (Educator/Admin)
- `src/app/(auth)/register/`
- `src/app/(auth)/google/callback/`
- `src/app/store/` (Public Storefront)

**Detailed Frontend Requirements:**
- **Credentials Login:** Email + Password. Educator quick-access 4-digit PIN verification flow.
- **SSO:** Google OAuth2 single-sign-on.
- **Store Settings Hero:** Customisable title, subtitle, bg color, text color, logo, cover image.

**Backend Implementation (TRD):**
- **NextAuth (Auth.js v5):** Implements sessions via encrypted `httpOnly` Secure cookies. 
- **API Routes:** `/api/auth/callback/credentials`, `/api/auth/callback/google`
- **DB (Drizzle):** `users` table for lookup. `google_oauth_tokens` for SSO. Argon2id for password hashing. bcrypt for educator PIN hashes.
- **Store API:** `GET /api/v1/store/settings`, `GET /api/v1/store/courses` (filtering `status = 'published'`).

---

## 2. Admin Portal (`/admin/*`)

### 2.1 Admin Dashboard
**Frontend Path:** `src/app/admin/dashboard/`
- **Features:** Quick-action tiles (Create Course, Add Users, Explore). Real-time KPIs (Active Users, Total Revenue).
- **Backend:** `GET /api/v1/analytics/overview`.

### 2.2 Global Search & Notifications
**Frontend Layout:** Top Navigation Bar
- **Global Search (Ctrl+K):** Searches Learners (name, email, phone), Courses (name, short-code, subject), and Educators (name, email, tag). Typeahead dropdown < 300ms.
- **Admin Notifications (Bell Icon):** Alerts for new enrolments, session reminders, cancellations, low credits, chats, reports, and payments.
- **Backend:** 
  - `GET /api/v1/search?q=` with PostgreSQL Full-Text Search (tsvector GIN index).
  - Notifications via Firebase Firestore (`notifications/{userId}/items/{notifId}`) with `onSnapshot` listener.

### 2.3 Calendar (Unified Admin View)
**Frontend Path:** `src/app/admin/calendar/`
- **Minute Details:** 
  - Unified view of ALL sessions.
  - Session Tile: Time, learner first name, course short-code, status icon (✓/✗), distinct color per educator/course.
  - Overflow indicator (`+3 more`) for >10 sessions/day.
  - Warning indicators for sessions booked outside educator availability.
- **Backend:** 
  - `GET /api/v1/calendar/` unified query spanning `sessions` joined with `courses` and `users`.
  - **Google Calendar Sync:** `POST /api/webhooks/google-calendar` webhook handler validates `x-goog-channel-token` and auto-updates the `sessions` table.

### 2.4 Availability Management
**Frontend Path:** `src/app/admin/availability/`
- **Minute Details:** 
  - Multi-select Tag filter (Core: Maths, Science; Languages; Curriculum: IB, IGCSE). Tags are color-coded.
  - Displays free/busy blocks. Integrates real-time Google Calendar data if connected, otherwise falls back to recurring schedule profiles.
- **Backend:** 
  - `GET /api/v1/availability/` (queries `availability_profiles` and `leaves`).
  - Google Calendar integration via `googleapis` SDK.

### 2.5 1-On-1 Personalised Courses
**Frontend Path:** `src/app/admin/courses/one-on-one/`
- **Minute Details:**
  - **Credits System:** Tracks consumed vs total (e.g., 3/24). Supports fractional credits (0.5). Negative balances trigger Admin Notification (no silent acceptance). Atomic deduction on completion.
  - **Templates Tab:** Name, Educators, Created on, ⋮ menu (activate to course).
  - **7-Step Wizard:** 
    1. Details: Name, description, URL slug, tags, thumbnail, board.
    2. Educators: Search existing or inline-add new. Set per-course payout rate overrides.
    3. Payment Plans: Per-session, bundle, sub, free. Currency (INR default).
    4. Scheduling: Default duration, recurring/on-demand, admin vs self-booked.
    5. Highlights: Outcome bullets via rich text.
    6. Reviews: Select existing reviews for public display.
    7. Coupons: % or flat amount, validity, usage limits.
- **Backend:** 
  - `GET/POST /api/v1/courses/one-on-one/`
  - `PATCH /api/v1/courses/one-on-one/{id}` (updates `selling_page_json`).
  - **DB Check:** `credits` table deduction requires `db.transaction()` with `CHECK (consumed <= total)`.

### 2.6 Group & Recorded Courses
**Frontend Paths:** `src/app/admin/courses/group/` | `src/app/admin/courses/recorded/`
- **Group:** Cohort size configuration, shared scheduling, shared content library.
- **Recorded:** Video uploads, PDF/Quizzes, Drip release scheduling, Learner progress % tracking.
- **Backend:** 
  - File/Video Uploads: `POST /api/v1/uploads/presigned-url` returns Cloudflare R2 presigned PUT URL. Video uses Cloudflare Stream APIs.

### 2.7 Users (Learners & Educators)
**Frontend Paths:** `src/app/admin/users/learners/` | `/educators/`
- **Add Learner Modal:** 
  - Required: Name, Email. Optional: Phone, tags.
  - Expandable Registration: Age, DOB. Parent: Name, Email, Phone.
  - Expandable Admin Only: **Private Note** (never exposed to learners).
- **Learner Profile (4 Tabs):** Private Note, Additional Files, Billing, Registration.
- **Add Educator Modal:** 
  - Required: Name, Email. Optional: Phone, Subject tags, Payout Amount per Session Credit.
  - Triggers email/WhatsApp invite.
- **Backend:** 
  - `POST /api/v1/learners/`, `POST /api/v1/educators/invite`.
  - Learner lookup queries use `.omit({ privateNote: true })` automatically on non-admin routes.
  - WhatsApp integration via Resend/Webhooks.

### 2.8 Progress Reports (AI)
**Frontend Path:** `src/app/admin/reports/`
- **Features:** Month label, learner avatar, course short-code. "Generated by AI" badge. Admin edit before sending. "Sent" cannot be unsent.
- **Backend:** 
  - `POST /api/v1/reports/generate` triggers Anthropic Claude (Haiku) via `anthropic` SDK.
  - Due to Vercel free-tier 10s limits, uses Upstash QStash async queue: Route handler publishes to QStash -> QStash calls `POST /api/cron/run-ai-report` -> executes and saves to DB.

### 2.9 Admin Chats
**Frontend Layout:** Chat Icon -> Chat Panel
- **Features:** Group chats auto-created per course (Educator + Learners + Admin). Admins can initiate direct chats with *anyone*. File attachments (PDF/img). "Join chat to send a message" enforcement.
- **Backend:** 
  - Firebase Firestore Collections: `chats/{chatId}/messages/{messageId}`.
  - **Firebase Auth Bridge:** `POST /api/v1/firebase-token` grants Custom Token. Admin custom claim `role='admin'` bypasses `member_ids` access checks.

---

## 3. Educator Portal (`/educator/*`)

### 3.1 Course Workspace (The core engine)
**Frontend Path:** `src/app/educator/courses/`
- **Tab: Home:** Course roster, session list, credit balance.
  - **Session Feedback Form:** Triggered via "+ Add feedback". This is the operational record (topics covered) visible to learners.
- **Tab: Timeline:** Class activity feed, announcements.
  - **Add Poll/Quiz Modal:** Live response % updates. "End Poll" action. Post-level "disable comments" toggle.
- **Tab: Content:** Persistent material.
  - **Test Builder & Assessment Builder:** Rubric-graded submissions (essays, spoken). Not auto-graded.
- **Backend:** 
  - `GET /api/v1/courses/` **Critical Filter:** All queries MUST enforce `AND course_educators.educator_id = session.user.id`.
  - Real-time Timeline updates via Firestore or standard DB with optimistic UI.

### 3.2 Educator Calendar & Sessions
**Frontend Path:** `src/app/educator/calendar/`
- **Features:** Read-mostly unified view. Current-time indicator line. Admin-overridden sessions flagged as exceptions.
- **Session Auto-Creation:** Scheduling a session automatically creates a Zoom Meeting.
- **Backend:** 
  - `GET /api/v1/sessions/` scoped to educator ID.
  - Zoom S2S OAuth: `/v2/users/{educator_zoom_user_id}/meetings` -> Saves `zoom_meeting_url` in DB.

### 3.3 Availability & Session Conflicts
**Frontend Path:** `src/app/educator/availability/` | `/conflicts/`
- **Availability Tabs:** Recurring Schedule, Leaves (Single-day requires same Start/End date), Calendar Settings.
- **Conflicts Rules:** A conflict (Admin override inside Leave, Google Calendar overlap, double LMS booking) is a surfaced warning requiring manual resolution, it does NOT auto-cancel.
- **Backend:** `POST /api/v1/availability/leaves/`, reads from `session_conflicts` table.

### 3.4 Payouts Ledger
**Frontend Path:** `src/app/educator/payouts/`
- **Tabs:** Overview, Course, Payouts (Ledger).
- **Ledger Details:** Cycle/period, amount (INR), status (Paid / In Review / Rejected), linked sessions, payout date. READ-ONLY for educators.
- **Backend:** `GET /api/v1/payouts/` scoped to `educator_id`.

---

## 4. Automated Backend Engines (TRD v2.0)

### 4.1 Zoom Webhook Attendance Engine
- **Purpose:** Replaces manual check-ins.
- **API Route:** `POST /api/webhooks/zoom`
- **Logic / Security:**
  1. Validate `x-zm-signature` HMAC-SHA256 via `ZOOM_WEBHOOK_SECRET`.
  2. Reject if timestamp is > 5 minutes old (replay attack protection).
  3. Listen for `meeting.participant_joined` and `meeting.participant_left`.
  4. Match `zoom_participant.email` to `users.email`. If unmatched, log `zoom_attendance` with `user_id = null` for Admin Review.
  5. Calculate `duration_seconds = now() - joined_at`.

### 4.2 Upstash QStash Cron Engine
- **Purpose:** Replaces Celery/Redis for background jobs due to Vercel stateless environment.
- **Endpoints & Validation:** `POST /api/cron/*` endpoints strictly validate `Upstash-Signature` header via `@upstash/qstash` SDK.
- **Jobs:**
  - `POST /api/cron/session-reminder` (1 hour & 10 mins before).
  - `POST /api/cron/session-not-started` (T+3 mins).
  - `POST /api/cron/renew-calendar-channels` (Daily at 02:00 UTC for Google Calendar Webhooks).
  - `POST /api/cron/payout-cycle` (Monthly summary).

---

## 5. Critical Confidentiality & Security Boundaries
*This is the most critical requirement mapping for backend implementation.*

- **Rule 1 (Data Segregation):** Educator-about-learner and Learner-about-educator post-session feedback (Steps 5 & 6 of the feedback loop) MUST NEVER leak. 
  - **Backend Enforcement:** The `confidential_feedback_educator` and `confidential_feedback_learner` tables are explicitly omitted/never joined in any educator or learner API queries. Admin-only endpoints exclusively handle this.
- **Rule 2 (Private Notes):** Admin Private Notes on learner profiles.
  - **Backend Enforcement:** Drizzle `.omit({ privateNote: true })` on all non-admin `SELECT` queries of `learner_profiles`.
- **Rule 3 (Chat Scoping):** Educators cannot initiate or view chats with learners outside their assigned courses.
  - **Backend Enforcement:** The Route Handler responsible for generating chats verifies `course_educators` relationship before adding users to the Firestore `member_ids` array. Firestore Rules strictly enforce `auth.uid in resource.data.member_ids`.
