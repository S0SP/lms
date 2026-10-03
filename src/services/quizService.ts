import {
  quizRepository,
  CreateQuizParams,
  SubmitQuizAttemptParams,
} from '@/repositories/quizRepository';

export const quizService = {
  async createQuiz(data: CreateQuizParams) {
    if (!data.name?.trim()) {
      throw new Error('Quiz name is required');
    }
    if (!data.questions || data.questions.length === 0) {
      throw new Error('At least one question is required to create a quiz');
    }
    return await quizRepository.create(data);
  },

  async getQuiz(testId: string, isEducator = false, learnerId?: string) {
    // If student, hide correct answers so answers are not exposed in network payloads
    const test = await quizRepository.findById(testId, isEducator);
    if (!test) return null;

    let attempts = null;
    if (learnerId) {
      attempts = await quizRepository.getLearnerAttempts(testId, learnerId);
    }

    return {
      ...test,
      attempts,
    };
  },

  async getQuizByResourceId(resourceId: string, isEducator = false, learnerId?: string) {
    const test = await quizRepository.findByResourceId(resourceId, isEducator);
    if (!test) return null;

    let attempts = null;
    if (learnerId) {
      attempts = await quizRepository.getLearnerAttempts(test.id, learnerId);
    }

    return {
      ...test,
      attempts,
    };
  },

  async startAttempt(testId: string, learnerId: string) {
    const test = await quizRepository.findById(testId, false);
    if (!test) throw new Error('Quiz not found');
    if (!test.isPublished) {
      throw new Error('This quiz is not currently available (revoked or draft).');
    }
    return await quizRepository.startAttempt(testId, learnerId);
  },

  async submitAttempt(data: SubmitQuizAttemptParams) {
    if (!data.answers || !Array.isArray(data.answers)) {
      throw new Error('Answers array is required');
    }
    return await quizRepository.submitAttempt(data);
  },

  async getLearnerAttempts(testId: string, learnerId: string) {
    return await quizRepository.getLearnerAttempts(testId, learnerId);
  },

  async getAttemptDetails(attemptId: string) {
    return await quizRepository.getAttemptDetails(attemptId);
  },
};
