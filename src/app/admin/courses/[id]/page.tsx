import React from 'react';
import { db } from '@/lib/drizzle';
import { courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { CourseWorkspace1on1 } from '@/components/courses/1on1/CourseWorkspace1on1';
import EducatorCourseWorkspace from '@/app/educator/courses/[id]/page';

export const dynamic = 'force-dynamic';

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);

  if (!course) {
    redirect('/admin/courses');
  }

  if (course.type === 'one_on_one') {
    return <CourseWorkspace1on1 courseId={id} userRole="admin" />;
  }

  return <EducatorCourseWorkspace params={params} />;
}
