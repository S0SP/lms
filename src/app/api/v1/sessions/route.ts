import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { sessionService } from '@/services/sessionService';
import { createSessionSchema } from '@/validators/sessionValidator';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const courseIdsParam = searchParams.get('courseIds');
  const educatorIdsParam = searchParams.get('educatorIds');
  const learnerIdsParam = searchParams.get('learnerIds');

  const result = await sessionService.getSessions({
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    status: searchParams.get('status') || undefined,
    courseId: searchParams.get('courseId') || undefined,
    courseIds: courseIdsParam ? courseIdsParam.split(',').filter(Boolean) : undefined,
    educatorId: role === 'educator' ? userId : (searchParams.get('educatorId') || undefined),
    educatorIds: educatorIdsParam ? educatorIdsParam.split(',').filter(Boolean) : undefined,
    learnerId: role === 'learner' ? userId : (searchParams.get('learnerId') || undefined),
    learnerIds: learnerIdsParam ? learnerIdsParam.split(',').filter(Boolean) : undefined,
    parentUserId: role === 'parent' ? userId : undefined,
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    perPage: Math.min(500, parseInt(searchParams.get('perPage') ?? '150'))
  });

  return apiSuccess(result.sessions, { page: result.page, perPage: result.perPage });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const currentUserId = session!.user!.id as string;
  const body = await req.json();

  if (role === 'educator') {
    body.educatorId = currentUserId;
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const newSession = await sessionService.createSession(parsed.data);

  return apiSuccess(newSession, undefined, 201);
}

