import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { sessionService } from '@/services/sessionService';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
    if (error) return error;

    const role = (session!.user as any).role as string;
    const currentUserId = session!.user!.id as string;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return apiError('Invalid JSON request body', 400);
    }

    if (role === 'educator') {
      body.educatorId = currentUserId;
    }

    if (!body.courseId || !body.educatorId || !body.title || !body.slots || !Array.isArray(body.slots) || body.slots.length === 0) {
      return apiError('courseId, educatorId, title, and at least one slot are required', 400);
    }

    const result = await sessionService.createSessionsBulk({
      courseId: body.courseId,
      educatorId: body.educatorId,
      title: body.title,
      topic: body.topic,
      durationMin: Number(body.durationMin) || 60,
      creditsConsumed: body.creditsConsumed !== undefined ? Number(body.creditsConsumed) : 1,
      learnerIds: Array.isArray(body.learnerIds) ? Array.from(new Set(body.learnerIds)) : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      createZoomMeeting: body.createZoomMeeting !== false,
      slots: body.slots,
      createdById: currentUserId,
    });

    return apiSuccess(result, undefined, 201);
  } catch (err: any) {
    console.error('[sessions/bulk/POST] Error creating sessions in bulk:', err);
    return apiError(err?.message || 'Failed to create sessions', 500);
  }
}
