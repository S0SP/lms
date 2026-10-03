import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { timelinePosts, timelineComments, polls, pollOptions, pollResponses, users } from '@/db/schema';
import { eq, desc, inArray, sql, asc, and } from 'drizzle-orm';

// GET /api/v1/courses/[id]/timeline
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const currentUserId = session!.user!.id as string;
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

  // 3. Fetch Polls & Options for posts
  let pollsByPostId: Record<string, any> = {};
  if (postIds.length > 0) {
    const pollRows = await db
      .select()
      .from(polls)
      .where(inArray(polls.postId, postIds));

    if (pollRows.length > 0) {
      const pollIds = pollRows.map((p) => p.id);
      const optionsRows = await db
        .select()
        .from(pollOptions)
        .where(inArray(pollOptions.pollId, pollIds))
        .orderBy(asc(pollOptions.sortOrder));

      const optionIds = optionsRows.map((o) => o.id);

      // Get votes per option
      let voteCounts: Record<string, number> = {};
      let userVotedOptionId: string | null = null;

      if (optionIds.length > 0) {
        const votes = await db
          .select({
            optionId: pollResponses.optionId,
            count: sql<number>`count(*)::int`,
          })
          .from(pollResponses)
          .where(inArray(pollResponses.optionId, optionIds))
          .groupBy(pollResponses.optionId);

        for (const v of votes) {
          voteCounts[v.optionId] = v.count;
        }

        const userVotes = await db
          .select({ optionId: pollResponses.optionId })
          .from(pollResponses)
          .where(and(inArray(pollResponses.optionId, optionIds), eq(pollResponses.learnerId, currentUserId)));

        if (userVotes.length > 0) {
          userVotedOptionId = userVotes[0].optionId;
        }
      }

      for (const p of pollRows) {
        const pOptions = optionsRows
          .filter((o) => o.pollId === p.id)
          .map((o) => ({
            id: o.id,
            body: o.body,
            isCorrect: o.isCorrect,
            votes: voteCounts[o.id] || 0,
          }));

        const totalVotes = pOptions.reduce((acc, curr) => acc + curr.votes, 0);

        pollsByPostId[p.postId] = {
          id: p.id,
          isQuizMode: p.isQuizMode,
          showResultsImmediately: p.showResultsImmediately,
          userVotedOptionId,
          totalVotes,
          options: pOptions.map((o) => ({
            ...o,
            pct: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
          })),
        };
      }
    }
  }

  const enrichedPosts = posts.map((p) => {
    let chitChatData = null;
    let textBody = p.body;
    try {
      if (p.body?.startsWith('{') && p.body?.endsWith('}')) {
        const parsed = JSON.parse(p.body);
        if (parsed.isChitChat) {
          chitChatData = parsed;
          textBody = parsed.description || parsed.title;
        }
      }
    } catch {
      // plain text
    }

    return {
      ...p,
      body: textBody,
      chitChat: chitChatData,
      poll: pollsByPostId[p.id] || null,
      comments: commentsByPostId[p.id] || [],
      commentCount: (commentsByPostId[p.id] || []).length,
    };
  });

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

  // Mode 1: Poll / Quiz creation
  if (body.isPoll) {
    if (!body.question || !body.question.trim()) {
      return apiError('Poll question is required', 400);
    }
    if (!Array.isArray(body.options) || body.options.length < 2) {
      return apiError('At least 2 options are required', 400);
    }

    const [newPost] = await db
      .insert(timelinePosts)
      .values({
        courseId,
        authorId: userId,
        bodyRichtext: body.question.trim(),
        commentsDisabled: !!body.commentsDisabled,
      })
      .returning();

    const [newPoll] = await db
      .insert(polls)
      .values({
        postId: newPost.id,
        isQuizMode: !!body.isQuizMode,
        showResultsImmediately: body.showResultsImmediately !== false,
      })
      .returning();

    const insertedOptions = [];
    for (let i = 0; i < body.options.length; i++) {
      const opt = body.options[i];
      const optBody = typeof opt === 'string' ? opt : opt.text;
      const isCorrect = typeof opt === 'object' ? !!opt.isCorrect : false;

      const [insOpt] = await db
        .insert(pollOptions)
        .values({
          pollId: newPoll.id,
          body: optBody,
          isCorrect,
          sortOrder: i,
        })
        .returning();
      insertedOptions.push({
        ...insOpt,
        votes: 0,
        pct: 0,
      });
    }

    const [author] = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return apiSuccess(
      {
        ...newPost,
        body: newPost.bodyRichtext,
        authorName: author?.name || 'User',
        authorAvatarUrl: author?.avatarUrl || null,
        authorRole: author?.role || 'educator',
        poll: {
          id: newPoll.id,
          isQuizMode: newPoll.isQuizMode,
          showResultsImmediately: newPoll.showResultsImmediately,
          totalVotes: 0,
          options: insertedOptions,
        },
        comments: [],
        commentCount: 0,
      },
      undefined,
      201
    );
  }

  // Mode 2: Chit chat creation
  if (body.isChitChat) {
    if (!body.title?.trim() && !body.description?.trim()) {
      return apiError('Chit-chat title or description is required', 400);
    }

    const payload = JSON.stringify({
      isChitChat: true,
      title: body.title?.trim() || 'Chit chat',
      description: body.description?.trim() || '',
      audioUrl: body.audioUrl || null,
      attachments: body.attachments || [],
    });

    const [newPost] = await db
      .insert(timelinePosts)
      .values({
        courseId,
        authorId: userId,
        bodyRichtext: payload,
        commentsDisabled: !!body.disableLearnerComments,
      })
      .returning();

    const [author] = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return apiSuccess(
      {
        ...newPost,
        body: body.description?.trim() || body.title?.trim(),
        chitChat: {
          isChitChat: true,
          title: body.title?.trim() || 'Chit chat',
          description: body.description?.trim() || '',
          audioUrl: body.audioUrl || null,
          attachments: body.attachments || [],
        },
        authorName: author?.name || 'User',
        authorAvatarUrl: author?.avatarUrl || null,
        authorRole: author?.role || 'educator',
        comments: [],
        commentCount: 0,
      },
      undefined,
      201
    );
  }

  // Mode 3: Normal Post
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

  const [author] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return apiSuccess(
    {
      ...newPost,
      body: newPost.bodyRichtext,
      authorName: author?.name || 'User',
      authorAvatarUrl: author?.avatarUrl || null,
      authorRole: author?.role || 'educator',
      comments: [],
      commentCount: 0,
    },
    undefined,
    201
  );
}
