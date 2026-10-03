import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { uploadService } from '@/services/uploadService';
import { presignedSchema } from '@/validators/uploadValidator';

// POST /api/v1/uploads/presigned-url
// Returns a signed PUT URL. Client uploads directly to R2 — server never touches the bytes.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = presignedSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const { fileName, contentType, folder } = parsed.data;

  const result = await uploadService.generatePresignedUrl(fileName, contentType, folder);

  return apiSuccess(result);
}
