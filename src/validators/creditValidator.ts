import { z } from 'zod';

export const adjustCreditSchema = z.object({
  courseId: z.string().uuid(),
  learnerId: z.string().uuid(),
  delta: z.number(),
  reason: z.string().optional(),
});
