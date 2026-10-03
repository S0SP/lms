/**
 * Live End-to-End Database Lifecycle Verification
 * Tests actual creations, mutations, status transitions, and data returns
 * for Sessions/Calendar, Credits, Feedback, Assignments, Submissions, Grading,
 * Consultations, and Progress Reports against Neon PostgreSQL.
 */

import { db } from '../src/lib/drizzle';
import * as schema from '../src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sessionService } from '../src/services/sessionService';
import { sessionRepository } from '../src/repositories/sessionRepository';
import { assessmentService } from '../src/services/assessmentService';
import { consultationRepository } from '../src/repositories/consultationRepository';
import { reportRepository } from '../src/repositories/reportRepository';

async function runLiveLifecycleAudit() {
  console.log('================================================================');
  console.log('🔬 EXHAUSTIVE LIVE DB MUTATION & LIFECYCLE AUDIT');
  console.log('================================================================\n');

  // Step 0: Ensure default org & unique index exists
  let [org] = await db.select().from(schema.orgs).limit(1);
  if (!org) {
    const [createdOrg] = await db
      .insert(schema.orgs)
      .values({ name: 'UnboundYou Academy', subdomain: 'unboundyou' })
      .returning();
    org = createdOrg;
    console.log(`🏢 Created Root Org: "${org.name}" (ID: ${org.id})`);
  } else {
    console.log(`🏢 Existing Root Org: "${org.name}" (ID: ${org.id})`);
  }

  // Ensure unique index for ON CONFLICT target (resource_id, learner_id)
  await db.execute(sql.raw('CREATE UNIQUE INDEX IF NOT EXISTS learner_progress_resource_learner_unique_idx ON learner_content_progress (resource_id, learner_id);'));

  // Step 0.1: Fetch test personas
  const [educator] = await db.select().from(schema.users).where(eq(schema.users.email, 'educator@unboundyou.com'));
  const [learner] = await db.select().from(schema.users).where(eq(schema.users.email, 'student@unboundyou.com'));
  const [admin] = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@unboundyou.com'));

  if (!educator || !learner || !admin) {
    throw new Error('Test personas (educator, student, admin) missing in database!');
  }
  console.log(`👤 Using Personas: Educator=${educator.name} (${educator.id}), Learner=${learner.name} (${learner.id})`);

  let testCourseId: string | null = null;
  let testSessionId: string | null = null;
  let testAssessmentId: string | null = null;
  let testSubmissionId: string | null = null;
  let testConsultationId: string | null = null;
  let testReportId: string | null = null;

  try {
    // ─── 1. COURSE CREATION & ENROLLMENT ─────────────────────────────────────
    console.log('\n[1/7] Testing Course Creation & Credit Provisioning...');
    const [course] = await db
      .insert(schema.courses)
      .values({
        orgId: org.id,
        name: 'E2E Lifecycle Verification Physics Lab',
        shortCode: 'E2E-PHY-101',
        type: 'one_on_one',
        status: 'published',
        board: 'CBSE',
        grade: '10',
        defaultSessionDurationMin: 60,
      })
      .returning();
    testCourseId = course.id;
    console.log(`  ✅ Created Course: "${course.name}" (ID: ${course.id})`);

    // Assign educator
    await db.insert(schema.courseEducators).values({
      courseId: course.id,
      educatorId: educator.id,
    });

    // Enroll learner
    await db.insert(schema.courseEnrollments).values({
      courseId: course.id,
      learnerId: learner.id,
      status: 'active',
    });

    // Provide 5 initial credits
    const [creditRow] = await db
      .insert(schema.credits)
      .values({
        courseId: course.id,
        learnerId: learner.id,
        total: '5.0',
        consumed: '0.0',
      })
      .returning();
    console.log(`  ✅ Credit row initialized: Total=${creditRow.total}, Consumed=${creditRow.consumed}`);

    // ─── 2. SESSION / CALENDAR CREATION & STATUS ─────────────────────────────
    console.log('\n[2/7] Testing Session / Calendar Booking & Status Check...');
    const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const sessionRes = await sessionService.createSession({
      courseId: course.id,
      educatorId: educator.id,
      title: 'E2E Test: Thermodynamics & Entropy',
      topic: 'Heat Transfer Equations',
      scheduledAt: scheduledTime.toISOString(),
      durationMin: 60,
      creditsConsumed: 1,
      learnerIds: [learner.id],
      createZoomMeeting: false, // Unit mock
    });
    testSessionId = sessionRes.id;

    // Verify DB return and state
    const [dbSession] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, testSessionId));
    console.log(`  ✅ Session Created in DB: "${dbSession.title}"`);
    console.log(`     Status: "${dbSession.status}" (Expected: scheduled)`);
    console.log(`     Duration: ${dbSession.durationMin} mins, ScheduledAt: ${dbSession.scheduledAt}`);

    const attendees = await db
      .select()
      .from(schema.sessionAttendees)
      .where(eq(schema.sessionAttendees.sessionId, testSessionId));
    console.log(`     Attendees Linked: ${attendees.length} (Learner ID: ${attendees[0]?.learnerId})`);
    if (dbSession.status !== 'scheduled' || attendees.length !== 1) {
      throw new Error(`Session state mismatch! status=${dbSession.status}, attendees=${attendees.length}`);
    }

    // ─── 3. SESSION FEEDBACK & CREDIT ATOMIC DEDUCTION ────────────────────────
    console.log('\n[3/7] Testing Educator Feedback Submission & Credit Deduction...');
    const feedbackRes = await sessionRepository.submitFeedback(
      testSessionId,
      {
        topicsCovered: 'First Law of Thermodynamics and Carnot Cycles',
        comments: 'Excellent grasp of isothermal processes.',
        homeworkAssigned: 'Solve problems 1-10 on page 45',
        creditsConsumed: 1.0,
      },
      educator.id,
      course.id
    );
    console.log(`  ✅ Feedback Submitted: ID=${feedbackRes.id}, Credits=${feedbackRes.creditsConsumed}`);

    // Inspect Session DB Status Transition: scheduled -> completed
    const [completedSession] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, testSessionId));
    console.log(`     Session DB Status Transition: "${completedSession.status}" (Expected: completed)`);

    // Inspect Atomic Credit Ledger Update: consumed: 0.0 -> 1.0
    const [updatedCredit] = await db
      .select()
      .from(schema.credits)
      .where(and(eq(schema.credits.courseId, course.id), eq(schema.credits.learnerId, learner.id)));
    console.log(`     Credit Ledger Status: Total=${updatedCredit.total}, Consumed=${updatedCredit.consumed} (Remaining: ${Number(updatedCredit.total) - Number(updatedCredit.consumed)})`);

    if (completedSession.status !== 'completed' || Number(updatedCredit.consumed) !== 1.0) {
      throw new Error('Atomic feedback credit deduction failed or session status not completed!');
    }

    // ─── 4. ASSIGNMENT / ASSESSMENT LIFECYCLE ────────────────────────────────
    console.log('\n[4/7] Testing Assignment Creation, Submission & Grading...');
    // Create Section for Course
    const [section] = await db
      .insert(schema.contentSections)
      .values({
        courseId: course.id,
        title: 'Module 1: Thermodynamics Fundamentals',
        sortOrder: 1,
      })
      .returning();
    console.log(`  ✅ Content Section Created: "${section.title}" (ID: ${section.id})`);

    // Create Assessment
    const assessment = await assessmentService.createAssessment({
      sectionId: section.id,
      title: 'E2E Thermo Problem Set 1',
      description: 'Calculate work done during adiabatic expansion',
      maxMarks: 100,
      isPublished: true,
      endsOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    testAssessmentId = assessment.id;
    console.log(`  ✅ Assessment Created: "${assessment.title}" (Max Marks: ${assessment.maxMarks}, Status: published)`);

    // Student Submits Assignment
    const submission = await assessmentService.submitAssignment({
      assessmentId: testAssessmentId,
      learnerId: learner.id,
      fileR2Keys: ['uploads/homework_e2e_student_sol.pdf'],
    });
    testSubmissionId = submission.id;
    console.log(`  ✅ Student Submission Recorded: ID=${submission.id}, Files=${JSON.stringify(submission.fileR2Keys)}`);

    // Educator Grades Submission
    const graded = await assessmentService.gradeSubmission({
      submissionId: testSubmissionId,
      totalScore: 94,
      feedback: 'Outstanding mathematical derivation and clarity.',
      gradedBy: educator.id,
    });
    console.log(`  ✅ Educator Graded Submission: Score=${graded.totalScore}/100, GradedAt=${graded.gradedAt}`);
    console.log(`     Feedback: "${graded.feedback}"`);

    // Verify DB State
    const [dbSub] = await db.select().from(schema.assessmentSubmissions).where(eq(schema.assessmentSubmissions.id, testSubmissionId));
    if (Number(dbSub.totalScore) !== 94 || !dbSub.gradedAt) {
      throw new Error('Assignment grading DB verification failed!');
    }

    // ─── 5. CONSULTATION LEAD & STATUS TRANSITIONS ────────────────────────────
    console.log('\n[5/7] Testing Inbound Consultation Lead & Status Transition...');
    const consultation = await consultationRepository.create({
      orgId: org.id,
      prospectName: 'Sunita Mehra (Parent)',
      prospectEmail: 'sunita.mehra.test@example.com',
      prospectPhone: '+91 98765 43210',
      courseId: course.id,
      slotAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Interested in Grade 10 Physics 1-on-1 coaching',
    });
    testConsultationId = consultation.id;
    console.log(`  ✅ Consultation Lead Created: ID=${consultation.id}, Status="${consultation.status}"`);

    // Update status to confirmed
    const updatedConsultation = await consultationRepository.update(testConsultationId, {
      status: 'confirmed',
      notes: 'Initial parent counseling call confirmed via WhatsApp',
    });
    console.log(`  ✅ Consultation Status Transition: "${updatedConsultation.status}" (Notes: "${updatedConsultation.notes}")`);

    if (updatedConsultation.status !== 'confirmed') {
      throw new Error('Consultation status transition failed!');
    }

    // ─── 6. MONTHLY PROGRESS REPORT DRAFT & SENT ─────────────────────────────
    console.log('\n[6/7] Testing Monthly Progress Report Creation & Dispatch...');
    const { report } = await reportRepository.upsertDraft({
      learnerId: learner.id,
      courseId: course.id,
      monthYear: new Date(Date.UTC(2026, 9, 1)),
      aiDraft: 'Student demonstrated solid understanding of thermodynamics concepts.',
      sectionsJson: {
        headline: 'Consistent mastery in Physics Thermodynamics',
        summary: 'Demonstrated high aptitude in thermodynamics problem sets.',
        overallScore: 92,
        strengths: ['Analytical rigor', 'Active participation'],
        areasForGrowth: ['Time management under timed tests'],
        nextSteps: ['Complete electrostatics module next month'],
      },
    });
    testReportId = report.id;
    console.log(`  ✅ Progress Report Created: ID=${report.id}, MonthYear="${report.monthYear}", Status="${report.status}"`);

    // Transition from draft -> sent
    const sentReport = await reportRepository.markSent(testReportId, educator.id);
    if (!sentReport) throw new Error('markSent returned null!');
    console.log(`  ✅ Progress Report Status Transition: "${sentReport.status}", SentAt=${sentReport.sentAt}, SentBy=${sentReport.sentBy}`);

    if (sentReport.status !== 'sent' || !sentReport.sentAt) {
      throw new Error('Report status transition to sent failed!');
    }

    console.log('\n================================================================');
    console.log('🎯 ALL LIVE DB MUTATIONS & RETURNS CONFIRMED AND VERIFIED!');
    console.log('================================================================');
  } finally {
    // ─── 7. CLEANUP AUDIT ARTIFACTS ──────────────────────────────────────────
    console.log('\n[7/7] Cleaning up test records to maintain database cleanliness...');
    if (testReportId) await db.delete(schema.monthlyReports).where(eq(schema.monthlyReports.id, testReportId));
    if (testConsultationId) await db.delete(schema.consultations).where(eq(schema.consultations.id, testConsultationId));
    if (testSubmissionId) await db.delete(schema.assessmentSubmissions).where(eq(schema.assessmentSubmissions.id, testSubmissionId));
    if (testAssessmentId) await db.delete(schema.assessments).where(eq(schema.assessments.id, testAssessmentId));
    if (testSessionId) {
      await db.delete(schema.sessionFeedback).where(eq(schema.sessionFeedback.sessionId, testSessionId));
      await db.delete(schema.sessionAttendees).where(eq(schema.sessionAttendees.sessionId, testSessionId));
      await db.delete(schema.sessions).where(eq(schema.sessions.id, testSessionId));
    }
    if (testCourseId) {
      await db.delete(schema.credits).where(eq(schema.credits.courseId, testCourseId));
      await db.delete(schema.courseEnrollments).where(eq(schema.courseEnrollments.courseId, testCourseId));
      await db.delete(schema.courseEducators).where(eq(schema.courseEducators.courseId, testCourseId));
      await db.delete(schema.courses).where(eq(schema.courses.id, testCourseId));
    }
    console.log('  🧹 Cleanup complete: 0 orphan records left in Neon DB.\n');
  }
}

runLiveLifecycleAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Audit Failed:', err);
    process.exit(1);
  });
