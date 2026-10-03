import { z } from 'zod';

export const presignedSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(['avatars', 'course-thumbnails', 'submission-files', 'report-pdfs', 'resources', 'chat']),
});
