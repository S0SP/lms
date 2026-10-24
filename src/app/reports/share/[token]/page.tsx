import React from 'react';
import Link from 'next/link';
import { reportService } from '@/services/reportService';
import { reportSectionsSchema, type ReportSections } from '@/validators/reportValidator';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { 
  TrendingUp, 
  Target, 
  ListChecks, 
  Award, 
  Sparkles,
  Calendar,
  BookOpen,
  CheckCircle2,
  Printer,
  Clock,
  ClipboardList,
  GraduationCap,
  MessageSquare
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PublicReportViewer({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const { token } = await params;
  const { action } = await searchParams;

  const report = await reportService.getReportByShareToken(token);

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F17] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl p-10 max-w-md w-full text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Report Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            The progress report you are trying to view is unavailable or may have an expired link.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A86FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
          >
            Visit UnboundYou
          </Link>
        </div>
      </div>
    );
  }

  const parsed = reportSectionsSchema.safeParse(report.sectionsJson);
  const sections: ReportSections | null = parsed.success ? parsed.data : null;

  const periodLabel = sections?.period?.label || new Date(report.monthYear).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const isAutoPrint = action === 'print';

  const listBlock = (
    title: string,
    icon: React.ReactNode,
    items: string[],
    borderAccent: string,
    bgAccent: string
  ) => (
    <section className={`p-5 rounded-2xl border ${borderAccent} ${bgAccent}`}>
      <h2 className="text-sm font-bold text-gray-950 dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      <ul className="space-y-2.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00B4D8] dark:text-[#38BDF8] shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F17] py-8 px-4 sm:px-6 lg:px-8">
      {/* Auto-print trigger when action=print */}
      {isAutoPrint && (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 400); });`,
          }}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Verified Progress Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/reports/share/${token}?action=print`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              Download / Print PDF
            </a>
          </div>
        </div>

        {/* Branded Card Container */}
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-10 shadow-lg overflow-hidden relative print:shadow-none print:border-none print:p-0">
          {/* Brand Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#00B4D8]/10 via-[#3A86FF]/5 to-transparent rounded-full blur-3xl pointer-events-none print:hidden" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800 relative">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Official Academic Evaluation & Progress Report
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-[#3A86FF] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800/80 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#00B4D8]" /> AI Synthesised
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                <Calendar className="w-3.5 h-3.5" /> {periodLabel}
              </span>
            </div>
          </div>

          {/* Student & Course Hero */}
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-blue-50/80 via-cyan-50/50 to-transparent dark:from-[#111622] dark:via-[#161B26] dark:to-transparent border border-blue-100/80 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#3A86FF]" />
                <h2 className="text-lg md:text-xl font-black text-gray-950 dark:text-white">
                  {report.courseName ?? 'Curriculum Track'}
                </h2>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Student: <strong className="text-gray-950 dark:text-white font-extrabold">{report.learnerName || 'Scholar'}</strong>
              </p>
              {report.sentAt && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Approved &amp; Certified on {new Date(report.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Score Badges */}
            {sections && (
              <div className="flex items-center gap-3">
                <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00B4D8] to-[#3A86FF] text-white shadow-md flex flex-col items-center">
                  <div className="text-2xl font-black leading-none">
                    {sections.overallScore}
                    <span className="text-xs font-semibold opacity-80">/100</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-90">
                    Overall Score
                  </span>
                </div>

                <div className="px-5 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col items-center">
                  <div className="flex items-center gap-1 text-2xl font-black text-[#3A86FF] dark:text-[#60A5FA] leading-none">
                    <TrendingUp className="w-5 h-5 text-[#00B4D8]" />
                    {sections.engagementRating}
                    <span className="text-xs font-semibold text-gray-400">/5</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
                    Engagement
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quantitative Metrics Bar */}
          {sections?.sessionMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Attendance</span>
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {sections.sessionMetrics.attendanceRate ?? '100%'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {sections.sessionMetrics.attendedSessions ?? 0} / {sections.sessionMetrics.totalSessions ?? 0} sessions
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Hours Completed</span>
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {sections.sessionMetrics.totalHours ?? '–'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Active learning time
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
                  <span>Assignments</span>
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {sections.sessionMetrics.assignmentsCount ?? (sections.assignments?.length ?? 0)}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Submitted in period
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Award className="w-3.5 h-3.5 text-purple-500" />
                  <span>Avg Score</span>
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {sections.sessionMetrics.avgAssignmentScore ?? '–'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Assessment average
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          {sections ? (
            <div className="space-y-8">
              {/* Executive Summary */}
              <section className="space-y-3">
                <h3 className="text-base font-extrabold text-gray-950 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00B4D8]" />
                  {sections.headline}
                </h3>
                <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50/70 dark:bg-gray-800/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2.5">
                  {sections.summary.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>

              {/* Topics & Mastery Progression */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#3A86FF]" />
                  Curriculum Topics &amp; Mastery Level
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {sections.topicsCovered.map((t) => (
                    <div 
                      key={t.topic} 
                      className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-xs font-bold text-gray-950 dark:text-white truncate">
                          {t.topic}
                        </span>
                        <span className="text-[11px] font-bold text-[#00B4D8] dark:text-[#38BDF8] shrink-0">
                          {t.mastery}/5 Mastery
                        </span>
                      </div>

                      <div className="flex gap-1.5 mb-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full ${
                              level <= t.mastery
                                ? 'bg-gradient-to-r from-[#00B4D8] to-[#3A86FF]'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          />
                        ))}
                      </div>

                      {t.note && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                          "{t.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Assignments Submitted & Graded */}
              {sections.assignments && sections.assignments.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                    Assignments &amp; Submissions ({sections.assignments.length})
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="p-3">Assignment Title</th>
                          <th className="p-3">Score</th>
                          <th className="p-3">Percentage</th>
                          <th className="p-3">Educator Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                        {sections.assignments.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                            <td className="p-3 font-semibold text-gray-950 dark:text-white">
                              {item.title}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              {item.marksAwarded !== undefined ? `${item.marksAwarded} / ${item.maxMarks ?? 100}` : 'Pending'}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              {item.percentage !== undefined ? (
                                <span className={`px-2 py-0.5 rounded font-bold ${item.percentage >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                  {item.percentage}%
                                </span>
                              ) : (
                                '–'
                              )}
                            </td>
                            <td className="p-3 italic text-gray-600 dark:text-gray-400">
                              {item.feedback || 'Evaluated in session'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Strengths, Growth, Next Steps Triad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {listBlock(
                  'Key Strengths',
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                  sections.strengths,
                  'border-emerald-200 dark:border-emerald-800/60',
                  'bg-emerald-50/40 dark:bg-emerald-950/20'
                )}
                {listBlock(
                  'Growth Focus',
                  <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
                  sections.areasForGrowth,
                  'border-amber-200 dark:border-amber-800/60',
                  'bg-amber-50/40 dark:bg-amber-950/20'
                )}
                {listBlock(
                  'Actionable Next Steps',
                  <ListChecks className="w-4 h-4 text-[#3A86FF] dark:text-[#60A5FA]" />,
                  sections.nextSteps,
                  'border-blue-200 dark:border-blue-800/60',
                  'bg-blue-50/40 dark:bg-blue-950/20'
                )}
              </div>

              {/* Pedagogical Notes / Feedback */}
              {sections.educatorNotes && sections.educatorNotes.length > 0 && (
                <section className="p-5 rounded-2xl bg-blue-50/30 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    Teacher Pedagogical Notes &amp; Observations
                  </h4>
                  <ul className="space-y-1.5">
                    {sections.educatorNotes.map((note, i) => (
                      <li key={i} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
                        "{note}"
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {report.editedContent || report.aiDraft || 'No content available for this report.'}
              </div>
            </div>
          )}

          {/* Footer watermark */}
          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" iconOnly />
              <span>UnboundYou · Personalized 1:1 Learning Partner</span>
            </div>
            <p>Official Academic Evaluation · Cambridge &amp; IGCSE Standards</p>
          </div>
        </div>
      </div>
    </div>
  );
}
