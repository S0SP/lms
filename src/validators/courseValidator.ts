import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  type: z.enum(['one_on_one', 'group', 'recorded']).default('one_on_one'),
  description: z.string().optional(),
  board: z.string().optional(),
  grade: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  urlSlug: z.string().optional(),
  cohortMaxLearners: z.number().int().positive().optional(),
  defaultSessionDurationMin: z.number().int().positive().default(60),
  isAdminBooked: z.boolean().default(true),
  educatorIds: z.array(z.string().uuid()).optional(),
  orgId: z.string().uuid().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();
