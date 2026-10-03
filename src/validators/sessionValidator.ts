import { z } from 'zod';

export const createSessionSchema = z.object({
  courseId: z.string().uuid(),
  educatorId: z.string().uuid(),
  title: z.string().min(1),
  topic: z.string().optional(),
  scheduledAt: z.string().datetime(), // ISO datetime string
  durationMin: z.number().int().min(15).max(480).default(60), // Max 8 hours
  creditsConsumed: z.number().min(0).default(1),
  learnerIds: z.array(z.string().uuid()).default([]),
  createZoomMeeting: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  recurrence: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
      count: z.number().int().min(1).max(52).default(4),
    })
    .optional(),
});

export const updateSessionSchema = createSessionSchema.partial();
