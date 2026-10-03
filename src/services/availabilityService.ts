import { availabilityRepository } from '@/repositories/availabilityRepository';
import { z } from 'zod';
import { saveAvailabilitySchema } from '@/validators/availabilityValidator';

export const availabilityService = {
  async getAvailability(educatorId: string) {
    return await availabilityRepository.findByEducatorId(educatorId);
  },

  async saveAvailability(educatorId: string, data: z.infer<typeof saveAvailabilitySchema>) {
    await availabilityRepository.upsert(educatorId, data);
  }
};
