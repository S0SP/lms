import { db } from '@/lib/drizzle';
import { users, parentProfiles, courseEnrollments, courses, courseEducators } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { UsersWorkspaceClient, LearnerRow, EducatorRow } from '@/components/admin/UsersWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // 1. Fetch learners
  const rawLearners = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'learner'))
    .orderBy(desc(users.createdAt))
    .limit(100);

  const learnerIds = rawLearners.map((l) => l.id);

  // 2. Fetch parent links for these learners
  const parentsMap = new Map<string, { id: string; name: string; email: string }[]>();
  if (learnerIds.length > 0) {
    const parentRows = await db
      .select({
        learnerId: parentProfiles.learnerId,
        parentId: users.id,
        parentName: users.name,
        parentEmail: users.email,
      })
      .from(parentProfiles)
      .innerJoin(users, eq(parentProfiles.userId, users.id))
      .where(inArray(parentProfiles.learnerId, learnerIds));

    parentRows.forEach((p) => {
      if (!parentsMap.has(p.learnerId)) parentsMap.set(p.learnerId, []);
      parentsMap.get(p.learnerId)!.push({
        id: p.parentId,
        name: p.parentName,
        email: p.parentEmail,
      });
    });
  }

  // 3. Fetch courses enrolled for these learners
  const coursesMap = new Map<string, { id: string; name: string }[]>();
  if (learnerIds.length > 0) {
    const enrollmentRows = await db
      .select({
        learnerId: courseEnrollments.learnerId,
        courseId: courses.id,
        courseName: courses.name,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(inArray(courseEnrollments.learnerId, learnerIds));

    enrollmentRows.forEach((c) => {
      if (!coursesMap.has(c.learnerId)) coursesMap.set(c.learnerId, []);
      coursesMap.get(c.learnerId)!.push({
        id: c.courseId,
        name: c.courseName,
      });
    });
  }

  const learners: LearnerRow[] = rawLearners.map((l) => ({
    id: l.id,
    name: l.name || 'Unnamed Learner',
    email: l.email,
    phone: l.phone,
    avatarUrl: l.avatarUrl,
    createdAt: l.createdAt?.toISOString() ?? new Date().toISOString(),
    parents: parentsMap.get(l.id) || [],
    courses: coursesMap.get(l.id) || [],
  }));

  // 4. Fetch educators
  const rawEducators = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'educator'))
    .orderBy(desc(users.createdAt))
    .limit(100);

  const educatorIds = rawEducators.map((e) => e.id);

  // 5. Fetch assigned courses for these educators
  const educatorCoursesMap = new Map<string, { id: string; name: string }[]>();
  if (educatorIds.length > 0) {
    const educatorCourseRows = await db
      .select({
        educatorId: courseEducators.educatorId,
        courseId: courses.id,
        courseName: courses.name,
      })
      .from(courseEducators)
      .innerJoin(courses, eq(courseEducators.courseId, courses.id))
      .where(inArray(courseEducators.educatorId, educatorIds));

    educatorCourseRows.forEach((ec) => {
      if (!educatorCoursesMap.has(ec.educatorId)) educatorCoursesMap.set(ec.educatorId, []);
      educatorCoursesMap.get(ec.educatorId)!.push({
        id: ec.courseId,
        name: ec.courseName,
      });
    });
  }

  const educators: EducatorRow[] = rawEducators.map((e) => ({
    id: e.id,
    name: e.name || 'Unnamed Educator',
    email: e.email,
    phone: e.phone,
    avatarUrl: e.avatarUrl,
    createdAt: e.createdAt?.toISOString() ?? new Date().toISOString(),
    courses: educatorCoursesMap.get(e.id) || [],
  }));

  return <UsersWorkspaceClient learners={learners} educators={educators} />;
}
