import { z } from 'zod';

export const inviteEducatorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  payoutDefaultRate: z.number().min(0).default(0),
  payoutCurrency: z.string().default('INR'),
});
