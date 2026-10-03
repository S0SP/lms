import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { disconnectCalendar } from '@/lib/integrations/googleCalendar';

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const currentUserId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const educatorId = role === 'educator' ? currentUserId : (searchParams.get('educatorId') || currentUserId);

  const success = await disconnectCalendar(educatorId);
  if (!success) {
    return apiError('Failed to disconnect Google Calendar', 500);
  }

  return apiSuccess({ disconnected: true });
}
