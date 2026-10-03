import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { reportRepository } from '@/repositories/reportRepository';
import { FileText, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Learner's own report history. The repository applies the visibility rules, so
 * a learner only ever receives their own sent reports.
 */
export default async function StudentProgressReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { reports } = await reportRepository.findMany({
    role: 'learner',
    userId: session.user.id as string,
    perPage: 100,
  });

  const monthLabel = (d: Date) =>
    d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Progress Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your monthly progress reports, newest first.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            You have no progress reports yet. Reports appear here once they are shared with you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/student/progress-reports/${r.id}`}
              className="block bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded border border-gray-200 dark:border-gray-700">
                      {monthLabel(r.monthYear)}
                    </span>
                    {r.courseName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {r.courseName}
                      </span>
                    )}
                  </div>
                  <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">
                    {r.headline ?? 'Progress Report'}
                  </h2>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {r.overallScore !== null && (
                    <span className="flex items-center gap-1.5 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {Number(r.overallScore)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
