import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { queryFreeBusy } from '@/lib/integrations/googleCalendar';
import { z } from 'zod';

const freebusySchema = z.object({
  educatorId: z.string().uuid(),
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = freebusySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.message, 400);
    }

    const { educatorId, timeMin, timeMax } = parsed.data;
    const busySlots = await queryFreeBusy(educatorId, new Date(timeMin), new Date(timeMax));

    return apiSuccess({ busy: busySlots });
  } catch (err: any) {
    return apiError(err.message || 'Failed to query free/busy calendar status', 500);
  }
}
