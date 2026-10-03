import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { sessionService } from '@/services/sessionService';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/sessions/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const { id } = await params;
  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;

  const sess = await sessionService.getSessionById(id);

  if (!sess) return apiError('Session not found', 404);

  // RBAC: educators can only view their own sessions
  if (role === 'educator' && sess.educatorId !== userId) {
    return apiError('Forbidden', 403);
  }

  // Get attendees
  const attendees = await sessionService.getSessionAttendees(id);

  // Get feedback (educators and admins only)
  let feedback = null;
  if (role !== 'learner' && role !== 'parent') {
    feedback = await sessionService.getSessionFeedback(id);
  }

  return apiSuccess({ ...sess, attendees, feedback });
}

// PATCH /api/v1/sessions/[id]
const patchSessionSchema = z.object({
  title: z.string().min(1).optional(),
  topic: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(15).max(480).optional(),
  status: z.enum(['scheduled', 'live', 'completed', 'cancelled', 'no_show']).optional(),
  creditsConsumed: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const data = parsed.data;

  // Check session exists
  const existing = await sessionService.getSessionById(id);
  if (!existing) return apiError('Session not found', 404);

  // Educator can only update their own sessions
  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  if (role === 'educator' && existing.educatorId !== userId) {
    return apiError('Forbidden', 403);
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.topic !== undefined) updateData.topic = data.topic;
  if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
  if (data.durationMin !== undefined) updateData.durationMin = data.durationMin;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.creditsConsumed !== undefined) updateData.creditsConsumed = String(data.creditsConsumed);

  // If cancelling, stamp cancelledAt
  if (data.status === 'cancelled') {
    updateData.cancelledAt = new Date();
    updateData.cancelledBy = userId;
  }

  const updated = await sessionService.updateSession(id, updateData);

  return apiSuccess(updated);
}

// DELETE /api/v1/sessions/[id] — admin only
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;

  const existing = await sessionService.getSessionById(id);
  if (!existing) return apiError('Session not found', 404);

  await sessionService.deleteSession(id);

  return apiSuccess({ deleted: true });
}
