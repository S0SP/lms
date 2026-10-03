import { creditRepository } from '@/repositories/creditRepository';
import { z } from 'zod';
import { adjustCreditSchema } from '@/validators/creditValidator';

export const creditService = {
  async getLearnerCourseCredit(courseId: string, learnerId: string) {
    return await creditRepository.getCredit(courseId, learnerId);
  },

  async adjustCredit(data: z.infer<typeof adjustCreditSchema>, adminId: string) {
    return await creditRepository.adjustCredit(data, adminId);
  }
};
