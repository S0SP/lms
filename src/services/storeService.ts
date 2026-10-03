import { storeRepository } from '@/repositories/storeRepository';
import { z } from 'zod';
import { storeSettingsSchema } from '@/validators/storeValidator';

export const storeService = {
  async getSettings(orgId: string) {
    return await storeRepository.findByOrgId(orgId);
  },

  async updateSettings(data: z.infer<typeof storeSettingsSchema>) {
    return await storeRepository.upsert(data);
  }
};
