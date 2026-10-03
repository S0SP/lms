import { z } from 'zod';

export const createConsultationSchema = z.object({
  orgId: z.string().uuid().optional(),
  prospectName: z.string().min(1, 'Name is required'),
  prospectEmail: z.string().email('Invalid email address'),
  prospectPhone: z.string().optional(),
  courseId: z.string().uuid().optional(),
  slotAt: z.string().optional(),
  notes: z.string().optional(),
});

export const updateConsultationSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'converted']).optional(),
  notes: z.string().optional(),
  slotAt: z.string().datetime().optional(),
  convertedToLearnerId: z.string().uuid().optional(),
});
