import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { reportService } from '@/services/reportService';
import { reportSectionsSchema, type ReportSections } from '@/validators/reportValidator';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { 
  ArrowLeft, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  ListChecks, 
  Award, 
  Sparkles,
  Calendar,
  BookOpen,
  CheckCircle2,
  Share2,
  Printer
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Renders one monthly report with official UnboundYou branding, colors, and layout.
 */
export default async function ProgressReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewer = await reportService.getReportForViewer(id, {
    role: (session.user as { role?: string }).role ?? '',
    userId: (session.user as { id?: string }).id ?? '',
  });
  
  if (!viewer.ok) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Report Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            This progress report is not available or has not been shared with you yet. Once your educator or admin publishes it, it will appear in your progress reports list.
          </p>
          <Link
            href="/student/progress-reports"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A86FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            View All Progress Reports
          </Link>
        </div>
      </div>
    );
  }

  const { report } = viewer;
  const parsed = reportSectionsSchema.safeParse(report.sectionsJson);
  const sections: ReportSections | null = parsed.success ? parsed.data : null;

  const monthLabel = new Date(report.monthYear).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

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
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/student/progress-reports"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all reports</span>
        </Link>
      </div>

      {/* Main Branded Progress Report Container */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-10 shadow-lg overflow-hidden relative">
        {/* Subtle Brand Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#00B4D8]/10 via-[#3A86FF]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* ─── BRAND HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" />
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Official Monthly Academic Evaluation & Progress Report
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-[#3A86FF] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800/80 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#00B4D8]" /> AI Synthesised
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
              <Calendar className="w-3.5 h-3.5" /> {monthLabel}
            </span>
          </div>
        </div>

        {/* ─── LEARNER & COURSE OVERVIEW BANNER ─── */}
        <div className="my-6 p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-cyan-50/40 to-transparent dark:from-[#111622] dark:via-[#161B26] dark:to-transparent border border-blue-100/80 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#3A86FF]" />
              <h2 className="text-lg font-black text-gray-950 dark:text-white">
                {report.courseName ?? 'Curriculum Course'}
              </h2>
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Scholar: <strong className="text-gray-950 dark:text-white font-bold">{report.learnerName || 'Scholar'}</strong>
            </p>
            {report.sentAt && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Published on {new Date(report.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Key Score Pills */}
          {sections && (
            <div className="flex items-center gap-3">
              {/* Overall Score */}
              <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00B4D8] to-[#3A86FF] text-white shadow-md flex flex-col items-center">
                <div className="text-2xl font-black leading-none">
                  {sections.overallScore}
                  <span className="text-xs font-semibold opacity-80">/100</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-90">
                  Overall Score
                </span>
              </div>

              {/* Engagement Rating */}
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

        {/* ─── DETAILED SECTIONS ─── */}
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

            {/* Topics Covered & Mastery Progression */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#3A86FF]" />
                Curriculum Topics & Mastery Level
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {sections.topicsCovered.map((t) => (
                  <div 
                    key={t.topic} 
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] shadow-2xs hover:border-[#00B4D8]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-bold text-gray-950 dark:text-white truncate">
                        {t.topic}
                      </span>
                      <span className="text-[11px] font-bold text-[#00B4D8] dark:text-[#38BDF8] shrink-0">
                        {t.mastery}/5 Mastery
                      </span>
                    </div>

                    {/* UnboundYou 5-Segment Brand Progress Bar */}
                    <div className="flex gap-1.5 mb-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
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

            {/* Evaluation Triad: Strengths, Growth, Next Steps */}
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
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            {(report.editedContent || report.aiDraft) ? (
              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {report.editedContent || report.aiDraft}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This report has no content yet.
              </p>
            )}
          </div>
        )}

        {/* ─── BRAND FOOTER WATERMARK ─── */}
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" iconOnly />
            <span>UnboundYou · Personalised 1:1 Learning Partner</span>
          </div>
          <p>Strictly Confidential · Formatted for Cambridge & IGCSE Excellence</p>
        </div>
      </div>
    </div>
  );
}
