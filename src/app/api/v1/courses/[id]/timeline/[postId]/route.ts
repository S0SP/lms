import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { timelinePosts, timelineComments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE /api/v1/courses/[id]/timeline/[postId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: courseId, postId } = await params;
  if (!postId) return apiError('Post ID is required', 400);

  const userId = session!.user!.id as string;
  const userRole = (session!.user as any).role as string;

  // Check ownership or admin/educator privilege
  const [existing] = await db
    .select({ id: timelinePosts.id, authorId: timelinePosts.authorId })
    .from(timelinePosts)
    .where(and(eq(timelinePosts.id, postId), eq(timelinePosts.courseId, courseId)))
    .limit(1);

  if (!existing) return apiError('Post not found', 404);

  if (existing.authorId !== userId && !['owner', 'admin', 'educator'].includes(userRole)) {
    return apiError('Forbidden', 403);
  }

  await db.delete(timelinePosts).where(eq(timelinePosts.id, postId));

  return apiSuccess({ deleted: true });
}

// POST /api/v1/courses/[id]/timeline/[postId] - add comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { postId } = await params;
  if (!postId) return apiError('Post ID is required', 400);

  const userId = session!.user!.id as string;
  const body = await req.json();

  if (!body.body || !body.body.trim()) {
    return apiError('Comment text cannot be empty', 400);
  }

  const [comment] = await db
    .insert(timelineComments)
    .values({
      postId,
      authorId: userId,
      body: body.body.trim(),
    })
    .returning();

  const [author] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return apiSuccess(
    {
      ...comment,
      authorName: author?.name || 'User',
      authorAvatarUrl: author?.avatarUrl || null,
    },
    undefined,
    201
  );
}
