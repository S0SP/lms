import { z } from 'zod';

export const storeSettingsSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  externalUrl: z.string().url().optional(),
});
