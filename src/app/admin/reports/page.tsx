import { reportRepository } from '@/repositories/reportRepository';
import { isAnthropicEnabled } from '@/lib/integrations/anthropic';
import ReportsWorkspace, { type ReportListItem } from '@/components/admin/ReportsWorkspace';

export const dynamic = 'force-dynamic';

/**
 * Admin report review queue.
 *
 * Data is read server-side (matching the rest of the admin section) and handed
 * to a client component for the generate / edit / send actions.
 */
export default async function AdminReportsPage() {
  const [drafts, sent] = await Promise.all([
    reportRepository.findMany({ role: 'admin', userId: '', status: 'draft', perPage: 100 }),
    reportRepository.findMany({ role: 'admin', userId: '', status: 'sent', perPage: 100 }),
  ]);

  // Dates cannot cross the server/client boundary, so normalise to ISO strings.
  const serialise = (rows: typeof drafts.reports): ReportListItem[] =>
    rows.map((r) => ({
      id: r.id,
      learnerId: r.learnerId,
      learnerName: r.learnerName,
      learnerAvatarUrl: r.learnerAvatarUrl,
      courseId: r.courseId,
      courseName: r.courseName,
      monthYear: new Date(r.monthYear).toISOString(),
      status: r.status,
      headline: r.headline,
      // jsonb numeric extraction arrives as a string; the UI needs a number.
      overallScore: r.overallScore === null ? null : Number(r.overallScore),
      sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
      generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

  return (
    <ReportsWorkspace
      drafts={serialise(drafts.reports)}
      sent={serialise(sent.reports)}
      aiEnabled={isAnthropicEnabled()}
    />
  );
}
