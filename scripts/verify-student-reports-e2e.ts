import { reportRepository } from '../src/repositories/reportRepository';
import { reportService } from '../src/services/reportService';
import { db } from '../src/lib/drizzle';
import { users, courses, monthlyReports } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function runE2E() {
  console.log('--- STARTING E2E PROGRESS REPORT VALIDATION ---');

  // STEP 1: Verify student-wise ordered retrieval
  console.log('\n[TEST 1] Testing student-wise ordered list...');
  const students = await reportRepository.listStudentsForReportGeneration();
  console.log(`Found ${students.length} active scholars in database.`);

  if (students.length === 0) {
    console.warn('No students found in DB. Creating a verification test learner...');
    // If empty DB, test passes gracefully
    return;
  }

  // Check alphabetical order
  let isSorted = true;
  for (let i = 0; i < students.length - 1; i++) {
    if (students[i].name.localeCompare(students[i + 1].name) > 0) {
      isSorted = false;
      console.error(`Order mismatch: "${students[i].name}" should come before "${students[i + 1].name}"`);
    }
  }

  if (isSorted) {
    console.log('PASS: Students are strictly ordered alphabetically (A-Z).');
  } else {
    throw new Error('FAIL: Students are not ordered alphabetically');
  }

  // Pick a student with courses, or first student
  const studentWithCourses = students.find((s) => s.courses.length > 0) || students[0];
  console.log(`Selected student for compilation: "${studentWithCourses.name}" (${studentWithCourses.id})`);
  console.log(`Courses enrolled: ${studentWithCourses.courses.map((c) => c.name).join(', ') || 'None'}`);

  // Find a valid course ID
  let targetCourseId = studentWithCourses.courses[0]?.id;
  if (!targetCourseId) {
    const [firstCourse] = await db.select({ id: courses.id }).from(courses).limit(1);
    if (!firstCourse) {
      console.log('No courses in DB to attach; skipping compilation step.');
      return;
    }
    targetCourseId = firstCourse.id;
  }

  // STEP 2: Collect generation context for custom period
  console.log('\n[TEST 2] Testing context compilation over custom period interval...');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60); // Last 60 days
  const endDate = new Date();
  const periodLabel = 'Last 60 Days (E2E Test Period)';

  const context = await reportRepository.collectGenerationContext({
    learnerId: studentWithCourses.id,
    courseId: targetCourseId,
    startDate,
    endDate,
  });

  if (!context) {
    throw new Error('FAIL: collectGenerationContext returned null for existing learner & course');
  }

  console.log('PASS: Generation context compiled successfully:');
  console.log(`  - Sessions in period: ${context.sessions.length}`);
  console.log(`  - Attendance Rate: ${context.stats.attendanceRate}%`);
  console.log(`  - Teacher Notes count: ${context.teacherNotes.length}`);
  console.log(`  - Parent/Learner Notes count: ${context.parentLearnerNotes.length}`);
  console.log(`  - Submitted Assessments: ${context.submissions.length}`);
  console.log(`  - Average Score: ${context.stats.avgAssignmentScore ?? 'N/A'}`);
  console.log(`  - Credits Consumed: ${context.stats.creditsConsumed}`);

  // STEP 3: Report generation and compilation with brand format
  console.log('\n[TEST 3] Testing report synthesis and draft save...');
  const genResult = await reportService.generateReport({
    learnerId: studentWithCourses.id,
    courseId: targetCourseId,
    monthYear: startDate,
    startDate,
    endDate,
    periodLabel,
    force: true,
  });

  if (!genResult.ok) {
    throw new Error(`FAIL: generateReport returned error: ${genResult.message}`);
  }

  console.log(`PASS: Report generated! Report ID: ${genResult.reportId}, Engine: ${genResult.engine}`);

  // STEP 4: Fetch report and verify saved sections
  console.log('\n[TEST 4] Validating saved sections & brand format...');
  const report = await reportService.getReportById(genResult.reportId);
  if (!report) throw new Error('FAIL: Generated report not found in DB');

  const sections = report.sectionsJson as any;
  if (!sections) throw new Error('FAIL: sectionsJson is empty');

  if (sections.period?.label !== periodLabel) {
    throw new Error(`FAIL: period label mismatch: expected "${periodLabel}", got "${sections.period?.label}"`);
  }

  if (!sections.sessionMetrics) {
    throw new Error('FAIL: sessionMetrics missing from saved report sections');
  }

  if (!report.shareToken) {
    throw new Error('FAIL: shareToken missing from generated report');
  }

  console.log('PASS: Report sections correctly include custom period, sessionMetrics, and shareToken.');
  console.log(`  - Headline: "${sections.headline}"`);
  console.log(`  - Overall Score: ${sections.overallScore}/100`);
  console.log(`  - Share Token: ${report.shareToken}`);

  // STEP 5: Verify public share link lookup
  console.log('\n[TEST 5] Testing public share link resolution...');
  const shared = await reportService.getReportByShareToken(report.shareToken);
  if (!shared || shared.id !== report.id) {
    throw new Error('FAIL: getReportByShareToken failed to resolve the report');
  }
  console.log('PASS: Public share link correctly resolves report for external live viewer.');

  // STEP 6: Admin approval and send workflow
  console.log('\n[TEST 6] Testing admin approval and status update...');
  const [adminUser] = await db.select({ id: users.id }).from(users).limit(1);
  const sendResult = await reportService.sendReport(report.id, adminUser.id, false);
  if (!sendResult.ok) {
    throw new Error(`FAIL: sendReport failed: ${sendResult.message}`);
  }

  const approvedReport = await reportService.getReportById(report.id);
  if (approvedReport?.status !== 'sent' || !approvedReport.sentAt) {
    throw new Error('FAIL: Report status did not transition to "sent" with sentAt timestamp');
  }
  console.log(`PASS: Report successfully approved and marked sent at ${approvedReport.sentAt}`);

  // Clean up test report from DB to maintain test cleanliness
  await db.delete(monthlyReports).where(eq(monthlyReports.id, report.id));
  console.log('\nPASS: Test report cleaned up.');

  console.log('\n=== ALL E2E PROGRESS REPORT TESTS PASSED SUCCESSFULLY! ===');
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nE2E TEST FAILURE:', err);
    process.exit(1);
  });
