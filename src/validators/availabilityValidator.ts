import { z } from 'zod';

export const saveAvailabilitySchema = z.object({
  timezone: z.string().min(1),
  scheduleJson: z.record(z.string(), z.array(z.object({ start: z.string(), end: z.string() }))),
  overridesJson: z.record(z.string(), z.any()).optional().default({}),
});
