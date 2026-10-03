import { reportRepository, ReportQueryFilters } from '@/repositories/reportRepository';
import { generateStructuredWithGemini, isGeminiEnabled } from '@/lib/integrations/gemini';
import { sendProgressReport } from '@/lib/email';
import { config } from '@/config/unifiedConfig';
import {
  reportSectionsSchema,
  renderReportMarkdown,
  type ReportSections,
} from '@/validators/reportValidator';
import { format } from 'date-fns';
import crypto from 'crypto';

const SYSTEM_PROMPT = `You are an expert education counsellor writing monthly progress reports for UnboundYou tutoring centre.

Your reader is a parent, typically without a teaching background. Write to them directly.

Rules:
- Be specific and evidence-based. Analyze the provided session logs, topics covered, educator notes, and Zoom audio transcripts. Never invent topics, scores, or remarks that are not in the data.
- Describe progress, not the child. Avoid labels like "lazy", "weak", or "bright". Frame gaps as skills to build.
- When session data is thin, say so plainly rather than padding. Fewer, well-supported observations beat a long list.
- Mastery ratings are 1 (newly introduced) to 5 (can apply independently). Be conservative; do not award 4–5 without repeated evidence.
- "nextSteps" must be concrete actions the family can take, not restatements of the gaps.
- Write in plain English. Avoid jargon, bullet-point fragments in the summary, and exclamation marks.
- Brand tone: Encouraging, insightful, professional, personalized.`;

export type GenerationOutcome =
  | { ok: true; reportId: string; created: boolean; engine: 'gemini' | 'gemini_fallback'; usage?: { promptTokens?: number; candidatesTokens?: number } }
  | { ok: false; code: string; message: string };

export const reportService = {
  async getReports(filters: ReportQueryFilters) {
    return await reportRepository.findMany(filters);
  },

  async getReportById(id: string) {
    return await reportRepository.findById(id);
  },

  async getReportByShareToken(shareToken: string) {
    return await reportRepository.findByShareToken(shareToken);
  },

  /**
   * Single source of truth for report visibility, shared by the API routes and
   * the server-rendered pages so the two can never disagree.
   */
  async getReportForViewer(
    id: string,
    viewer: { role: string; userId: string },
  ): Promise<
    | { ok: true; report: NonNullable<Awaited<ReturnType<typeof reportRepository.findById>>> }
    | { ok: false; code: 'not_found' }
  > {
    const learnerId = viewer.role === 'learner' ? viewer.userId : undefined;
    const report = await reportRepository.findById(id, learnerId);
    if (!report) return { ok: false, code: 'not_found' };

    if (viewer.role === 'owner' || viewer.role === 'admin' || viewer.role === 'educator') {
      return { ok: true, report };
    }

    if (report.status !== 'sent') return { ok: false, code: 'not_found' };

    if (viewer.role === 'learner') {
      return report.learnerId === viewer.userId
        ? { ok: true, report }
        : { ok: false, code: 'not_found' };
    }

    if (viewer.role === 'parent') {
      const linked = await reportRepository.isLinkedParent(viewer.userId, report.learnerId);
      return linked ? { ok: true, report } : { ok: false, code: 'not_found' };
    }

    return { ok: false, code: 'not_found' };
  },

  /**
   * Generates (or regenerates) the AI draft for one learner/course/month using Gemini.
   */
  async generateReport(input: {
    learnerId: string;
    courseId: string;
    monthYear: Date;
    force: boolean;
    sessionIds?: string[];
  }): Promise<GenerationOutcome> {
    const monthStart = startOfMonth(input.monthYear);
    const monthLabel = format(monthStart, 'MMMM yyyy');

    const existing = await reportRepository.findByScope(
      input.learnerId,
      input.courseId,
      monthStart,
    );

    if (existing?.sentAt) {
      return {
        ok: false,
        code: 'already_sent',
        message: 'This report has already been sent and cannot be regenerated',
      };
    }

    if (existing && !input.force) {
      return {
        ok: true,
        reportId: existing.id,
        created: false,
        engine: isGeminiEnabled() ? 'gemini' : 'gemini_fallback',
      };
    }

    const context = await reportRepository.collectGenerationContext(
      input.learnerId,
      input.courseId,
      monthStart,
      input.sessionIds,
    );

    if (!context) {
      return { ok: false, code: 'not_found', message: 'Learner or course not found' };
    }

    const { sections, engine, usage } = await this.synthesise(context, monthLabel);

    const aiDraft = renderReportMarkdown(sections, {
      learnerName: context.learner.name,
      courseName: context.course.name,
      monthYear: monthLabel,
    });

    const { report, created } = await reportRepository.upsertDraft({
      learnerId: input.learnerId,
      courseId: input.courseId,
      monthYear: monthStart,
      sectionsJson: sections,
      aiDraft,
      selectedSessionIds: input.sessionIds,
      shareToken: crypto.randomUUID(),
      brandTheme: 'unboundyou-brand',
    });

    if (!report) {
      return { ok: false, code: 'write_failed', message: 'Could not persist the report' };
    }

    return {
      ok: true,
      reportId: report.id,
      created,
      engine,
      usage: usage
        ? {
            promptTokens: usage.promptTokens ?? 0,
            candidatesTokens: usage.candidatesTokens ?? 0,
          }
        : undefined,
    };
  },

  /** Calls Gemini with the month's evidence and Zoom transcripts and returns schema-valid sections. */
  async synthesise(
    context: NonNullable<Awaited<ReturnType<typeof reportRepository.collectGenerationContext>>>,
    monthLabel: string,
  ): Promise<{
    sections: ReportSections;
    engine: 'gemini' | 'gemini_fallback';
    usage?: { promptTokens?: number; candidatesTokens?: number };
  }> {
    const result = await generateStructuredWithGemini({
      system: SYSTEM_PROMPT,
      schema: reportSectionsSchema,
      prompt: buildPrompt(context, monthLabel),
    });

    if (result.ok) {
      return {
        sections: result.data,
        engine: result.engine,
        usage: result.usage,
      };
    }

    console.warn('[reports] Gemini generation fell back to template synthesis:', result.message);
    return {
      sections: buildFallbackSections(context, monthLabel),
      engine: 'gemini_fallback',
    };
  },

  /**
   * Creates or refreshes drafts for every active enrolment in a month.
   *
   * Sequential rather than parallel: each call is a separate AI request, and a
   * burst would both spike cost and risk provider rate limits. One failure does
   * not abort the run — failures are collected and returned so the admin sees
   * exactly which learners were skipped and why.
   */
  async generateAllForMonth(input: {
    monthYear: Date;
    force: boolean;
    limit: number;
  }): Promise<{
    created: number;
    existing: number;
    failed: { learnerId: string; reason: string }[];
    truncated: boolean;
    totalEligible: number;
  }> {
    const monthStart = startOfMonth(input.monthYear);
    const eligible = await reportRepository.listEligibleEnrollments(input.limit + 1);
    const truncated = eligible.length > input.limit;
    const batch = truncated ? eligible.slice(0, input.limit) : eligible;

    let created = 0;
    let existing = 0;
    const failed: { learnerId: string; reason: string }[] = [];

    for (const { learnerId, courseId } of batch) {
      const result = await this.generateReport({
        learnerId,
        courseId,
        monthYear: monthStart,
        force: input.force,
      });
      if (!result.ok) {
        failed.push({ learnerId, reason: result.message });
      } else if (result.created) {
        created += 1;
      } else {
        existing += 1;
      }
    }

    return { created, existing, failed, truncated, totalEligible: batch.length };
  },

  async updateReport(
    id: string,
    patch: { sections?: ReportSections; summary?: string },
  ) {
    return await reportRepository.updateContent(id, {
      ...(patch.sections ? { sectionsJson: patch.sections } : {}),
      ...(patch.summary ? { editedContent: patch.summary } : {}),
    });
  },

  /**
   * Marks the report sent and notifies the learner + linked parents.
   * Idempotent: a second call is a no-op rather than a duplicate email.
   */
  async sendReport(id: string, sentBy: string, notify: boolean) {
    const report = await reportRepository.findById(id);
    if (!report) return { ok: false as const, code: 'not_found', message: 'Report not found' };

    if (report.status === 'sent') {
      return { ok: false as const, code: 'already_sent', message: 'This report was already sent' };
    }

    const sent = await reportRepository.markSent(id, sentBy);
    if (!sent) {
      return {
        ok: false as const,
        code: 'already_sent',
        message: 'This report was already sent',
      };
    }

    if (!notify) return { ok: true as const, notified: 0 };

    const { learner, parents } = await reportRepository.getRecipients(report.learnerId);
    const recipients = [
      ...(learner?.email
        ? [{ email: learner.email, name: learner.name ?? 'there' }]
        : []),
      ...parents.map((p) => ({ email: p.email, name: p.name ?? 'there' })),
    ];

    const reportUrl = `${config.appUrl}/student/progress-reports/${report.id}`;
    const monthYear = format(report.monthYear, 'MMMM yyyy');
    const courseName = report.courseName ?? 'your course';

    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendProgressReport({
          to: r.email,
          name: r.name,
          courseName,
          monthYear,
          reportUrl,
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.error(`[reports] ${failed}/${recipients.length} report notifications failed`);
    }

    return { ok: true as const, notified: recipients.length - failed };
  },
};

// ─── Prompt construction ──────────────────────────────────────────────────────

type ReportContext = NonNullable<
  Awaited<ReturnType<typeof reportRepository.collectGenerationContext>>
>;

function buildPrompt(context: ReportContext, monthLabel: string): string {
  const { learner, course, sessions, stats } = context;

  const sessionLines = sessions.length
    ? sessions
        .map((s) => {
          const date = format(new Date(s.scheduledAt), 'd MMM');
          const parts = [`- ${date} | ${s.title}${s.topic ? ` (${s.topic})` : ''} | ${s.status}`];
          if (s.educatorName) parts.push(`educator: ${s.educatorName}`);
          if (s.aiSummary) parts.push(`Zoom AI Summary: ${s.aiSummary}`);
          if (s.topicsCovered) parts.push(`topics: ${s.topicsCovered}`);
          if (s.comments) parts.push(`educator notes: ${s.comments}`);
          if (s.homeworkAssigned) parts.push(`homework: ${s.homeworkAssigned}`);
          if (s.transcriptText) parts.push(`transcript excerpt: ${s.transcriptText.slice(0, 250)}`);
          return parts.join(' | ');
        })
        .join('\n')
    : '- No sessions were scheduled in this period.';

  return `Write the monthly progress report for the following period and learner.

PERIOD: ${monthLabel}
LEARNER: ${learner.name}${learner.grade ? ` (${learner.grade})` : ''}${learner.board ? `, ${learner.board} board` : ''}
COURSE: ${course.name}${course.type ? ` (${course.type.replace(/_/g, ' ')})` : ''}

ACTIVITY THIS MONTH
Sessions scheduled: ${stats.totalSessions}
Completed: ${stats.completedSessions}
No-shows: ${stats.noShows}
Sessions with educator feedback: ${stats.sessionsWithFeedback}
Recorded attendance events: ${stats.attendanceJoins} (${Math.round(stats.attendanceSeconds / 60)} minutes)
${stats.creditsRemaining !== null ? `Credits remaining on this course: ${stats.creditsRemaining}` : ''}

SESSION LOG
${sessionLines}

Produce the report. If the evidence is thin, reflect that honestly in the summary and keep lists short.`;
}

// ─── Deterministic fallback (no API key) ──────────────────────────────────────

function buildFallbackSections(context: ReportContext, monthLabel: string): ReportSections {
  const { learner, course, sessions, stats } = context;

  const completed = sessions.filter((s) => s.status === 'completed');
  const topics = dedupe(
    sessions
      .map((s) => s.topicsCovered)
      .filter((t): t is string => !!t)
      .flatMap((t) => t.split(/[,;]/).map((part) => part.trim()))
      .filter(Boolean),
  );

  const topicEntries = (topics.length ? topics : ['General syllabus review']).map((topic) => ({
    topic,
    mastery: masteryFromEvidence(topic, sessions),
  }));

  const summary = completed.length
    ? `${learner.name} attended ${completed.length} of ${stats.totalSessions} scheduled session${stats.totalSessions === 1 ? '' : 's'} in ${course.name} during ${monthLabel}. ${stats.sessionsWithFeedback} of those sessions included written feedback from the educator.`
    : `No completed sessions were recorded for ${learner.name} in ${course.name} during ${monthLabel}. A report is still generated so the record is complete, but there is limited activity to comment on.`;

  return {
    headline: completed.length
      ? `${completed.length} session${completed.length === 1 ? '' : 's'} completed in ${monthLabel}`
      : `No sessions recorded in ${monthLabel}`,
    summary,
    topicsCovered: topicEntries,
    strengths:
      completed.length > 0
        ? [`Consistent attendance across ${completed.length} session${completed.length === 1 ? '' : 's'}`]
        : ['No attendance data available for this period'],
    areasForGrowth:
      stats.noShows > 0
        ? [`${stats.noShows} session${stats.noShows === 1 ? ' was' : 's were'} missed — confirming attendance in advance would help`]
        : ['Continue the current pace to build depth on recently introduced topics'],
    nextSteps: [
      `Book the next ${course.name} session to maintain continuity`,
      stats.noShows > 0
        ? 'Confirm session times a day in advance to avoid missed sessions'
        : 'Review homework after each session',
    ],
    overallScore: scoreFromStats(stats),
    engagementRating: engagementFromStats(stats),
  };
}

function masteryFromEvidence(topic: string, sessions: ReportContext['sessions']): number {
  const mentions = sessions.filter((s) => s.topicsCovered?.includes(topic)).length;
  if (mentions >= 3) return 4;
  if (mentions === 2) return 3;
  return 2;
}

function scoreFromStats(stats: ReportContext['stats']): number {
  if (stats.totalSessions === 0) return 0;
  const attendanceRatio = stats.completedSessions / stats.totalSessions;
  const feedbackRatio =
    stats.totalSessions === 0 ? 0 : stats.sessionsWithFeedback / stats.totalSessions;
  return Math.round((attendanceRatio * 0.6 + feedbackRatio * 0.4) * 100);
}

function engagementFromStats(stats: ReportContext['stats']): number {
  if (stats.totalSessions === 0) return 1;
  const ratio = stats.completedSessions / stats.totalSessions;
  if (ratio >= 0.95) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  return 2;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

// ─── Response repair ──────────────────────────────────────────────────────────

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/**
 * Clamps the numeric fields the API cannot constrain. Only numeric values are
 * touched — anything structural that is wrong still fails validation and falls
 * back to the template, because a structurally broken report is not repairable.
 */
function clampReportSections(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;

  const topics = Array.isArray(r.topicsCovered)
    ? r.topicsCovered.map((t) => {
        if (!t || typeof t !== 'object') return t;
        const topic = t as Record<string, unknown>;
        return { ...topic, mastery: clamp(topic.mastery, 1, 5, 2) };
      })
    : r.topicsCovered;

  return {
    ...r,
    overallScore: clamp(r.overallScore, 0, 100, 0),
    engagementRating: clamp(r.engagementRating, 1, 5, 1),
    topicsCovered: topics,
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
