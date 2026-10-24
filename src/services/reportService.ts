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
    startDate?: Date;
    endDate?: Date;
    periodLabel?: string;
  }): Promise<GenerationOutcome> {
    const monthStart = input.startDate || startOfMonth(input.monthYear);
    const periodEnd = input.endDate;
    const periodLabel = input.periodLabel || format(monthStart, 'MMMM yyyy');

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

    const context = await reportRepository.collectGenerationContext({
      learnerId: input.learnerId,
      courseId: input.courseId,
      startDate: monthStart,
      endDate: periodEnd,
      selectedSessionIds: input.sessionIds,
    });

    if (!context) {
      return { ok: false, code: 'not_found', message: 'Learner or course not found' };
    }

    const { sections, engine, usage } = await this.synthesise(context, periodLabel);

    // Firmly bind real quantitative metrics, submitted assessments, and notes to sectionsJson
    sections.period = {
      startDate: context.period.start.toISOString(),
      endDate: context.period.end.toISOString(),
      label: periodLabel,
    };
    sections.assignments = context.submissions;
    sections.sessionMetrics = {
      totalSessions: context.stats.totalSessions,
      attendedSessions: context.stats.completedSessions,
      totalHours: (context.stats.attendanceSeconds / 3600).toFixed(1) + ' hrs',
      attendanceRate: `${context.stats.attendanceRate}%`,
      assignmentsCount: context.stats.assignmentsCount,
      avgAssignmentScore: context.stats.avgAssignmentScore,
      creditsConsumed: context.stats.creditsConsumed,
    };
    if ((!sections.educatorNotes || sections.educatorNotes.length === 0) && context.teacherNotes.length > 0) {
      sections.educatorNotes = context.teacherNotes.slice(0, 5);
    }
    if ((!sections.parentLearnerNotes || sections.parentLearnerNotes.length === 0) && context.parentLearnerNotes.length > 0) {
      sections.parentLearnerNotes = context.parentLearnerNotes.slice(0, 5);
    }

    const aiDraft = renderReportMarkdown(sections, {
      learnerName: context.learner.name,
      courseName: context.course.name,
      monthYear: periodLabel,
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

  /** Calls Gemini with the period's evidence, Zoom transcripts, teacher and parent notes, and assignments. */
  async synthesise(
    context: NonNullable<Awaited<ReturnType<typeof reportRepository.collectGenerationContext>>>,
    periodLabel: string,
  ): Promise<{
    sections: ReportSections;
    engine: 'gemini' | 'gemini_fallback';
    usage?: { promptTokens?: number; candidatesTokens?: number };
  }> {
    const result = await generateStructuredWithGemini({
      system: SYSTEM_PROMPT,
      schema: reportSectionsSchema,
      prompt: buildPrompt(context, periodLabel),
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
      sections: buildFallbackSections(context, periodLabel),
      engine: 'gemini_fallback',
    };
  },

  /**
   * Creates or refreshes drafts for every active enrolment in a month.
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
   * Delivers live web view, direct download / print PDF, and executive summary.
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

    const shareToken = report.shareToken;
    const liveUrl = shareToken
      ? `${config.appUrl}/reports/share/${shareToken}`
      : `${config.appUrl}/student/progress-reports/${report.id}`;
    const downloadUrl = shareToken
      ? `${config.appUrl}/reports/share/${shareToken}?action=print`
      : `${config.appUrl}/student/progress-reports/${report.id}`;

    const sections = report.sectionsJson as ReportSections | null;
    const periodLabel = sections?.period?.label || format(report.monthYear, 'MMMM yyyy');
    const courseName = report.courseName ?? 'your course';

    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendProgressReport({
          to: r.email,
          name: r.name,
          courseName,
          monthYear: periodLabel,
          reportUrl: liveUrl,
          liveUrl,
          downloadUrl,
          overallScore: sections?.overallScore,
          summary: sections?.summary,
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

function buildPrompt(context: ReportContext, periodLabel: string): string {
  const { learner, course, sessions, stats, teacherNotes, parentLearnerNotes, submissions } = context;

  const sessionLines = sessions.length
    ? sessions
        .map((s) => {
          const date = format(new Date(s.scheduledAt), 'd MMM yyyy');
          const parts = [`- ${date} | "${s.title}"${s.topic ? ` (Topic: ${s.topic})` : ''} | Status: ${s.status}`];
          if (s.educatorName) parts.push(`Educator: ${s.educatorName}`);
          if (s.aiSummary) parts.push(`AI Session Summary: ${s.aiSummary}`);
          if (s.topicsCovered) parts.push(`Topics Covered: ${s.topicsCovered}`);
          if (s.comments) parts.push(`Teacher Feedback: ${s.comments}`);
          if (s.homeworkAssigned) parts.push(`Homework: ${s.homeworkAssigned}`);
          if (s.transcriptText) parts.push(`Transcript Excerpt: ${s.transcriptText.slice(0, 300)}`);
          return parts.join(' | ');
        })
        .join('\n')
    : '- No sessions were held in this evaluation interval.';

  const teacherFeedbackLines = teacherNotes.length
    ? teacherNotes.map((n) => `- ${n}`).join('\n')
    : '- No standalone confidential educator notes recorded for this period.';

  const parentFeedbackLines = parentLearnerNotes.length
    ? parentLearnerNotes.map((n) => `- ${n}`).join('\n')
    : '- No parent or learner reflections submitted for this period.';

  const assignmentLines = submissions.length
    ? submissions
        .map(
          (sub) =>
            `- "${sub.title}": Scored ${sub.marksAwarded ?? 'Pending'}/${sub.maxMarks} (${sub.percentage !== undefined ? `${sub.percentage}%` : 'Not graded yet'})${sub.feedback ? ` | Teacher Evaluation: "${sub.feedback}"` : ''}`
        )
        .join('\n')
    : '- No assessments or assignments submitted in this period.';

  return `Write an in-depth, structured progress report in the UnboundYou brand format for the student and period below.

EVALUATION PERIOD: ${periodLabel}
LEARNER: ${learner.name}${learner.grade ? ` (Grade: ${learner.grade})` : ''}${learner.board ? `, Board: ${learner.board}` : ''}
COURSE: ${course.name}${course.type ? ` (${course.type.replace(/_/g, ' ')})` : ''}

OVERALL STUDENT METRICS FOR THIS PERIOD:
- Total sessions scheduled: ${stats.totalSessions}
- Completed sessions: ${stats.completedSessions}
- Attendance rate: ${stats.attendanceRate}%
- Total attended time: ${Math.round(stats.attendanceSeconds / 60)} minutes (~${(stats.attendanceSeconds / 3600).toFixed(1)} hours)
- Credits consumed: ${stats.creditsConsumed}
- Assignments submitted: ${stats.assignmentsCount}
- Graded assignments: ${stats.gradedAssignments}
- Average assignment score: ${stats.avgAssignmentScore ?? 'N/A'}
${stats.creditsRemaining !== null ? `- Remaining course credits: ${stats.creditsRemaining}` : ''}

TEACHER CONFIDENTIAL FEEDBACK & PEDAGOGICAL NOTES:
${teacherFeedbackLines}

PARENT & LEARNER FEEDBACK / REFLECTIONS:
${parentFeedbackLines}

SUBMITTED ASSIGNMENTS & SCORES:
${assignmentLines}

DETAILED SESSION LOGS (INCLUDING AI SUMMARIES & TRANSCRIPTS):
${sessionLines}

Instructions:
1. Provide a professional, encouraging, and evidence-grounded executive summary (2-4 sentences) addressing the parent.
2. Outline distinct topics covered with mastery level (1 to 5) and concise observational notes.
3. Highlight genuine strengths backed by the session summaries and assignment scores.
4. Identify 2-4 actionable areas for growth and clear next steps the family can support.
5. Provide a calculated holistic overall score (0-100) and engagement rating (1-5).
6. Provide a concise, inspiring headline summarizing student momentum.`;
}

// ─── Deterministic fallback (no API key) ──────────────────────────────────────

function buildFallbackSections(context: ReportContext, periodLabel: string): ReportSections {
  const { learner, course, sessions, stats, submissions, teacherNotes, parentLearnerNotes } = context;

  const completed = sessions.filter((s) => s.status === 'completed');
  const topics = dedupe(
    sessions
      .map((s) => s.topicsCovered)
      .filter((t): t is string => !!t)
      .flatMap((t) => t.split(/[,;]/).map((part) => part.trim()))
      .filter(Boolean),
  );

  const topicEntries = (topics.length ? topics : ['Core Curriculum Progress']).map((topic) => ({
    topic,
    mastery: masteryFromEvidence(topic, sessions),
  }));

  const summary = completed.length
    ? `${learner.name} attended ${completed.length} of ${stats.totalSessions} scheduled session${stats.totalSessions === 1 ? '' : 's'} (${stats.attendanceRate}% attendance) in ${course.name} during ${periodLabel}. Across this period, ${stats.assignmentsCount} assignments were reviewed with an average score of ${stats.avgAssignmentScore ?? 'N/A'}.`
    : `No completed sessions were recorded for ${learner.name} in ${course.name} during ${periodLabel}. This report summarizes baseline metrics and curriculum tracking for the period.`;

  return {
    headline: completed.length
      ? `${completed.length} sessions completed (${stats.attendanceRate}% attendance) in ${periodLabel}`
      : `Report period for ${periodLabel}`,
    summary,
    topicsCovered: topicEntries,
    strengths:
      completed.length > 0
        ? [
            `Strong commitment with ${completed.length} session${completed.length === 1 ? '' : 's'} completed`,
            ...(stats.assignmentsCount > 0 ? [`Submitted ${stats.assignmentsCount} assignment(s) for evaluation`] : []),
          ]
        : ['Consistent enrollment in the scheduled learning track'],
    areasForGrowth:
      stats.noShows > 0
        ? [`${stats.noShows} session${stats.noShows === 1 ? ' was' : 's were'} missed — maintaining continuity will improve skill retention`]
        : ['Continue regular practice to master complex problem sets independently'],
    nextSteps: [
      `Continue attending scheduled sessions in ${course.name}`,
      stats.assignmentsCount > 0
        ? 'Review teacher grading feedback on recent assignments'
        : 'Complete upcoming practice assignments on time',
    ],
    overallScore: scoreFromStats(stats),
    engagementRating: engagementFromStats(stats),
    period: {
      startDate: context.period.start.toISOString(),
      endDate: context.period.end.toISOString(),
      label: periodLabel,
    },
    sessionMetrics: {
      totalSessions: stats.totalSessions,
      attendedSessions: stats.completedSessions,
      totalHours: (stats.attendanceSeconds / 3600).toFixed(1) + ' hrs',
      attendanceRate: `${stats.attendanceRate}%`,
      assignmentsCount: stats.assignmentsCount,
      avgAssignmentScore: stats.avgAssignmentScore,
      creditsConsumed: stats.creditsConsumed,
    },
    assignments: submissions,
    educatorNotes: teacherNotes.slice(0, 5),
    parentLearnerNotes: parentLearnerNotes.slice(0, 5),
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
