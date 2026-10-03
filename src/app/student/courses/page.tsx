import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { courseEnrollments, courses, courseEducators, users, credits } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { BookOpen, User as UserIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Course progress is derived from consumed sections rather than stored as a
 * percentage, so it cannot drift from the actual content the learner opened.
 */
export default async function StudentCourses() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const learnerId = session.user.id as string;

  const rows = await db
    .select({
      courseId: courses.id,
      name: courses.name,
      board: courses.board,
      grade: courses.grade,
      type: courses.type,
      thumbnailUrl: courses.thumbnailUrl,
      enrolledAt: courseEnrollments.enrolledAt,
      totalCredits: credits.total,
      consumedCredits: credits.consumed,
      totalSections: sql<number>`(
        SELECT count(*)::int FROM content_sections cs
        WHERE cs.course_id = ${courses.id}
      )`,
      completedSections: sql<number>`(
        SELECT count(DISTINCT cs2.id)::int
        FROM learner_content_progress lcp
        JOIN content_resources cr ON cr.id = lcp.resource_id
        JOIN content_sections cs2 ON cs2.id = cr.section_id
        WHERE cs2.course_id = ${courses.id} AND lcp.learner_id = ${learnerId}
          AND lcp.completed_at IS NOT NULL
      )`,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .leftJoin(credits, and(eq(credits.courseId, courses.id), eq(credits.learnerId, learnerId)))
    .where(
      and(eq(courseEnrollments.learnerId, learnerId), eq(courseEnrollments.status, 'active')),
    )
    .orderBy(desc(courseEnrollments.enrolledAt));

  if (rows.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Courses</h2>
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            You are not enrolled in any active courses.
          </p>
        </div>
      </div>
    );
  }

  // One educator name per course. A course can have several educators, so this
  // takes the first rather than hiding the rest.
  const educatorNames = new Map<string, string>();
  if (rows.length > 0) {
    const links = await db
      .select({ courseId: courseEducators.courseId, name: users.name })
      .from(courseEducators)
      .innerJoin(users, eq(courseEducators.educatorId, users.id))
      .where(
        sql`${courseEducators.courseId} IN (${sql.join(
          rows.map((r) => sql`${r.courseId}`),
          sql`, `,
        )})`,
      );
    for (const l of links) {
      if (!educatorNames.has(l.courseId)) educatorNames.set(l.courseId, l.name);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Courses</h2>

      <div className="bg-white dark:bg-[#161B26] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((c) => {
          const pct =
            c.totalSections > 0
              ? Math.min(100, Math.round((c.completedSections / c.totalSections) * 100))
              : 0;
          const remaining =
            c.totalCredits !== null
              ? Number(c.totalCredits) - Number(c.consumedCredits ?? 0)
              : null;
          const educator = educatorNames.get(c.courseId);

          return (
            <div
              key={c.courseId}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors gap-4"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnailUrl}
                    alt=""
                    className="w-32 h-18 object-cover rounded border border-gray-200 dark:border-gray-800 shrink-0"
                  />
                ) : (
                  <div className="w-32 h-18 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded border border-gray-200 dark:border-gray-700">
                      {c.board ?? c.type.replace(/_/g, ' ')}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-lg truncate">
                      {c.name}
                    </h3>
                  </div>
                  {educator && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <UserIcon className="w-4 h-4" />
                      {educator}
                    </p>
                  )}
                  {remaining !== null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {remaining} of {c.totalCredits} credits remaining
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <div className="w-full md:w-48">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {c.completedSections} of {c.totalSections} sections
                  </p>
                </div>

                <Link
                  href={`/student/courses/${c.courseId}`}
                  className="w-full md:w-auto text-center bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-blue-600 font-medium px-4 py-2 rounded-md transition-colors shadow-sm text-sm"
                >
                  Continue Learning
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
