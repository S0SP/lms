import { z } from 'zod';

export const createLearnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  board: z.string().optional(),
  grade: z.string().optional(),
  dob: z.string().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  privateNote: z.string().optional(),
  loginPin: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
