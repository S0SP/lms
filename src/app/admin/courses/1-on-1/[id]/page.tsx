import React from 'react';
import { CourseWorkspace1on1 } from '@/components/courses/1on1/CourseWorkspace1on1';

export const dynamic = 'force-dynamic';

export default async function AdminCourseWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CourseWorkspace1on1 courseId={id} userRole="admin" />;
}
