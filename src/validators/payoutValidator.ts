import { z } from 'zod';

export const createPayoutSchema = z.object({
  educatorId: z.string().uuid(),
  cyclePeriod: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  notes: z.string().optional(),
  sessionIds: z.array(z.string().uuid()).optional(),
});
