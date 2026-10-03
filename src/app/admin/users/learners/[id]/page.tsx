import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  users,
  learnerProfiles,
  parentProfiles,
  courseEnrollments,
  courses,
  credits,
  sessionAttendees,
  sessions,
} from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  CreditCard,
  Clock,
  Shield,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { LearnerNoteEditor } from '@/components/admin/LearnerNoteEditor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LearnerDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role !== 'owner' && role !== 'admin') redirect('/');

  const { id } = await params;

  const [learner] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      createdAt: users.createdAt,
      board: learnerProfiles.board,
      grade: learnerProfiles.grade,
      dob: learnerProfiles.dob,
      privateNote: learnerProfiles.privateNote,
    })
    .from(users)
    .leftJoin(learnerProfiles, eq(users.id, learnerProfiles.userId))
    .where(and(eq(users.id, id), eq(users.role, 'learner')))
    .limit(1);

  if (!learner) {
    notFound();
  }

  // Linked parents
  const parents = await db
    .select({
      id: parentProfiles.id,
      name: parentProfiles.name,
      email: parentProfiles.email,
      phone: parentProfiles.phone,
      relationship: parentProfiles.relationship,
    })
    .from(parentProfiles)
    .where(eq(parentProfiles.learnerId, id));

  // Enrolled courses + credit balances
  const enrolledCourses = await db
    .select({
      enrollmentId: courseEnrollments.id,
      status: courseEnrollments.status,
      enrolledAt: courseEnrollments.enrolledAt,
      courseId: courses.id,
      courseName: courses.name,
      courseType: courses.type,
      totalCredits: credits.total,
      consumedCredits: credits.consumed,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .leftJoin(credits, and(eq(credits.courseId, courses.id), eq(credits.learnerId, id)))
    .where(eq(courseEnrollments.learnerId, id))
    .orderBy(desc(courseEnrollments.enrolledAt));

  // Upcoming sessions
  const upcomingSessions = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      scheduledAt: sessions.scheduledAt,
      durationMin: sessions.durationMin,
      status: sessions.status,
      zoomMeetingUrl: sessions.zoomMeetingUrl,
    })
    .from(sessionAttendees)
    .innerJoin(sessions, eq(sessionAttendees.sessionId, sessions.id))
    .where(and(eq(sessionAttendees.learnerId, id), sql`${sessions.scheduledAt} >= now()`))
    .orderBy(sessions.scheduledAt)
    .limit(5);

  const initials = learner.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/admin/users/learners"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learners
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {learner.avatarUrl ? (
              <img
                src={learner.avatarUrl}
                alt={learner.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xl font-bold">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {learner.name}
                </h1>
                {learner.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {learner.email}
                </span>
                {learner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {learner.phone}
                  </span>
                )}
                {learner.grade && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                    {learner.grade} {learner.board ? `· ${learner.board}` : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Joined {new Date(learner.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Private Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Courses */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Enrolled Courses ({enrolledCourses.length})
            </h2>

            {enrolledCourses.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No enrolled courses.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {enrolledCourses.map((c) => {
                  const remaining =
                    c.totalCredits !== null
                      ? Number(c.totalCredits) - Number(c.consumedCredits || 0)
                      : null;
                  return (
                    <div key={c.enrollmentId} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {c.courseName}
                        </h3>
                        <p className="text-xs text-gray-500 capitalize">
                          Type: {c.courseType.replace(/_/g, ' ')} · Status: {c.status}
                        </p>
                      </div>
                      <div className="text-right">
                        {remaining !== null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            <CreditCard className="w-3 h-3" />
                            {remaining} / {c.totalCredits} credits
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No credits allocated</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-blue-600" />
              Upcoming Sessions ({upcomingSessions.length})
            </h2>

            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No upcoming sessions scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {s.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {new Date(s.scheduledAt).toLocaleString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {s.durationMin} mins
                      </p>
                    </div>
                    {s.zoomMeetingUrl && (
                      <a
                        href={s.zoomMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded hover:bg-blue-100 transition-colors"
                      >
                        Join Zoom
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Private Notes (Admin Only) */}
          <LearnerNoteEditor learnerId={learner.id} initialNote={learner.privateNote || ''} />
        </div>

        {/* Right Column: Family & Meta Info */}
        <div className="space-y-6">
          {/* Linked Parents */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-600" />
                Parents / Guardians
              </h2>
              <Link
                href="/admin/users/parents/add"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Link Parent
              </Link>
            </div>

            {parents.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No parents linked yet.</p>
            ) : (
              <div className="space-y-3">
                {parents.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-800"
                  >
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {p.name}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 capitalize mb-1">
                      {p.relationship}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>{p.email}</div>
                      {p.phone && <div>{p.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic Info */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Academic Info
            </h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Board</span>
                <span className="font-semibold">{learner.board || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Grade</span>
                <span className="font-semibold">{learner.grade || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Date of Birth</span>
                <span className="font-semibold">
                  {learner.dob ? new Date(learner.dob).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
