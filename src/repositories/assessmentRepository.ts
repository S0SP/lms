import { db } from '@/lib/drizzle';
import {
  assessments,
  assessmentSubmissions,
  assessmentCriteria,
  assessmentScores,
  contentResources,
  learnerContentProgress,
  users,
} from '@/db/schema';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';

export interface CreateAssessmentParams {
  sectionId: string;
  title: string;
  description?: string;
  startsOn?: Date | null;
  endsOn?: Date | null; // Deadline
  maxMarks: number;
  rubricEnabled?: boolean;
  isPublished?: boolean;
  attachments?: Array<{ name: string; url: string; size?: number; type?: string; key?: string }>;
  criteria?: { name: string; maxMarks: number; description?: string }[];
}

export interface SubmitAssessmentParams {
  assessmentId: string;
  learnerId: string;
  fileR2Keys: string[];
}

export interface GradeAssessmentParams {
  submissionId: string;
  gradedBy: string;
  totalScore: number;
  feedback?: string;
  criteriaScores?: { criterionId: string; marksAwarded: number; comment?: string }[];
}

export const assessmentRepository = {
  async create(data: CreateAssessmentParams) {
    return await db.transaction(async (tx) => {
      // 1. Create contentResource entry
      const [resource] = await tx
        .insert(contentResources)
        .values({
          sectionId: data.sectionId,
          type: 'assessment',
          title: data.title,
          isPublished: data.isPublished ?? true,
        })
        .returning();

      if (!resource) throw new Error('Failed to create content resource for assessment');

      // 2. Create assessment header
      const [assessment] = await tx
        .insert(assessments)
        .values({
          resourceId: resource.id,
          title: data.title,
          description: data.description ?? null,
          startsOn: data.startsOn ?? null,
          endsOn: data.endsOn ?? null,
          maxMarks: String(data.maxMarks),
          rubricEnabled: data.rubricEnabled ?? false,
          attachments: data.attachments || [],
        })
        .returning();

      // 3. Create rubric criteria if provided
      if (data.criteria && data.criteria.length > 0) {
        await tx.insert(assessmentCriteria).values(
          data.criteria.map((c, idx) => ({
            assessmentId: assessment.id,
            name: c.name,
            maxMarks: String(c.maxMarks),
            description: c.description ?? null,
            sortOrder: idx,
          }))
        );
      }

      return {
        ...assessment,
        resource,
      };
    });
  },

  async findById(id: string) {
    const [assessment] = await db
      .select({
        id: assessments.id,
        resourceId: assessments.resourceId,
        title: assessments.title,
        description: assessments.description,
        startsOn: assessments.startsOn,
        endsOn: assessments.endsOn,
        maxMarks: assessments.maxMarks,
        rubricEnabled: assessments.rubricEnabled,
        attachments: assessments.attachments,
        createdAt: assessments.createdAt,
        isPublished: contentResources.isPublished,
        sectionId: contentResources.sectionId,
      })
      .from(assessments)
      .innerJoin(contentResources, eq(assessments.resourceId, contentResources.id))
      .where(eq(assessments.id, id))
      .limit(1);

    if (!assessment) return null;

    const criteria = await db
      .select()
      .from(assessmentCriteria)
      .where(eq(assessmentCriteria.assessmentId, id))
      .orderBy(asc(assessmentCriteria.sortOrder));

    return {
      ...assessment,
      maxMarks: Number(assessment.maxMarks),
      criteria: criteria.map((c) => ({ ...c, maxMarks: Number(c.maxMarks) })),
    };
  },

  async findByResourceId(resourceId: string) {
    const [assessment] = await db
      .select({
        id: assessments.id,
        resourceId: assessments.resourceId,
        title: assessments.title,
        description: assessments.description,
        startsOn: assessments.startsOn,
        endsOn: assessments.endsOn,
        maxMarks: assessments.maxMarks,
        rubricEnabled: assessments.rubricEnabled,
        attachments: assessments.attachments,
        createdAt: assessments.createdAt,
        isPublished: contentResources.isPublished,
        sectionId: contentResources.sectionId,
      })
      .from(assessments)
      .innerJoin(contentResources, eq(assessments.resourceId, contentResources.id))
      .where(eq(assessments.resourceId, resourceId))
      .limit(1);

    if (!assessment) return null;

    const criteria = await db
      .select()
      .from(assessmentCriteria)
      .where(eq(assessmentCriteria.assessmentId, assessment.id))
      .orderBy(asc(assessmentCriteria.sortOrder));

    return {
      ...assessment,
      maxMarks: Number(assessment.maxMarks),
      criteria: criteria.map((c) => ({ ...c, maxMarks: Number(c.maxMarks) })),
    };
  },

  async togglePublish(resourceId: string, isPublished: boolean) {
    const [updated] = await db
      .update(contentResources)
      .set({ isPublished, updatedAt: new Date() })
      .where(eq(contentResources.id, resourceId))
      .returning();
    return updated;
  },

  async submit(data: SubmitAssessmentParams) {
    return await db.transaction(async (tx) => {
      // Check if submission already exists for this learner & assessment
      const [existing] = await tx
        .select()
        .from(assessmentSubmissions)
        .where(
          and(
            eq(assessmentSubmissions.assessmentId, data.assessmentId),
            eq(assessmentSubmissions.learnerId, data.learnerId)
          )
        )
        .limit(1);

      let submission;
      if (existing) {
        // Update submission with new files
        const [updated] = await tx
          .update(assessmentSubmissions)
          .set({
            fileR2Keys: data.fileR2Keys,
            submittedAt: new Date(),
          })
          .where(eq(assessmentSubmissions.id, existing.id))
          .returning();
        submission = updated;
      } else {
        const [inserted] = await tx
          .insert(assessmentSubmissions)
          .values({
            assessmentId: data.assessmentId,
            learnerId: data.learnerId,
            fileR2Keys: data.fileR2Keys,
            submittedAt: new Date(),
          })
          .returning();
        submission = inserted;
      }

      // Update learner progress to 50% (submitted, awaiting grading)
      const [assessment] = await tx
        .select({ resourceId: assessments.resourceId })
        .from(assessments)
        .where(eq(assessments.id, data.assessmentId))
        .limit(1);

      if (assessment) {
        await tx
          .insert(learnerContentProgress)
          .values({
            resourceId: assessment.resourceId,
            learnerId: data.learnerId,
            progressPct: '50',
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [learnerContentProgress.resourceId, learnerContentProgress.learnerId],
            set: {
              progressPct: '50',
              updatedAt: new Date(),
            },
          });
      }

      return submission;
    });
  },

  async getLearnerSubmission(assessmentId: string, learnerId: string) {
    const [submission] = await db
      .select({
        id: assessmentSubmissions.id,
        assessmentId: assessmentSubmissions.assessmentId,
        learnerId: assessmentSubmissions.learnerId,
        submittedAt: assessmentSubmissions.submittedAt,
        fileR2Keys: assessmentSubmissions.fileR2Keys,
        totalScore: assessmentSubmissions.totalScore,
        gradedBy: assessmentSubmissions.gradedBy,
        gradedAt: assessmentSubmissions.gradedAt,
        feedback: assessmentSubmissions.feedback,
        graderName: users.name,
      })
      .from(assessmentSubmissions)
      .leftJoin(users, eq(assessmentSubmissions.gradedBy, users.id))
      .where(
        and(
          eq(assessmentSubmissions.assessmentId, assessmentId),
          eq(assessmentSubmissions.learnerId, learnerId)
        )
      )
      .limit(1);

    if (!submission) return null;

    const scores = await db
      .select({
        id: assessmentScores.id,
        criterionId: assessmentScores.criterionId,
        marksAwarded: assessmentScores.marksAwarded,
        comment: assessmentScores.comment,
        criterionName: assessmentCriteria.name,
        criterionMaxMarks: assessmentCriteria.maxMarks,
      })
      .from(assessmentScores)
      .innerJoin(assessmentCriteria, eq(assessmentScores.criterionId, assessmentCriteria.id))
      .where(eq(assessmentScores.submissionId, submission.id));

    return {
      ...submission,
      totalScore: submission.totalScore !== null ? Number(submission.totalScore) : null,
      scores: scores.map((s) => ({
        ...s,
        marksAwarded: Number(s.marksAwarded),
        criterionMaxMarks: Number(s.criterionMaxMarks),
      })),
    };
  },

  async listSubmissionsForAssessment(assessmentId: string) {
    const subs = await db
      .select({
        id: assessmentSubmissions.id,
        assessmentId: assessmentSubmissions.assessmentId,
        learnerId: assessmentSubmissions.learnerId,
        submittedAt: assessmentSubmissions.submittedAt,
        fileR2Keys: assessmentSubmissions.fileR2Keys,
        totalScore: assessmentSubmissions.totalScore,
        gradedBy: assessmentSubmissions.gradedBy,
        gradedAt: assessmentSubmissions.gradedAt,
        feedback: assessmentSubmissions.feedback,
        learnerName: users.name,
        learnerEmail: users.email,
        learnerAvatar: users.avatarUrl,
      })
      .from(assessmentSubmissions)
      .innerJoin(users, eq(assessmentSubmissions.learnerId, users.id))
      .where(eq(assessmentSubmissions.assessmentId, assessmentId))
      .orderBy(desc(assessmentSubmissions.submittedAt));

    return subs.map((s) => ({
      ...s,
      totalScore: s.totalScore !== null ? Number(s.totalScore) : null,
    }));
  },

  async gradeSubmission(data: GradeAssessmentParams) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(assessmentSubmissions)
        .set({
          totalScore: String(data.totalScore),
          gradedBy: data.gradedBy,
          gradedAt: new Date(),
          feedback: data.feedback ?? null,
        })
        .where(eq(assessmentSubmissions.id, data.submissionId))
        .returning();

      if (!updated) throw new Error('Submission not found');

      if (data.criteriaScores && data.criteriaScores.length > 0) {
        // Remove prior criteria scores for this submission if any
        await tx
          .delete(assessmentScores)
          .where(eq(assessmentScores.submissionId, data.submissionId));

        await tx.insert(assessmentScores).values(
          data.criteriaScores.map((c) => ({
            submissionId: data.submissionId,
            criterionId: c.criterionId,
            marksAwarded: String(c.marksAwarded),
            comment: c.comment ?? null,
          }))
        );
      }

      // Mark learner progress as 100% complete
      const [assessment] = await tx
        .select({ resourceId: assessments.resourceId })
        .from(assessments)
        .where(eq(assessments.id, updated.assessmentId))
        .limit(1);

      if (assessment) {
        await tx
          .insert(learnerContentProgress)
          .values({
            resourceId: assessment.resourceId,
            learnerId: updated.learnerId,
            progressPct: '100',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [learnerContentProgress.resourceId, learnerContentProgress.learnerId],
            set: {
              progressPct: '100',
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          });
      }

      return {
        ...updated,
        totalScore: Number(updated.totalScore),
      };
    });
  },
};
