# LMS Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve all 17 architectural and functional defects identified in the LMS Production Readiness Deep Audit across the Super Admin, Educator, Learner, and Parent portals, connecting mocked UI elements to real database records and API endpoints.

**Architecture:** Build and wire Next.js 15 App Router endpoints, Drizzle ORM queries, and client components using strict TypeScript, Zod validations, and proper role-based authentication. Implement end-to-end payment order creation/verification, parent-learner linkage, session feedback email dispatch, video progress sync, educator statement exports, and settings tabs for integrations.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Drizzle ORM, PostgreSQL (Neon), Tailwind CSS, Razorpay/Stripe, Lucide React, Nodemailer.

---

### Task 1: Auto-Enrollment Schema Fix in 1-on-1 Session Scheduling [CRITICAL: A-02]

**Files:**
- Modify: `src/app/admin/courses/1-on-1/[id]/schedule/ScheduleSessionsClient.tsx:375-390`

**Step 1: Check existing auto-enroll logic**
Currently, `ScheduleSessionsClient.tsx` calls `POST /api/v1/credits` with body `{ courseId, learnerId, amount: 0, type: 'credit', reason: '...' }`, triggering a 400 Bad Request on `adjustCreditSchema`.

**Step 2: Update implementation**
Replace the `/api/v1/credits` call with the correct course enrollment endpoint:
```typescript
// Auto-enroll learner in course if not already enrolled
const isLearnerEnrolled = course?.learners?.some((l: any) => l.id === learnerId);
if (!isLearnerEnrolled && learnerId && courseId) {
  await fetch(`/api/v1/courses/${courseId}/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId }),
  }).catch((err) => console.error('Failed to auto-enroll learner:', err));
}
```

**Step 3: Verification**
Verify that adding a learner during session scheduling calls `POST /api/v1/courses/[id]/enrollments` with `{ learnerId }` and succeeds.

---

### Task 2: Parent Portal - Child Linking via Invite Code / Email [CRITICAL: P-04]

**Files:**
- Modify: `src/app/api/v1/user/parent-linking/route.ts`
- Modify: `src/components/parent/modals/AddLearnerModal.tsx`

**Step 1: Update parent-linking route to support parent caller linking a learner**
Update `src/app/api/v1/user/parent-linking/route.ts`:
- Support caller role `parent` (in addition to `learner` linking a parent).
- When caller is `parent`: accept `inviteCode` (which can be a learner ID, PIN, or learner email).
- Find learner in `users` where `role = 'learner'` matching the code or email.
- Insert or update `parentProfiles` linking `userId = session.user.id` and `learnerId = learner.id`.

**Step 2: Wire AddLearnerModal state & submission**
In `src/components/parent/modals/AddLearnerModal.tsx`:
- Add `inviteCode` state, `loading`, `error`, and `success` feedback states.
- Attach `onClick={handleLinkLearner}` to the "Link Learner" button.
- On success, invoke `onClose()` and refresh parent dashboard / linked children.

---

### Task 3: Parent Portal - Book Consultation Modal Activation [CRITICAL: P-02]

**Files:**
- Modify: `src/components/parent/modals/BookConsultationModal.tsx`

**Step 1: Add controlled form state**
In `src/components/parent/modals/BookConsultationModal.tsx`:
- Add state for `childName`, `subject`, `date`, `time`, `notes`, `submitting`, and `error`.
- Load child options or allow custom prospect name/email from parent profile session.

**Step 2: Connect form submit to `POST /api/v1/consultations`**
- On submit, call `POST /api/v1/consultations` with `{ prospectName, prospectEmail, courseId, slotAt, notes }`.
- Display loading spinner while submitting, handle errors gracefully, and close modal upon success.

---

### Task 4: Real Payment Gateway Order Creation & Verification [CRITICAL: P-01, HIGH: S-01, HIGH: P-06]

**Files:**
- Create: `src/app/api/v1/payments/create-order/route.ts`
- Create: `src/app/api/v1/payments/verify/route.ts`
- Modify: `src/components/parent/modals/CheckoutModal.tsx`
- Modify: `src/app/student/fees/page.tsx`
- Modify: `src/app/parent/fees/page.tsx`

**Step 1: Build `/api/v1/payments/create-order` endpoint**
- Authenticate caller (learner, parent, admin).
- Accept `{ amount, currency, courseId?, enrollmentId?, purpose }`.
- Create a Razorpay order via Razorpay API (or mock/fallback response if API keys are in test mode).
- Record transaction record in `paymentTransactions` with status `'created'`.
- Return `{ orderId, amount, currency, keyId }`.

**Step 2: Build `/api/v1/payments/verify` endpoint**
- Verify Razorpay HMAC signature (`razorpay_order_id|razorpay_payment_id`).
- Update `paymentTransactions` status to `'paid'` and record `providerRefId`.
- If top-up credits or course enrollment, update `credits` or `courseEnrollments`.

**Step 3: Update `CheckoutModal.tsx`**
- Add state for payment method, loading, error, and success.
- Integrate Razorpay script loader (`checkout.js`) with fallback card confirmation.
- On click "Pay", call `/api/v1/payments/create-order`, open Razorpay checkout (or simulate test capture), call `/api/v1/payments/verify`, and update UI.

**Step 4: Connect Student & Parent Fees Pages**
- In `src/app/student/fees/page.tsx`: add a "Pay Outstanding Balance" / "Add Credits" button opening checkout.
- In `src/app/parent/fees/page.tsx`: add "Top Up Credits" button opening checkout.

---

### Task 5: Session Details Modal - Attendance & Feedback Schema Fix [HIGH: A-03]

**Files:**
- Modify: `src/components/courses/1on1/SessionDetailsModal.tsx`
- Modify: `src/app/api/v1/sessions/[id]/attendance/route.ts` (or verify existing attendance route)

**Step 1: Fix Attendance buttons**
- Add an interactive attendance drawer/modal state or inline attendance status toggling in `SessionDetailsModal.tsx`.
- Connect "View" and "Edit" attendance buttons to manage learner attendance status (Present, Absent, Late).

**Step 2: Fix Educator Feedback endpoint call**
- In `handleSaveFeedback`: replace `PATCH /api/v1/sessions/${session.id}` with `POST /api/v1/sessions/${session.id}/feedback`.
- Send proper schema payload: `{ comments: feedbackText, topicsCovered: session.title, homeworkAssigned: '' }`.
- Refresh session data upon submission.

---

### Task 6: Educator Payouts - Statement Export & Clean Empty Chart [HIGH: E-01]

**Files:**
- Create: `src/app/api/v1/educator/payouts/export/route.ts`
- Modify: `src/app/educator/payouts/page.tsx`

**Step 1: Create CSV statement export endpoint**
- In `src/app/api/v1/educator/payouts/export/route.ts`:
  - Fetch educator's payouts and session delivery records.
  - Generate a formatted CSV file: Period, Sessions Delivered, Hourly Rate, Total Amount, Status.
  - Return `Content-Type: text/csv` with `Content-Disposition: attachment; filename="payout-statement.csv"`.

**Step 2: Update Educator Payouts Page**
- Replace `alert('Exporting monthly statement...')` with real download from `/api/v1/educator/payouts/export` (or client-side CSV trigger).
- In the Earnings Chart component: when `payouts.length === 0`, do NOT fall back to fake array `[12, 18, 14, 20, 22, 19]`. Render a clean zero-data state or empty activity card.

---

### Task 7: Video Content Watch Progress Synchronization [HIGH: S-02]

**Files:**
- Create: `src/app/api/v1/courses/[id]/progress/route.ts`
- Modify: `src/components/course/CourseWorkspaceClient.tsx`

**Step 1: Build Course Progress endpoint**
- In `src/app/api/v1/courses/[id]/progress/route.ts`:
  - Enforce learner auth.
  - Accept `{ resourceId, progressPct, lastPositionSeconds, completed }`.
  - Upsert record in `learnerContentProgress` (`progressPct`, `lastPositionSeconds`, `completedAt`).

**Step 2: Wire Video Player & Debounced Progress in `CourseWorkspaceClient.tsx`**
- When clicking a video resource, open a video player modal or inline player.
- Attach `onTimeUpdate` to sync progress every 15 seconds and on video completion (`onEnded`).

---

### Task 8: Parent Feedback & Notification Preferences Modals [HIGH: P-03, MEDIUM: P-05]

**Files:**
- Modify: `src/components/parent/modals/FeedbackModal.tsx`
- Modify: `src/components/parent/modals/NotificationPreferencesModal.tsx`
- Create/Verify: `src/app/api/v1/parent/feedback/route.ts` or general feedback route

**Step 1: Wire FeedbackModal.tsx**
- Add state for `feedbackText` and submission status.
- Wire `Submit Feedback` button to `POST /api/v1/feedback` or `POST /api/v1/sessions/[id]/feedback` with parent role and star rating.

**Step 2: Wire NotificationPreferencesModal.tsx**
- Add state for notification channels (Email, SMS, WhatsApp).
- Hook `Save Preferences` button to `PATCH /api/v1/user/profile` or user preferences endpoint to persist choices.

---

### Task 9: Multi-Question AI Session Quiz Persistence [MEDIUM: AI-01]

**Files:**
- Modify: `src/app/api/v1/sessions/[id]/ai/route.ts`

**Step 1: Persist all 3 generated questions**
- Currently, line 188 only takes `questions[0]` as a timeline poll and drops questions 1 and 2.
- Update `src/app/api/v1/sessions/[id]/ai/route.ts` to:
  - Create a test/quiz row in `tests` table linked to the course.
  - Insert all questions (1, 2, and 3) into `testQuestions` with their options and correct answers.
  - Post the primary question to the timeline as before, but return the full quiz ID and all questions.

---

### Task 10: Feedback Email Notification Dispatch [MEDIUM: EM-01]

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/services/sessionService.ts`

**Step 1: Add feedback notification email template in `src/lib/email.ts`**
- Create `sendSessionFeedbackNotification({ to, recipientName, sessionTitle, courseName, educatorName, comments })`.

**Step 2: Trigger email dispatch in `sessionService.submitSessionFeedback`**
- After feedback record is created and credits deducted, fetch session attendees (learners and linked parents).
- Dispatch the notification email to the learners and parents.

---

### Task 11: Admin Settings Integrations, Payments & Webhooks Tabs [HIGH: A-01]

**Files:**
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`

**Step 1: Expand AdminSettingsPage with dedicated tabs**
- Handle query parameter `tab=integrations`, `tab=payments`, and `tab=webhooks`.
- Add tab navigation:
  - **Organisation & Profile** (`#organisation`)
  - **Storefront & Branding** (`#storefront`)
  - **Integrations** (`#integrations`: Google Calendar client secrets, Zoom Server-to-Server OAuth status)
  - **Payment Gateways** (`#payments`: Razorpay Key ID / Key Secret, Stripe API keys)
  - **Webhooks** (`#webhooks`: Zoom webhook endpoint, Razorpay webhook endpoint & signature secret status)
  - **Activity Log** (`#activity`)

---

### Task 12: Admin Course Workspace Routing & Storefront Actions [MEDIUM: A-04, MEDIUM: A-05]

**Files:**
- Create: `src/app/admin/courses/[id]/page.tsx`
- Modify: `src/app/admin/courses/page.tsx`
- Modify: `src/app/admin/courses/group/page.tsx`
- Modify: `src/app/admin/courses/recorded/page.tsx`
- Modify: `src/app/admin/store/page.tsx`

**Step 1: Admin Course Workspace**
- Create `src/app/admin/courses/[id]/page.tsx` rendering the course workspace client in Admin context (with admin navigation headers).
- Update links in `courses/page.tsx`, `courses/group/page.tsx`, and `courses/recorded/page.tsx` to point to `/admin/courses/${course.id}` instead of `/educator/courses/${course.id}`.

**Step 2: Admin Storefront Card Controls**
- Add action controls to course cards in `src/app/admin/store/page.tsx`:
  - Quick toggle button for status: `Draft` <-> `Published` via `PATCH /api/v1/courses/[id]`.
  - Link to course selling page editor.

---

### Task 13: Educator Schedule Conflict Resolution Action [MEDIUM: E-02]

**Files:**
- Create: `src/app/api/v1/sessions/[id]/resolve-conflict/route.ts`
- Modify: `src/app/educator/conflicts/page.tsx`

**Step 1: Conflict resolution API**
- Implement `POST /api/v1/sessions/[id]/resolve-conflict`:
  - Accept `{ action: 'reschedule' | 'dismiss', shiftMinutes?: number, newTime?: string }`.
  - If reschedule: update session `scheduledAt` and notify attendees.
  - If dismiss: mark conflict resolved/acknowledged.

**Step 2: Connect Conflict Actions in UI**
- Add "Reschedule" and "Dismiss" buttons on conflict cards in `conflicts/page.tsx` hooked to the resolution route.

---

### Task 14: Learner Quiz Heartbeat & State Resilience [MEDIUM: S-03]

**Files:**
- Modify: `src/components/course/modals/StudentQuizModal.tsx`
- Modify: `src/services/quizService.ts` / `src/app/api/v1/quizzes/[id]/attempts/route.ts`

**Step 1: Save quiz answers and elapsed time periodically**
- When starting/resuming an attempt, calculate remaining time using `attempt.startedAt + timeLimitSeconds - now`.
- Save in-progress answers on answer selection or every 30 seconds so page refresh does not lose student progress.

---

### Task 15: AddLearnerModal Hobbies Field Persistence [LOW: A-06]

**Files:**
- Modify: `src/validators/learnerValidator.ts`
- Modify: `src/components/admin/AddLearnerModal.tsx`
- Modify: `src/repositories/learnerRepository.ts`

**Step 1: Update schema & repository**
- Add `hobbies: z.array(z.string()).optional()` to `createLearnerSchema`.
- In `AddLearnerModal.tsx`: send `hobbies: hobbies ? hobbies.split(',').map(s => s.trim()).filter(Boolean) : undefined` in POST payload.
- In `learnerRepository.ts`: persist hobbies as tags or in learner profile metadata.

---

## Plan Summary & Execution Handoff
All 17 audit items are mapped to 15 modular, end-to-end tasks organized by priority.
