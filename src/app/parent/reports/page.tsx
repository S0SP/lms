import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { courses, monthlyReports, parentProfiles, users } from '@/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { ArrowRight, FileText, TrendingUp, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

const monthLabel = (d: Date) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const initialsOf = (name: string | null) =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default async function ParentReports() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const parentUserId = session.user.id as string;

  // Authorisation: a parent may only ever see reports for a learner they are
  // linked to — the same link reportRepository.isLinkedParent() checks
  // (parent_profiles.user_id = this parent, .learner_id = the child).
  const links = await db
    .select({ learnerId: parentProfiles.learnerId, learnerName: users.name })
    .from(parentProfiles)
    .innerJoin(users, eq(parentProfiles.learnerId, users.id))
    .where(eq(parentProfiles.userId, parentUserId));

  const learnerIds = links.map((l) => l.learnerId);

  if (learnerIds.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg p-10 flex flex-col items-center justify-center text-center">
          <User className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No child linked</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            Your account is not linked to a learner profile yet, so there are no reports to show.
            Please contact the admin.
          </p>
        </div>
      </div>
    );
  }

  // Only reports an admin has actually sent are visible to a family — a draft
  // must never be readable by a parent, matching reportService.getReportForViewer.
  const reports = await db
    .select({
      id: monthlyReports.id,
      learnerId: monthlyReports.learnerId,
      learnerName: users.name,
      courseName: courses.name,
      monthYear: monthlyReports.monthYear,
      sentAt: monthlyReports.sentAt,
      headline: sql<string | null>`${monthlyReports.sectionsJson}->>'headline'`,
      overallScore: sql<number | null>`(${monthlyReports.sectionsJson}->>'overallScore')::int`,
      engagementRating: sql<number | null>`(${monthlyReports.sectionsJson}->>'engagementRating')::int`,
    })
    .from(monthlyReports)
    .leftJoin(users, eq(monthlyReports.learnerId, users.id))
    .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
    .where(
      and(inArray(monthlyReports.learnerId, learnerIds), eq(monthlyReports.status, 'sent')),
    )
    .orderBy(desc(monthlyReports.monthYear), desc(monthlyReports.sentAt));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Progress Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monthly progress reports shared by the tutor team.
          </p>
        </div>
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'} published
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm py-16 px-4 flex flex-col items-center justify-center text-center">
          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            No reports published yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            A report appears here once the tutor team has reviewed and sent it for the month.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/student/progress-reports/${r.id}`}
              className="group block bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden transition-all hover:border-blue-400 hover:shadow"
            >
              <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[12px] font-bold text-blue-700 dark:text-blue-300 shrink-0">
                      {initialsOf(r.learnerName) || '—'}
                    </div>
                    <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                      {r.learnerName ?? 'Child'}
                    </span>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">
                      {monthLabel(r.monthYear)}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {r.courseName ?? 'Course'}
                  </h2>
                  {r.headline && (
                    <p className="text-[14px] text-gray-600 dark:text-gray-400 mt-1.5">{r.headline}</p>
                  )}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                    Sent {r.sentAt ? shortDate(r.sentAt) : '—'}
                  </p>
                </div>

                <div className="flex items-center gap-6 md:flex-col md:items-end gap-y-3 shrink-0">
                  {r.overallScore !== null && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {r.overallScore}
                        <span className="text-xs font-medium text-gray-400">/100</span>
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Overall</div>
                    </div>
                  )}
                  {r.engagementRating !== null && (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        <TrendingUp className="w-4 h-4" />
                        {r.engagementRating}
                        <span className="text-xs font-medium text-gray-400">/5</span>
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Engagement</div>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 dark:text-blue-400">
                    View report
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
