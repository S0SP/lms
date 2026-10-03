import { learnerRepository, LearnerQueryFilters } from '@/repositories/learnerRepository';
import { z } from 'zod';
import { createLearnerSchema } from '@/validators/learnerValidator';
import { sendLearnerInvite, sendParentInvite } from '@/lib/email';
import { config } from '@/config/unifiedConfig';

export const learnerService = {
  async getLearners(filters: LearnerQueryFilters) {
    return await learnerRepository.findMany(filters);
  },

  async createLearner(data: z.infer<typeof createLearnerSchema>, orgId?: string | null) {
    const newLearner = await learnerRepository.create(data, orgId);

    // Send invitation email in background (non-blocking)
    if (newLearner.email) {
      sendLearnerInvite({
        to: newLearner.email,
        name: newLearner.name,
        phone: newLearner.phone,
        pin: (newLearner as any).loginPin || '8128',
        loginUrl: `${config.appUrl}/login`,
        parentName: data.parentName,
      }).catch((err) => console.error('[learnerService] Failed to send learner invite email:', err));
    }

    if (data.parentEmail) {
      sendParentInvite({
        to: data.parentEmail,
        name: data.parentName || 'Parent',
        phone: data.parentPhone,
        learnerName: newLearner.name,
        loginUrl: `${config.appUrl}/login`,
      }).catch((err) => console.error('[learnerService] Failed to send parent invite email:', err));
    }

    return newLearner;
  },

  async getLearnerById(id: string, includePrivateNote: boolean = false) {
    return await learnerRepository.findById(id, includePrivateNote);
  }
};
