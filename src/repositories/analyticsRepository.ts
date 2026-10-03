import { db } from '@/lib/drizzle';
import { courses, users, monthlyReports } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';

export const analyticsRepository = {
  async getOverviewStats() {
    const [
      [totalLearnersRow],
      [totalEducatorsRow],
      [activeCoursesRow],
      [sessionsThisMonthRow],
      [pendingReportsRow],
    ] = await Promise.all([
      db.select({ count: count() }).from(users).where(eq(users.role, 'learner')),
      db.select({ count: count() }).from(users).where(eq(users.role, 'educator')),
      db.select({ count: count() }).from(courses).where(eq(courses.status, 'published')),
      db.execute(sql`
        SELECT count(*) as count FROM sessions
        WHERE scheduled_at >= date_trunc('month', now())
          AND scheduled_at < date_trunc('month', now()) + interval '1 month'
      `),
      db.select({ count: count() }).from(monthlyReports).where(eq(monthlyReports.status, 'draft')),
    ]);

    return {
      totalLearners: totalLearnersRow?.count ?? 0,
      totalEducators: totalEducatorsRow?.count ?? 0,
      activeCourses: activeCoursesRow?.count ?? 0,
      sessionsThisMonth: Number((sessionsThisMonthRow as any)?.count ?? 0),
      pendingReports: pendingReportsRow?.count ?? 0,
    };
  }
};
