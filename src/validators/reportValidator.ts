import { z } from 'zod';

/**
 * Shape of the structured monthly progress report.
 *
 * This is the single source of truth for the report contract: it is (a) passed
 * to Claude as an output schema and (b) used to validate an existing row before
 * it is sent to a learner/parent. The union of these uses means the AI and the
 * UI can never drift apart.
 */
export const reportSectionsSchema = z.object({
  /** 2–4 sentence narrative summary written for the parent. */
  summary: z.string().min(20).max(1200),
  /** Distinct topics covered, most significant first. */
  topicsCovered: z
    .array(
      z.object({
        topic: z.string().min(1).max(120),
        /** How confident the learner is, 1 (new) – 5 (mastered). */
        mastery: z.number().int().min(1).max(5),
        note: z.string().max(400).optional(),
      }),
    )
    .min(1)
    .max(15),
  strengths: z.array(z.string().min(1).max(300)).min(1).max(8),
  areasForGrowth: z.array(z.string().min(1).max(300)).min(1).max(8),
  nextSteps: z.array(z.string().min(1).max(300)).min(1).max(8),
  /** 0–100 holistic score for the month. */
  overallScore: z.number().int().min(0).max(100),
  /** 1–5 rating of participation/engagement. */
  engagementRating: z.number().int().min(1).max(5),
  /** One-line headline shown in the report list. */
  headline: z.string().min(5).max(140),
  /** Quantitative metrics matching the brand report format */
  sessionMetrics: z
    .object({
      totalSessions: z.number().optional(),
      attendedSessions: z.number().optional(),
      totalHours: z.string().optional(),
      attendanceRate: z.string().optional(),
      assignmentsCount: z.number().optional(),
      avgAssignmentScore: z.string().optional(),
      creditsConsumed: z.number().optional(),
    })
    .optional(),
  /** Custom report evaluation period */
  period: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  /** Submitted & graded assessments for the period */
  assignments: z
    .array(
      z.object({
        title: z.string(),
        maxMarks: z.number().optional(),
        marksAwarded: z.number().optional(),
        percentage: z.number().optional(),
        feedback: z.string().optional(),
        submittedAt: z.string().optional(),
      })
    )
    .optional(),
  /** Teacher feedback and confidential educator notes */
  educatorNotes: z.array(z.string().min(1).max(500)).optional(),
  /** Parent notes and learner feedback */
  parentLearnerNotes: z.array(z.string().min(1).max(500)).optional(),
});

export type ReportSections = z.infer<typeof reportSectionsSchema>;

/** Rendered as the plain-text/HTML body stored in ai_draft / edited_content. */
export function renderReportMarkdown(sections: ReportSections, context: {
  learnerName: string;
  courseName: string;
  monthYear: string;
}): string {
  const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');
  const assignmentLines = sections.assignments && sections.assignments.length > 0
    ? [
        '',
        '### Assignments & Submissions',
        ...sections.assignments.map(
          (a) => `- **${a.title}**: ${a.marksAwarded ?? '–'}/${a.maxMarks ?? '–'} (${a.percentage ?? 0}%)${a.feedback ? ` — "${a.feedback}"` : ''}`
        ),
      ]
    : [];

  return [
    `## ${context.learnerName} — ${context.courseName}`,
    `**${sections.period?.label || context.monthYear}**`,
    '',
    `*Overall score: ${sections.overallScore}/100 · Engagement: ${sections.engagementRating}/5*`,
    '',
    `### ${sections.headline}`,
    '',
    sections.summary,
    '',
    '### Topics covered',
    ...sections.topicsCovered.map(
      (t) => `- **${t.topic}** — mastery ${t.mastery}/5${t.note ? `: ${t.note}` : ''}`,
    ),
    ...assignmentLines,
    '',
    '### Strengths',
    bullets(sections.strengths),
    '',
    '### Areas for growth',
    bullets(sections.areasForGrowth),
    '',
    '### Next steps',
    bullets(sections.nextSteps),
  ].join('\n');
}

// ─── Request payloads ─────────────────────────────────────────────────────────

export const generateReportSchema = z.discriminatedUnion('all', [
  z.object({
    all: z.literal(false),
    learnerId: z.string().uuid(),
    courseId: z.string().uuid(),
    /** Any date within the target month (defaults to startDate or current date). */
    monthYear: z.coerce.date().optional(),
    /** Custom range start date */
    startDate: z.coerce.date().optional(),
    /** Custom range end date */
    endDate: z.coerce.date().optional(),
    /** Custom period label (e.g. "Oct 1 – Oct 22, 2026") */
    periodLabel: z.string().optional(),
    /** Overwrite an existing draft instead of returning it as-is. */
    force: z.boolean().default(false),
    /** Optional specific session IDs selected by the educator or admin */
    sessionIds: z.array(z.string().uuid()).optional(),
  }),
  z.object({
    all: z.literal(true),
    monthYear: z.coerce.date().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    periodLabel: z.string().optional(),
    force: z.boolean().default(false),
    limit: z.number().int().min(1).max(200).default(50),
    sessionIds: z.array(z.string().uuid()).optional(),
  }),
]);

export const updateReportSchema = z.object({
  /** Admin/educator edits to the AI draft. */
  sections: reportSectionsSchema.optional(),
  summary: z.string().max(5000).optional(),
});

export const sendReportSchema = z.object({
  /** Also email the learner and linked parents. */
  notify: z.boolean().default(true),
});
