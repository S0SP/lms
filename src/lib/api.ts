import { auth } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

type AllowedRole = 'owner' | 'admin' | 'educator' | 'learner' | 'parent';

/**
 * Validates Auth.js session and checks role authorization.
 * Call at the top of every Route Handler before any DB operations.
 *
 * @example
 * const { session, error } = await requireAuth(['admin', 'owner']);
 * if (error) return error;
 * // session.user.id and session.user.role are now safe to use
 */
export async function requireAuth(allowedRoles?: AllowedRole[]) {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const userRole = (session.user as any).role as AllowedRole;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * Typed JSON success response with consistent envelope.
 */
export function apiSuccess<T>(
  data: T,
  meta?: { total?: number; page?: number; perPage?: number },
  status = 200,
) {
  return NextResponse.json({ data, meta: meta ?? null, error: null }, { status });
}

/**
 * Typed JSON error response.
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

/**
 * Validates a JSON request body against a Zod schema.
 *
 * Call after requireAuth so an unauthenticated request never triggers schema
 * work. Returns field-level details so clients can highlight the bad input
 * instead of showing a generic failure.
 *
 * @example
 * const { data, error } = await parseBody(req, updateReportSchema);
 * if (error) return error;
 */
export async function parseBody<TSchema extends z.ZodType>(
  req: NextRequest,
  schema: TSchema,
): Promise<{ data: z.infer<TSchema> | null; error: NextResponse | null }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { data: null, error: 'Invalid JSON body', details: [] },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          data: null,
          error: 'Validation failed',
          details: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 422 },
      ),
    };
  }

  return { data: result.data, error: null };
}
