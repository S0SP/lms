import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { listAvailableChatRecipients } from '@/repositories/chatRepository';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  try {
    const recipients = await listAvailableChatRecipients(session.user.id);
    return apiSuccess(recipients);
  } catch (err: any) {
    console.error('Failed to list chat recipients:', err);
    return apiError(err.message || 'Failed to list recipients', 500);
  }
}
