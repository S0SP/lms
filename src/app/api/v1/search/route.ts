import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { users, courses, learnerProfiles, educatorProfiles } from '@/db/schema';
import { ilike, or, and, eq, desc } from 'drizzle-orm';

// GET /api/v1/search?q=query
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q) {
    return apiSuccess({ learners: [], courses: [], educators: [] });
  }

  const queryPattern = `%${q}%`;

  try {
    const [matchingLearners, matchingCourses, matchingEducators] = await Promise.all([
      // Search Learners
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          grade: learnerProfiles.grade,
          board: learnerProfiles.board,
        })
        .from(users)
        .leftJoin(learnerProfiles, eq(users.id, learnerProfiles.userId))
        .where(
          and(
            eq(users.role, 'learner'),
            or(
              ilike(users.name, queryPattern),
              ilike(users.email, queryPattern),
              ilike(learnerProfiles.grade, queryPattern),
              ilike(learnerProfiles.board, queryPattern)
            )
          )
        )
        .limit(6),

      // Search Courses
      db
        .select({
          id: courses.id,
          name: courses.name,
          shortCode: courses.shortCode,
          type: courses.type,
          board: courses.board,
          grade: courses.grade,
          status: courses.status,
          thumbnailUrl: courses.thumbnailUrl,
        })
        .from(courses)
        .where(
          or(
            ilike(courses.name, queryPattern),
            ilike(courses.shortCode, queryPattern),
            ilike(courses.board, queryPattern),
            ilike(courses.grade, queryPattern)
          )
        )
        .limit(6),

      // Search Educators
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'educator'),
            or(
              ilike(users.name, queryPattern),
              ilike(users.email, queryPattern)
            )
          )
        )
        .limit(6),
    ]);

    return apiSuccess({
      learners: matchingLearners,
      courses: matchingCourses,
      educators: matchingEducators,
    });
  } catch (err: any) {
    console.error('Search API error:', err);
    return apiError('Failed to execute search query', 500);
  }
}
