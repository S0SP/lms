import {
  assessmentRepository,
  CreateAssessmentParams,
  SubmitAssessmentParams,
  GradeAssessmentParams,
} from '@/repositories/assessmentRepository';

export const assessmentService = {
  async createAssessment(data: CreateAssessmentParams) {
    if (!data.title?.trim()) {
      throw new Error('Assessment title is required');
    }
    if (!data.maxMarks || data.maxMarks <= 0) {
      throw new Error('Assessment max marks must be greater than 0');
    }
    return await assessmentRepository.create(data);
  },

  async getAssessment(id: string, userId?: string) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) return null;

    let learnerSubmission = null;
    if (userId) {
      learnerSubmission = await assessmentRepository.getLearnerSubmission(id, userId);
    }

    return {
      ...assessment,
      submission: learnerSubmission,
    };
  },

  async getAssessmentByResourceId(resourceId: string, userId?: string) {
    const assessment = await assessmentRepository.findByResourceId(resourceId);
    if (!assessment) return null;

    let learnerSubmission = null;
    if (userId) {
      learnerSubmission = await assessmentRepository.getLearnerSubmission(assessment.id, userId);
    }

    return {
      ...assessment,
      submission: learnerSubmission,
    };
  },

  async submitAssignment(data: SubmitAssessmentParams) {
    const assessment = await assessmentRepository.findById(data.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (!assessment.isPublished) {
      throw new Error('This assignment is not currently accepting submissions (it has been revoked or is in draft).');
    }

    if (assessment.endsOn && new Date() > new Date(assessment.endsOn)) {
      throw new Error(`The deadline for this assignment passed on ${new Date(assessment.endsOn).toLocaleString()}`);
    }

    if (!data.fileR2Keys || data.fileR2Keys.length === 0) {
      throw new Error('At least one uploaded file is required for submission');
    }

    return await assessmentRepository.submit(data);
  },

  async gradeSubmission(data: GradeAssessmentParams) {
    if (data.totalScore < 0) {
      throw new Error('Score cannot be negative');
    }
    return await assessmentRepository.gradeSubmission(data);
  },

  async togglePublish(resourceId: string, isPublished: boolean) {
    return await assessmentRepository.togglePublish(resourceId, isPublished);
  },

  async listSubmissions(assessmentId: string) {
    return await assessmentRepository.listSubmissionsForAssessment(assessmentId);
  },
};
