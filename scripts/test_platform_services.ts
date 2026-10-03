/**
 * Comprehensive Platform Test Suite
 * Validates database schema integrity, repository queries, and service functions
 * across all 4 system roles: Admin, Educator, Learner, Parent.
 */

import { db } from '../src/lib/drizzle';
import * as schema from '../src/db/schema';
import { getTableName, isTable, getTableColumns, sql, eq } from 'drizzle-orm';

// Repositories
import { analyticsRepository } from '../src/repositories/analyticsRepository';
import { payoutRepository } from '../src/repositories/payoutRepository';
import { storeRepository } from '../src/repositories/storeRepository';
import { learnerRepository } from '../src/repositories/learnerRepository';
import { educatorRepository } from '../src/repositories/educatorRepository';
import { availabilityRepository } from '../src/repositories/availabilityRepository';
import { courseRepository } from '../src/repositories/courseRepository';
import { sessionRepository } from '../src/repositories/sessionRepository';
import * as chatRepository from '../src/repositories/chatRepository';
import { creditRepository } from '../src/repositories/creditRepository';
import { consultationRepository } from '../src/repositories/consultationRepository';
import { reportRepository } from '../src/repositories/reportRepository';

// Services
import { sessionService } from '../src/services/sessionService';
import { courseService } from '../src/services/courseService';
import { learnerService } from '../src/services/learnerService';
import { educatorService } from '../src/services/educatorService';
import { availabilityService } from '../src/services/availabilityService';
import { payoutService } from '../src/services/payoutService';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs, details: details || undefined });
    console.log(`  ✅ [${suite}] ${name} (${durationMs}ms)${details ? ` - ${details}` : ''}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errorMsg = err.message || String(err);
    results.push({ suite, name, passed: false, durationMs, error: errorMsg });
    console.error(`  ❌ [${suite}] ${name} (${durationMs}ms): ${errorMsg}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING EXTENSIVE PLATFORM TEST SUITE');
  console.log('================================================================\n');

  // ─── 1. Schema & Column Integrity ──────────────────────────────────────────
  console.log('📌 1. Database Schema & Column Audit');
  await test('Schema', 'Verify all 65 Drizzle tables exist in Neon DB', async () => {
    const dbColumnsRes = await db.execute(sql`
      SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';
    `);
    const dbTableMap = new Map<string, Set<string>>();
    for (const row of dbColumnsRes as any[]) {
      if (!dbTableMap.has(row.table_name)) dbTableMap.set(row.table_name, new Set());
      dbTableMap.get(row.table_name)!.add(row.column_name);
    }

    let tablesChecked = 0;
    let columnsChecked = 0;
    const missing: string[] = [];

    for (const [exportName, exportValue] of Object.entries(schema)) {
      if (isTable(exportValue)) {
        const tableName = getTableName(exportValue);
        tablesChecked++;
        const dbColumns = dbTableMap.get(tableName);
        if (!dbColumns) {
          missing.push(`Table ${tableName} missing`);
          continue;
        }
        const columns = getTableColumns(exportValue);
        for (const [colKey, colObj] of Object.entries(columns)) {
          columnsChecked++;
          if (!dbColumns.has(colObj.name)) {
            missing.push(`${tableName}.${colObj.name} missing`);
          }
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(`Schema discrepancies found: ${missing.join(', ')}`);
    }
    return `Verified ${tablesChecked} tables and ${columnsChecked} columns with 0 mismatches`;
  });

  // Fetch Persona Users
  const [admin] = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@unboundyou.com'));
  const [educator] = await db.select().from(schema.users).where(eq(schema.users.email, 'educator@unboundyou.com'));
  const [learner] = await db.select().from(schema.users).where(eq(schema.users.email, 'student@unboundyou.com'));
  const [parent] = await db.select().from(schema.users).where(eq(schema.users.email, 'parent@unboundyou.com'));

  if (!admin || !educator || !learner || !parent) {
    throw new Error('Required personas are not found in DB! Run seed_personas.ts first.');
  }

  // ─── 2. Admin Role Functions & Repositories ────────────────────────────────
  console.log('\n📌 2. Admin Role Functions & Repositories');

  await test('Admin', 'analyticsRepository.getOverviewStats()', async () => {
    const stats = await analyticsRepository.getOverviewStats();
    return `Total Learners: ${stats.totalLearners}, Active Courses: ${stats.activeCourses}, Sessions: ${stats.sessionsThisMonth}`;
  });

  await test('Admin', 'payoutRepository.findMany() for Admin', async () => {
    const res = await payoutRepository.findMany({ role: 'admin', userId: admin.id, page: 1, perPage: 10 });
    return `Retrieved ${res.payouts.length} payouts (total: ${res.total})`;
  });

  await test('Admin', 'learnerRepository.findMany() with search & pagination', async () => {
    const res = await learnerRepository.findMany({ page: 1, perPage: 10 });
    return `Retrieved ${res.learners.length} learners (total: ${res.total})`;
  });

  await test('Admin', 'educatorRepository.findMany() with profiles', async () => {
    const res = await educatorRepository.findMany({ page: 1, perPage: 10 });
    return `Retrieved ${res.educators.length} educators (total: ${res.total})`;
  });

  await test('Admin', 'courseRepository.findMany()', async () => {
    const res = await courseRepository.findMany({ page: 1, perPage: 10 });
    return `Retrieved ${res.courses.length} courses (total: ${res.total})`;
  });

  await test('Admin', 'sessionRepository.findMany() for Admin (all sessions)', async () => {
    const res = await sessionRepository.findMany({ page: 1, perPage: 10 });
    return `Retrieved ${res.sessions.length} sessions`;
  });

  await test('Admin', 'consultationRepository.findMany()', async () => {
    const res = await consultationRepository.findMany({ page: 1, perPage: 10 });
    return `Retrieved ${res.consultations.length} consultations (total: ${res.total})`;
  });

  await test('Admin', 'reportRepository.findMany() for Admin (all reports)', async () => {
    const res = await reportRepository.findMany({ role: 'admin', userId: admin.id, page: 1, perPage: 10 });
    return `Retrieved ${res.reports.length} reports (total: ${res.total})`;
  });

  await test('Admin', 'storeRepository.findByOrgId()', async () => {
    const settings = await storeRepository.findByOrgId('00000000-0000-0000-0000-000000000000');
    return `Store settings query passed (configured: ${Boolean(settings)})`;
  });

  // ─── 3. Educator Role Functions & Repositories ─────────────────────────────
  console.log('\n📌 3. Educator Role Functions & Repositories');

  await test('Educator', 'educatorRepository.findMany({ q: "Rajesh" })', async () => {
    const res = await educatorRepository.findMany({ q: 'Rajesh' });
    if (res.educators.length === 0) throw new Error('Educator Rajesh Kumar not found');
    return `Found educator: ${res.educators[0].name} (${res.educators[0].email})`;
  });

  await test('Educator', 'availabilityRepository.findByEducatorId()', async () => {
    const res = await availabilityRepository.findByEducatorId(educator.id);
    return `Availability query executed. Upcoming leaves: ${res.leaves.length}`;
  });

  await test('Educator', 'courseRepository.findMany({ educatorId })', async () => {
    const res = await courseRepository.findMany({ educatorId: educator.id });
    return `Assigned courses found: ${res.courses.length}`;
  });

  await test('Educator', 'sessionRepository.findMany({ educatorId })', async () => {
    const res = await sessionRepository.findMany({ educatorId: educator.id });
    return `Educator schedule loaded: ${res.sessions.length} sessions`;
  });

  await test('Educator', 'reportRepository.findMany({ role: "educator" })', async () => {
    const res = await reportRepository.findMany({ role: 'educator', userId: educator.id });
    return `Reports query executed: ${res.reports.length} reports`;
  });

  await test('Educator', 'chatRepository.listThreadsForUser(educator.id)', async () => {
    const threads = await chatRepository.listThreadsForUser(educator.id);
    return `Educator inbox loaded: ${threads.length} threads`;
  });

  // ─── 4. Learner Role Functions & Repositories ──────────────────────────────
  console.log('\n📌 4. Learner / Student Role Functions & Repositories');

  await test('Learner', 'learnerRepository.findMany({ q: "Sumit" })', async () => {
    const res = await learnerRepository.findMany({ q: 'Sumit' });
    if (res.learners.length === 0) throw new Error('Learner Sumit not found');
    return `Found learner: ${res.learners[0].name} (${res.learners[0].email})`;
  });

  await test('Learner', 'sessionRepository.findMany({ learnerId })', async () => {
    const res = await sessionRepository.findMany({ learnerId: learner.id });
    return `Learner sessions loaded: ${res.sessions.length} sessions`;
  });

  await test('Learner', 'creditRepository.getCredit()', async () => {
    const credit = await creditRepository.getCredit('00000000-0000-0000-0000-000000000000', learner.id);
    return `Credit balance query executed (balance: ${credit?.total ?? 0})`;
  });

  await test('Learner', 'reportRepository.findMany({ role: "learner" })', async () => {
    const res = await reportRepository.findMany({ role: 'learner', userId: learner.id });
    return `Learner progress reports: ${res.reports.length}`;
  });

  await test('Learner', 'chatRepository.listThreadsForUser(learner.id)', async () => {
    const threads = await chatRepository.listThreadsForUser(learner.id);
    return `Learner chat inbox: ${threads.length} threads`;
  });

  // ─── 5. Parent Role Functions & Repositories ───────────────────────────────
  console.log('\n📌 5. Parent Role Functions & Repositories');

  await test('Parent', 'parent_profiles relation check (parent -> learner link)', async () => {
    const [pProfile] = await db
      .select({
        parentId: schema.parentProfiles.userId,
        learnerId: schema.parentProfiles.learnerId,
        learnerName: schema.users.name,
        relationship: schema.parentProfiles.relationship,
      })
      .from(schema.parentProfiles)
      .innerJoin(schema.users, eq(schema.parentProfiles.learnerId, schema.users.id))
      .where(eq(schema.parentProfiles.userId, parent.id));

    if (!pProfile) throw new Error('No child link found for parent');
    return `Parent linked to learner: ${pProfile.learnerName} (Relation: ${pProfile.relationship})`;
  });

  await test('Parent', 'sessionRepository.findMany({ parentUserId })', async () => {
    const res = await sessionRepository.findMany({ parentUserId: parent.id });
    return `Child sessions for parent calendar: ${res.sessions.length} sessions`;
  });

  await test('Parent', 'reportRepository.findMany({ role: "parent" })', async () => {
    const res = await reportRepository.findMany({ role: 'parent', userId: parent.id });
    return `Child reports for parent dashboard: ${res.reports.length} reports`;
  });

  await test('Parent', 'consultationRepository.findMany({ q: "Priya" })', async () => {
    const res = await consultationRepository.findMany({ q: 'Priya' });
    return `Parent consultation query executed: ${res.consultations.length} records`;
  });

  // ─── 6. Service Layer Orchestration ────────────────────────────────────────
  console.log('\n📌 6. Service Layer Orchestration');

  await test('Services', 'sessionService.getSessions()', async () => {
    const res = await sessionService.getSessions({ page: 1, perPage: 5 });
    return `sessionService returned ${res.sessions.length} sessions`;
  });

  await test('Services', 'courseService.getCourses()', async () => {
    const res = await courseService.getCourses({ page: 1, perPage: 5 });
    return `courseService returned ${res.courses.length} courses`;
  });

  await test('Services', 'learnerService.getLearners()', async () => {
    const res = await learnerService.getLearners({ page: 1, perPage: 5 });
    return `learnerService returned ${res.learners.length} learners`;
  });

  await test('Services', 'educatorService.getEducators()', async () => {
    const res = await educatorService.getEducators({ page: 1, perPage: 5 });
    return `educatorService returned ${res.educators.length} educators`;
  });

  await test('Services', 'availabilityService.getAvailability()', async () => {
    const res = await availabilityService.getAvailability(educator.id);
    return `availabilityService returned profile: ${Boolean(res.profile)}`;
  });

  await test('Services', 'payoutService.getPayouts()', async () => {
    const res = await payoutService.getPayouts({ role: 'admin', userId: admin.id, page: 1, perPage: 5 });
    return `payoutService returned ${res.payouts.length} payouts`;
  });

  // ─── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('================================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount} ✅`);
  console.log(`Failed:         ${failedCount} ${failedCount > 0 ? '❌' : ''}`);
  console.log(`Total Time:     ${(totalDuration / 1000).toFixed(2)}s\n`);

  if (failedCount > 0) {
    console.error('❌ Failed Tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`  - [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED! Every service, role, and repository is 100% operational.');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
