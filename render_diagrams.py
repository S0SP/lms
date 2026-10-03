import os
import json
import base64
import urllib.request

os.makedirs('doc_diagrams', exist_ok=True)

diagrams = {
    'flow_arch': """flowchart TD
    Client[Browser / Client Components] -->|HTTP / JSON| Middleware[Next.js Auth & RBAC Middleware]
    Middleware -->|Authorized Session| API[App Router API Endpoints: /api/v1/*]
    API -->|Validate Payload| Zod[Zod Schema Validators]
    Zod -->|Parsed Data| Service[Service Layer: sessionService, courseService, etc.]
    Service -->|Atomic Transactions| Repo[Repository Layer: Drizzle db.transaction]
    Repo -->|SQL Queries| DB[(Neon PostgreSQL Database)]
    Service -.->|Background Sync| Integrations[Zoom OAuth, Google Calendar, QStash, Nodemailer]
""",
    'erd_core': """erDiagram
    orgs ||--o{ users : "tenancy"
    orgs ||--o{ courses : "owns"
    orgs ||--o{ consultations : "receives"
    
    users ||--o| educator_profiles : "educator_data"
    users ||--o| learner_profiles : "learner_data"
    users ||--o{ parent_profiles : "parent_of"
    
    courses ||--o{ course_educators : "assigned_to"
    users ||--o{ course_educators : "teaches"
    courses ||--o{ course_enrollments : "has_students"
    users ||--o{ course_enrollments : "enrolls"
    
    courses ||--o{ credits : "course_credit_pool"
    users ||--o{ credits : "learner_balance"
    
    courses ||--o{ content_sections : "curriculum_modules"
    content_sections ||--o{ content_resources : "resources"
    content_resources ||--o| assessments : "homework"
    content_resources ||--o| tests : "quizzes"
    
    assessments ||--o{ assessment_submissions : "submitted_work"
    users ||--o{ assessment_submissions : "submits"
    
    courses ||--o{ sessions : "scheduled_classes"
    users ||--o{ sessions : "conducted_by"
    sessions ||--o{ session_attendees : "booked_students"
    users ||--o{ session_attendees : "attends"
    sessions ||--o| session_feedback : "post_class_log"
    
    courses ||--o{ monthly_reports : "progress_eval"
    users ||--o{ monthly_reports : "evaluated_student"
    users ||--o{ monthly_reports : "sent_by_educator"
""",
    'flow_session': """sequenceDiagram
    autonumber
    actor Admin as Admin / Educator
    participant App as Session Service
    participant Zoom as Zoom OAuth API
    participant DB as Neon PostgreSQL
    actor Learner as Student / Parent
    
    Admin->>App: Schedule Session (courseId, educatorId, scheduledAt, learnerIds)
    App->>Zoom: Create Meeting Request (Server-to-Server OAuth)
    Zoom-->>App: Meeting ID & Join URL
    App->>DB: INSERT into sessions & session_attendees (status = 'scheduled')
    DB-->>App: Session Record Created
    App-->>Admin: Confirmation & Calendar Event Synced
    
    Note over Admin,Learner: Class Takes Place via Zoom
    
    Admin->>App: Submit Session Feedback (topicsCovered, homework, creditsConsumed = 1.0)
    App->>DB: BEGIN TRANSACTION
    App->>DB: INSERT into session_feedback
    App->>DB: UPDATE sessions SET status = 'completed'
    App->>DB: UPDATE credits SET consumed = consumed + 1.0 WHERE courseId & learnerId
    App->>DB: COMMIT TRANSACTION
    DB-->>App: Transaction Success
    App-->>Admin: Session Finalized
    App-->>Learner: Updated Remaining Balance in Dashboard
""",
    'flow_assignment': """sequenceDiagram
    autonumber
    actor Educator as Educator / Admin
    participant Service as Assessment Service
    participant S3 as Cloudflare R2 / S3
    participant DB as Neon PostgreSQL
    actor Student as Student (Learner)
    
    Educator->>Service: Create Assignment (sectionId, title, maxMarks=100, endsOn)
    Service->>DB: INSERT content_resources & assessments
    DB-->>Educator: Assignment Published in Course Workspace
    
    Student->>S3: Upload Homework Solution PDF (via Presigned URL)
    S3-->>Student: R2 Storage Key (uploads/homework_sol.pdf)
    Student->>Service: Submit Assignment (fileR2Keys, assessmentId)
    Service->>DB: INSERT assessment_submissions & UPDATE learner_content_progress (50%)
    DB-->>Student: Submission Acknowledged
    
    Educator->>Service: Grade Submission (submissionId, totalScore=94, feedback)
    Service->>DB: UPDATE assessment_submissions (score, gradedBy, feedback)
    Service->>DB: UPDATE learner_content_progress (100% complete)
    DB-->>Educator: Submission Graded
    Service-->>Student: Realtime Grade & Feedback Visible in Portal
""",
    'flow_report': """sequenceDiagram
    autonumber
    actor Admin as Admin / Educator
    participant Repo as Report Repository
    participant AI as Anthropic Claude API
    participant DB as Neon PostgreSQL
    participant SMTP as Nodemailer SMTP
    actor Parent as Parent & Student
    
    Admin->>Repo: Trigger Report Generation (learnerId, courseId, monthYear)
    Repo->>DB: Query Session History, Attendance, Quiz Scores & Feedback Logs
    DB-->>Repo: Student Monthly Performance Context
    Repo->>AI: Prompt Claude Sonnet with Structured JSON Rubric
    AI-->>Repo: Generated Headline, Summary, Mastery Scores & Strengths
    Repo->>DB: UPSERT monthly_reports (status = 'draft', sections_json)
    DB-->>Admin: Draft Ready for Human Review in Portal
    
    Admin->>Repo: Review, Edit Remarks & Click 'Send Report'
    Repo->>DB: UPDATE monthly_reports SET status = 'sent', sentAt = NOW()
    Repo->>DB: Query Recipient Emails (Student + Linked Parents)
    DB-->>Repo: Emails Retrieved
    Repo->>SMTP: Dispatch Rendered HTML Progress Report Email
    SMTP-->>Parent: Progress Report Delivered to Inbox
"""
}

for name, code in diagrams.items():
    obj = {'code': code, 'mermaid': {'theme': 'default'}}
    b64 = base64.urlsafe_b64encode(json.dumps(obj).encode('utf-8')).decode('ascii')
    url = f'https://mermaid.ink/img/{b64}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req, timeout=15)
        out_file = f'doc_diagrams/{name}.png'
        with open(out_file, 'wb') as f:
            f.write(res.read())
        print(f'Rendered {name} -> {out_file} (size: {os.path.getsize(out_file)} bytes)')
    except Exception as e:
        print(f'Failed {name}: {e}')
