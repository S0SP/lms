import { educatorRepository, EducatorQueryFilters } from '@/repositories/educatorRepository';
import { z } from 'zod';
import { inviteEducatorSchema } from '@/validators/educatorValidator';
import { sendEducatorInvite } from '@/lib/email';
import { config } from '@/config/unifiedConfig';

export const educatorService = {
  async getEducators(filters: EducatorQueryFilters) {
    return await educatorRepository.findMany(filters);
  },

  async inviteEducator(data: z.infer<typeof inviteEducatorSchema>, orgId?: string | null) {
    const newEducator = await educatorRepository.invite(data, orgId);

    // Send invitation email in background (non-blocking)
    if (newEducator.email) {
      sendEducatorInvite({
        to: newEducator.email,
        name: newEducator.name,
        phone: (newEducator as any).phone,
        loginUrl: `${config.appUrl}/login`,
      }).catch((err) => console.error('[educatorService] Failed to send invite email:', err));
    }

    return newEducator;
  }
};
