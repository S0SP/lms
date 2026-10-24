import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { sessionAttendees, users, zoomAttendance } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/sessions/[id]/attendance
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const { id: sessionId } = await params;

  try {
    const attendees = await db
      .select({
        id: sessionAttendees.id,
        learnerId: sessionAttendees.learnerId,
        learnerName: users.name,
        learnerEmail: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(sessionAttendees)
      .innerJoin(users, eq(sessionAttendees.learnerId, users.id))
      .where(eq(sessionAttendees.sessionId, sessionId));

    const zoomLogs = await db
      .select()
      .from(zoomAttendance)
      .where(eq(zoomAttendance.sessionId, sessionId));

    const enriched = attendees.map((att) => {
      const zoomLog = zoomLogs.find((z) => z.userId === att.learnerId);
      return {
        ...att,
        isPresent: Boolean(zoomLog) || true,
        joinTime: zoomLog?.eventAt || null,
        durationSeconds: zoomLog?.durationSeconds || null,
      };
    });

    return apiSuccess(enriched);
  } catch (err: any) {
    console.error('Error fetching attendance:', err);
    return apiError('Failed to fetch session attendance', 500);
  }
}

// POST /api/v1/sessions/[id]/attendance
// Add or update attendees for this session
const addAttendeeSchema = z.object({
  learnerId: z.string().uuid(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id: sessionId } = await params;
  const body = await req.json();
  const parsed = addAttendeeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  try {
    const [created] = await db
      .insert(sessionAttendees)
      .values({
        sessionId,
        learnerId: parsed.data.learnerId,
      })
      .returning();

    return apiSuccess(created, undefined, 201);
  } catch (err: any) {
    return apiError(err.message || 'Failed to update attendance', 500);
  }
}
