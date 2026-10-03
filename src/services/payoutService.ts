import { payoutRepository, PayoutQueryFilters } from '@/repositories/payoutRepository';
import { z } from 'zod';
import { createPayoutSchema } from '@/validators/payoutValidator';

export const payoutService = {
  async getPayouts(filters: PayoutQueryFilters) {
    return await payoutRepository.findMany(filters);
  },

  async createPayout(data: z.infer<typeof createPayoutSchema>, processedBy: string) {
    return await payoutRepository.create(data, processedBy);
  }
};
