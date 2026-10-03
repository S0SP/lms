import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getLearnerCourseWorkspace } from '@/repositories/courseRepository';
import { CourseWorkspaceClient } from '@/components/course/CourseWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function CourseWorkspacePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const workspace = await getLearnerCourseWorkspace(courseId, session.user.id as string);
  if (!workspace) notFound();

  // Enrolment is the authorisation boundary for the workspace. A learner who is
  // not on the roster must not be able to read the curriculum by guessing a UUID.
  if (!workspace.enrollment || workspace.enrollment.status === 'cancelled') notFound();

  const educatorNames = workspace.educators.map((e) => e.name);
  const primaryEducator = educatorNames.length > 0 ? educatorNames.join(', ') : 'No educator assigned';

  return (
    <CourseWorkspaceClient
      course={{
        id: workspace.course.id,
        name: workspace.course.name,
        code: workspace.course.shortCode ?? workspace.course.id.slice(0, 8).toUpperCase(),
        educator: primaryEducator,
        creditsUsed: workspace.credits?.consumed ?? 0,
        creditsTotal: workspace.credits?.total ?? 0,
        nextSession: workspace.nextSession
          ? {
              id: workspace.nextSession.id,
              title: workspace.nextSession.title,
              scheduledAtLabel: new Date(workspace.nextSession.scheduledAt).toLocaleString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }),
              provider:
                workspace.nextSession.hostedBy === 'educator'
                  ? 'Hosted by educator'
                  : 'Hosted by admin',
              joinUrl: workspace.nextSession.zoomMeetingUrl,
            }
          : null,
      }}
      timeline={workspace.timeline}
      content={workspace.content}
    />
  );
}
