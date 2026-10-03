import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { timelinePosts, timelineComments, users } from '@/db/schema';
import { eq, desc, inArray, sql } from 'drizzle-orm';

// GET /api/v1/courses/[id]/timeline
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) return apiError('Course ID is required', 400);

  // 1. Fetch posts for course
  const posts = await db
    .select({
      id: timelinePosts.id,
      body: timelinePosts.bodyRichtext,
      commentsDisabled: timelinePosts.commentsDisabled,
      createdAt: timelinePosts.createdAt,
      authorId: timelinePosts.authorId,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorRole: users.role,
    })
    .from(timelinePosts)
    .innerJoin(users, eq(timelinePosts.authorId, users.id))
    .where(eq(timelinePosts.courseId, courseId))
    .orderBy(desc(timelinePosts.createdAt));

  const postIds = posts.map((p) => p.id);

  // 2. Fetch comments if any posts exist
  let commentsByPostId: Record<string, any[]> = {};
  if (postIds.length > 0) {
    const rawComments = await db
      .select({
        id: timelineComments.id,
        postId: timelineComments.postId,
        body: timelineComments.body,
        createdAt: timelineComments.createdAt,
        authorId: timelineComments.authorId,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(timelineComments)
      .innerJoin(users, eq(timelineComments.authorId, users.id))
      .where(inArray(timelineComments.postId, postIds))
      .orderBy(timelineComments.createdAt);

    for (const c of rawComments) {
      if (!commentsByPostId[c.postId]) {
        commentsByPostId[c.postId] = [];
      }
      commentsByPostId[c.postId].push(c);
    }
  }

  const enrichedPosts = posts.map((p) => ({
    ...p,
    comments: commentsByPostId[p.id] || [],
    commentCount: (commentsByPostId[p.id] || []).length,
  }));

  return apiSuccess(enrichedPosts);
}

// POST /api/v1/courses/[id]/timeline
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) return apiError('Course ID is required', 400);

  const userId = session!.user!.id as string;
  const body = await req.json();

  if (!body.body || !body.body.trim()) {
    return apiError('Post body cannot be empty', 400);
  }

  const [newPost] = await db
    .insert(timelinePosts)
    .values({
      courseId,
      authorId: userId,
      bodyRichtext: body.body.trim(),
      commentsDisabled: !!body.commentsDisabled,
    })
    .returning();

  // Fetch author details
  const [author] = await db
    .select({
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return apiSuccess(
    {
      ...newPost,
      body: newPost.bodyRichtext,
      authorName: author?.name || 'Educator',
      authorAvatarUrl: author?.avatarUrl || null,
      authorRole: author?.role || 'educator',
      comments: [],
      commentCount: 0,
    },
    undefined,
    201
  );
}
