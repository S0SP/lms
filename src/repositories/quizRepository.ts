import { db } from '@/lib/drizzle';
import {
  tests,
  testQuestions,
  testQuestionOptions,
  testAttempts,
  testAnswers,
  contentResources,
  learnerContentProgress,
  users,
} from '@/db/schema';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';

export interface CreateQuizQuestionOption {
  body: string;
  isCorrect?: boolean;
}

export interface CreateQuizQuestion {
  bodyRichtext: string;
  type?: 'single_correct' | 'multi_correct' | 'number' | 'fill_blank' | 'ranking' | 'match' | 'poll' | 'long_answer';
  marks?: number;
  timeLimitSeconds?: number;
  options: CreateQuizQuestionOption[];
}

export interface CreateQuizParams {
  sectionId: string;
  name: string;
  timeLimitSeconds?: number;
  shuffleOptions?: boolean;
  negativeMarking?: number;
  isPublished?: boolean;
  questions: CreateQuizQuestion[];
}

export interface SubmitQuizAttemptParams {
  attemptId: string;
  learnerId: string;
  answers: {
    questionId: string;
    answerJson: any; // e.g. { selectedOptionIds: string[] } or { textAnswer: string }
  }[];
}

export const quizRepository = {
  async create(data: CreateQuizParams) {
    return await db.transaction(async (tx) => {
      // 1. Create content resource
      const [resource] = await tx
        .insert(contentResources)
        .values({
          sectionId: data.sectionId,
          type: 'test',
          title: data.name,
          isPublished: data.isPublished ?? true,
        })
        .returning();

      if (!resource) throw new Error('Failed to create content resource for quiz');

      // 2. Create test header
      const [test] = await tx
        .insert(tests)
        .values({
          resourceId: resource.id,
          name: data.name,
          status: data.isPublished ? 'published' : 'draft',
          shuffleOptions: data.shuffleOptions ?? false,
          negativeMarking: data.negativeMarking !== undefined ? String(data.negativeMarking) : null,
          timeLimitSeconds: data.timeLimitSeconds ?? null,
        })
        .returning();

      // 3. Create questions and options
      for (let qIdx = 0; qIdx < data.questions.length; qIdx++) {
        const q = data.questions[qIdx];
        const [question] = await tx
          .insert(testQuestions)
          .values({
            testId: test.id,
            bodyRichtext: q.bodyRichtext,
            type: q.type ?? 'single_correct',
            marks: String(q.marks ?? 1),
            timeLimitSeconds: q.timeLimitSeconds ?? null,
            sortOrder: qIdx,
          })
          .returning();

        if (q.options && q.options.length > 0) {
          await tx.insert(testQuestionOptions).values(
            q.options.map((opt, oIdx) => ({
              questionId: question.id,
              body: opt.body,
              isCorrect: opt.isCorrect ?? false,
              sortOrder: oIdx,
            }))
          );
        }
      }

      return {
        ...test,
        resource,
      };
    });
  },

  async findById(testId: string, includeAnswers = true) {
    const [test] = await db
      .select({
        id: tests.id,
        resourceId: tests.resourceId,
        name: tests.name,
        status: tests.status,
        shuffleOptions: tests.shuffleOptions,
        negativeMarking: tests.negativeMarking,
        timeLimitSeconds: tests.timeLimitSeconds,
        createdAt: tests.createdAt,
        isPublished: contentResources.isPublished,
        sectionId: contentResources.sectionId,
      })
      .from(tests)
      .innerJoin(contentResources, eq(tests.resourceId, contentResources.id))
      .where(eq(tests.id, testId))
      .limit(1);

    if (!test) return null;

    const questions = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.testId, testId))
      .orderBy(asc(testQuestions.sortOrder));

    const questionIds = questions.map((q) => q.id);
    const options = questionIds.length > 0
      ? await db
          .select({
            id: testQuestionOptions.id,
            questionId: testQuestionOptions.questionId,
            body: testQuestionOptions.body,
            sortOrder: testQuestionOptions.sortOrder,
            isCorrect: includeAnswers ? testQuestionOptions.isCorrect : sql<boolean>`NULL`,
          })
          .from(testQuestionOptions)
          .where(inArray(testQuestionOptions.questionId, questionIds))
          .orderBy(asc(testQuestionOptions.sortOrder))
      : [];

    const optionsByQuestion = new Map<string, typeof options>();
    for (const opt of options) {
      if (!optionsByQuestion.has(opt.questionId)) {
        optionsByQuestion.set(opt.questionId, []);
      }
      optionsByQuestion.get(opt.questionId)!.push(opt);
    }

    return {
      ...test,
      negativeMarking: test.negativeMarking ? Number(test.negativeMarking) : null,
      questions: questions.map((q) => ({
        ...q,
        marks: Number(q.marks),
        options: optionsByQuestion.get(q.id) || [],
      })),
    };
  },

  async findByResourceId(resourceId: string, includeAnswers = true) {
    const [test] = await db
      .select({ id: tests.id })
      .from(tests)
      .where(eq(tests.resourceId, resourceId))
      .limit(1);

    if (!test) return null;
    return this.findById(test.id, includeAnswers);
  },

  async startAttempt(testId: string, learnerId: string) {
    const [attempt] = await db
      .insert(testAttempts)
      .values({
        testId,
        learnerId,
        startedAt: new Date(),
      })
      .returning();

    return attempt;
  },

  async submitAttempt(data: SubmitQuizAttemptParams) {
    return await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(testAttempts)
        .where(
          and(
            eq(testAttempts.id, data.attemptId),
            eq(testAttempts.learnerId, data.learnerId)
          )
        )
        .limit(1);

      if (!attempt) throw new Error('Test attempt not found');

      // Fetch questions and correct options to auto-grade
      const questions = await tx
        .select()
        .from(testQuestions)
        .where(eq(testQuestions.testId, attempt.testId));

      const questionIds = questions.map((q) => q.id);
      const allOptions = questionIds.length > 0
        ? await tx
            .select()
            .from(testQuestionOptions)
            .where(inArray(testQuestionOptions.questionId, questionIds))
        : [];

      const [test] = await tx
        .select({
          negativeMarking: tests.negativeMarking,
          resourceId: tests.resourceId,
        })
        .from(tests)
        .where(eq(tests.id, attempt.testId))
        .limit(1);

      const negMark = test?.negativeMarking ? Number(test.negativeMarking) : 0;
      let totalAutoScore = 0;

      // Clean existing answers for this attempt if resubmitting
      await tx.delete(testAnswers).where(eq(testAnswers.attemptId, attempt.id));

      for (const ans of data.answers) {
        const q = questions.find((item) => item.id === ans.questionId);
        if (!q) continue;

        const qMarks = Number(q.marks);
        const correctOptions = allOptions.filter(
          (o) => o.questionId === q.id && o.isCorrect
        );
        const correctOptionIds = new Set(correctOptions.map((o) => o.id));

        let isCorrect: boolean | null = null;
        let marksAwarded = 0;

        // Auto-scoring logic based on question type
        if (q.type === 'single_correct') {
          const selectedId = ans.answerJson?.selectedOptionId || ans.answerJson?.selectedOptionIds?.[0];
          if (selectedId) {
            isCorrect = correctOptionIds.has(selectedId);
            marksAwarded = isCorrect ? qMarks : -negMark;
          }
        } else if (q.type === 'multi_correct') {
          const selectedIds: string[] = ans.answerJson?.selectedOptionIds || [];
          if (selectedIds.length > 0) {
            const hasAllCorrect =
              correctOptions.length === selectedIds.length &&
              selectedIds.every((id) => correctOptionIds.has(id));
            isCorrect = hasAllCorrect;
            marksAwarded = isCorrect ? qMarks : -negMark;
          }
        } else if (q.type === 'number' || q.type === 'fill_blank') {
          const textAns = String(ans.answerJson?.textAnswer || '').trim().toLowerCase();
          const matches = correctOptions.some(
            (o) => o.body.trim().toLowerCase() === textAns
          );
          isCorrect = matches;
          marksAwarded = isCorrect ? qMarks : 0;
        }

        if (marksAwarded > 0) {
          totalAutoScore += marksAwarded;
        }

        await tx.insert(testAnswers).values({
          attemptId: attempt.id,
          questionId: q.id,
          answerJson: ans.answerJson,
          isCorrect,
          marksAwarded: String(Math.max(0, marksAwarded)),
        });
      }

      // Update attempt with autoScore & submittedAt
      const [updatedAttempt] = await tx
        .update(testAttempts)
        .set({
          autoScore: String(totalAutoScore),
          submittedAt: new Date(),
        })
        .where(eq(testAttempts.id, attempt.id))
        .returning();

      // Update learner progress to 100% complete
      if (test?.resourceId) {
        await tx
          .insert(learnerContentProgress)
          .values({
            resourceId: test.resourceId,
            learnerId: data.learnerId,
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
        ...updatedAttempt,
        autoScore: Number(updatedAttempt.autoScore),
      };
    });
  },

  async getLearnerAttempts(testId: string, learnerId: string) {
    const attempts = await db
      .select({
        id: testAttempts.id,
        testId: testAttempts.testId,
        startedAt: testAttempts.startedAt,
        submittedAt: testAttempts.submittedAt,
        autoScore: testAttempts.autoScore,
      })
      .from(testAttempts)
      .where(
        and(eq(testAttempts.testId, testId), eq(testAttempts.learnerId, learnerId))
      )
      .orderBy(desc(testAttempts.startedAt));

    return attempts.map((a) => ({
      ...a,
      autoScore: a.autoScore !== null ? Number(a.autoScore) : null,
    }));
  },

  async getAttemptDetails(attemptId: string) {
    const [attempt] = await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.id, attemptId))
      .limit(1);

    if (!attempt) return null;

    const answers = await db
      .select({
        id: testAnswers.id,
        questionId: testAnswers.questionId,
        answerJson: testAnswers.answerJson,
        isCorrect: testAnswers.isCorrect,
        marksAwarded: testAnswers.marksAwarded,
      })
      .from(testAnswers)
      .where(eq(testAnswers.attemptId, attemptId));

    return {
      ...attempt,
      autoScore: attempt.autoScore !== null ? Number(attempt.autoScore) : null,
      answers: answers.map((a) => ({
        ...a,
        marksAwarded: a.marksAwarded !== null ? Number(a.marksAwarded) : null,
      })),
    };
  },
};
