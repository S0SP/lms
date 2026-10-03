import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { getOrCreateDirectThread } from '@/repositories/chatRepository';
import { z } from 'zod';

const createThreadSchema = z.object({
  recipientId: z.string().uuid('Valid recipient user ID is required'),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const { data, error: parseError } = await parseBody(req, createThreadSchema);
  if (parseError || !data) return parseError || apiError('Invalid request body', 400);

  try {
    const result = await getOrCreateDirectThread(session.user.id, data.recipientId);
    return apiSuccess(result, undefined, result.isNew ? 201 : 200);
  } catch (err: any) {
    console.error('Failed to create/get direct thread:', err);
    return apiError(err.message || 'Failed to start chat thread', 500);
  }
}
