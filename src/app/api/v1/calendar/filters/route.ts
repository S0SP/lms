import { NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { courses, users, tags, educatorTags, courseTags, sessions } from '@/db/schema';
import { eq, or, desc, sql } from 'drizzle-orm';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';

const DEFAULT_TIMEZONES = [
  { id: 'Asia/Kolkata', name: 'Asia/Kolkata (GMT +05:30)' },
  { id: 'America/New_York', name: 'America/New_York (GMT -05:00)' },
  { id: 'Europe/London', name: 'Europe/London (GMT +00:00)' },
  { id: 'Asia/Dubai', name: 'Asia/Dubai (GMT +04:00)' },
  { id: 'Asia/Singapore', name: 'Asia/Singapore (GMT +08:00)' },
  { id: 'UTC', name: 'UTC (Coordinated Universal Time)' },
];

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  try {
    // 1. Query all real courses from DB
    const dbCourses = await db
      .select({
        id: courses.id,
        name: courses.name,
        shortCode: courses.shortCode,
        description: courses.description,
      })
      .from(courses)
      .orderBy(courses.name);

    // 2. Query all real educators/admins from DB
    const dbEducators = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(or(eq(users.role, 'educator'), eq(users.role, 'admin'), eq(users.role, 'owner')))
      .orderBy(users.name);

    // 3. Query all real learners from DB
    const dbLearners = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.role, 'learner'))
      .orderBy(users.name);

    // 4. Query all real tags from DB tags table
    const allDbTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        category: tags.category,
      })
      .from(tags)
      .orderBy(desc(tags.createdAt))
      .catch(() => []);

    // Also get tags specifically attached to educators
    const linkedEducatorTags = await db
      .select({ name: tags.name })
      .from(educatorTags)
      .innerJoin(tags, eq(educatorTags.tagId, tags.id))
      .catch(() => []);

    // Also get tags specifically attached to courses
    const linkedCourseTags = await db
      .select({ name: tags.name })
      .from(courseTags)
      .innerJoin(tags, eq(courseTags.tagId, tags.id))
      .catch(() => []);

    // Aggregate unique tag sets
    const educatorTagNames = Array.from(
      new Set([
        ...linkedEducatorTags.map((t) => t.name),
        ...allDbTags.filter((t) => t.category === 'core' || t.category === 'custom').map((t) => t.name),
      ])
    );

    const sessionTagNames = Array.from(
      new Set(
        allDbTags.filter((t) => t.category === 'language' || t.category === 'custom').map((t) => t.name)
      )
    );

    const courseTagNames = Array.from(
      new Set([
        ...linkedCourseTags.map((t) => t.name),
        ...allDbTags.filter((t) => t.category === 'curriculum' || t.category === 'custom').map((t) => t.name),
      ])
    );

    // 5. Query locations: Zoom Online + any distinct locations from sessions
    const locations = [
      { id: 'zoom', name: 'Zoom Online (Cloud)' },
      { id: 'in_person', name: 'In-Person / Campus' },
      { id: 'hybrid', name: 'Hybrid' },
    ];

    return apiSuccess({
      courses: dbCourses,
      educators: dbEducators,
      learners: dbLearners,
      locations,
      educatorTags: educatorTagNames,
      sessionTags: sessionTagNames,
      courseTags: courseTagNames,
      timezones: DEFAULT_TIMEZONES,
    });
  } catch (err: any) {
    console.error('Error fetching calendar filters:', err);
    return apiError(err.message || 'Failed to retrieve calendar filter options', 500);
  }
}
