import React from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  sessions,
  sessionAttendees,
  courses,
  courseEnrollments,
  credits,
  monthlyReports,
  users,
} from '@/db/schema';
import { eq, and, gte, desc, sql, lte, count, or } from 'drizzle-orm';
import { Calendar, BookOpen, FileText, CreditCard, Clock, Video } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

export const dynamic = 'force-dynamic';

// ─── Data fetcher ─────────────────────────────────────────────────────────────
async function fetchStudentData(learnerId: string) {
  const now = new Date();

  const [nextSession, upcomingSessions, enrollments, creditBalances, recentReports] =
    await Promise.all([
      // Next upcoming session
      db
        .select({
          id: sessions.id,
          title: sessions.title,
          scheduledAt: sessions.scheduledAt,
          durationMin: sessions.durationMin,
          zoomMeetingUrl: sessions.zoomMeetingUrl,
          courseName: courses.name,
          educatorName: users.name,
          status: sessions.status,
        })
        .from(sessions)
        .leftJoin(sessionAttendees, eq(sessionAttendees.sessionId, sessions.id))
        .leftJoin(courses, eq(sessions.courseId, courses.id))
        .leftJoin(users, eq(sessions.educatorId, users.id))
        .where(
          and(
            eq(sessionAttendees.learnerId, learnerId),
            gte(sessions.scheduledAt, now),
            or(eq(sessions.status, 'scheduled'), eq(sessions.status, 'live')),
          ),
        )
        .orderBy(sessions.scheduledAt)
        .limit(1),

      // All upcoming sessions (next 7 days)
      db
        .select({
          id: sessions.id,
          title: sessions.title,
          scheduledAt: sessions.scheduledAt,
          durationMin: sessions.durationMin,
          status: sessions.status,
          courseName: courses.name,
          zoomMeetingUrl: sessions.zoomMeetingUrl,
        })
        .from(sessions)
        .leftJoin(sessionAttendees, eq(sessionAttendees.sessionId, sessions.id))
        .leftJoin(courses, eq(sessions.courseId, courses.id))
        .where(
          and(
            eq(sessionAttendees.learnerId, learnerId),
            gte(sessions.scheduledAt, now),
            lte(sessions.scheduledAt, new Date(now.getTime() + 7 * 24 * 60 * 60_000)),
          ),
        )
        .orderBy(sessions.scheduledAt)
        .limit(5),

      // Active course enrollments
      db
        .select({
          courseId: courseEnrollments.courseId,
          courseName: courses.name,
          status: courseEnrollments.status,
        })
        .from(courseEnrollments)
        .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
        .where(and(eq(courseEnrollments.learnerId, learnerId), eq(courseEnrollments.status, 'active'))),

      // Credit balances per course
      db
        .select({
          courseId: credits.courseId,
          total: credits.total,
          consumed: credits.consumed,
          courseName: courses.name,
        })
        .from(credits)
        .leftJoin(courses, eq(credits.courseId, courses.id))
        .where(eq(credits.learnerId, learnerId)),

      // Recent reports (sent only)
      db
        .select({
          id: monthlyReports.id,
          monthYear: monthlyReports.monthYear,
          courseName: courses.name,
          sentAt: monthlyReports.sentAt,
        })
        .from(monthlyReports)
        .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
        .where(and(eq(monthlyReports.learnerId, learnerId), eq(monthlyReports.status, 'sent')))
        .orderBy(desc(monthlyReports.sentAt))
        .limit(3),
    ]);

  return { nextSession: nextSession[0] ?? null, upcomingSessions, enrollments, creditBalances, recentReports };
}

function minutesUntil(iso: Date) {
  return Math.max(0, Math.round((iso.getTime() - Date.now()) / 60_000));
}

function formatRelativeTime(d: Date) {
  const mins = minutesUntil(d);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function StudentDashboard() {
  const session = await auth();
  const learnerId = session!.user!.id as string;
  const learnerName = session?.user?.name?.split(' ')[0] ?? 'Student';
  const avatarUrl = session?.user?.image || (session?.user as any)?.avatarUrl;

  const { nextSession, upcomingSessions, enrollments, creditBalances, recentReports } =
    await fetchStudentData(learnerId);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

      {/* Welcome + Next Session Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
            <UserAvatar 
              src={avatarUrl} 
              alt="Profile" 
              initials={learnerName[0]} 
              className="w-full h-full"
              fallbackClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-lg"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hey {learnerName} 👋</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
          </div>
        </div>

        <div className="h-px md:h-10 w-full md:w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

        {nextSession ? (
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {nextSession.status === 'live' ? 'Live now!' : `Next session ${formatRelativeTime(nextSession.scheduledAt)}`}
              </span>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{nextSession.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {nextSession.scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {' – '}
                {new Date(nextSession.scheduledAt.getTime() + nextSession.durationMin * 60_000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {nextSession.educatorName ? ` with ${nextSession.educatorName}` : ''}
              </p>
            </div>
            {nextSession.zoomMeetingUrl && (
              <a
                href={nextSession.zoomMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0"
              >
                <Video className="w-4 h-4" /> Join Session
              </a>
            )}
          </div>
        ) : (
          <div className="flex-1 text-sm text-gray-400 dark:text-gray-600">
            No upcoming sessions this week.{' '}
            <Link href="/student/sessions" className="text-blue-600 dark:text-blue-400 hover:underline">View all sessions</Link>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Courses', value: enrollments.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/student/courses' },
          { label: 'Sessions This Week', value: upcomingSessions.length, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', href: '/student/sessions' },
          {
            label: 'Credits Remaining',
            value: creditBalances.reduce((sum, c) => sum + (Number(c.total) - Number(c.consumed)), 0),
            icon: CreditCard,
            color: 'text-violet-600',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            href: '/student/fees',
          },
          { label: 'Reports', value: recentReports.length, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/student/progress-reports' },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-2 hover:border-blue-400 hover:shadow-sm transition-all group"
          >
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Upcoming Sessions
            </h2>
            <Link href="/student/sessions" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
          </div>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 py-6 text-center">No sessions in the next 7 days</p>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/student/sessions/${s.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {s.scheduledAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {s.scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      {' · '}
                      {s.durationMin}m
                    </p>
                  </div>
                  {s.status === 'live' && (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
                      LIVE
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Courses + Credits */}
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> My Courses
            </h2>
            <Link href="/student/courses" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
          </div>
          {creditBalances.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 py-6 text-center">Not enrolled in any courses yet</p>
          ) : (
            <div className="space-y-3">
              {creditBalances.map((c) => {
                const remaining = Number(c.total) - Number(c.consumed);
                const pct = Number(c.total) > 0 ? Math.min(100, (Number(c.consumed) / Number(c.total)) * 100) : 0;
                return (
                  <div key={c.courseId} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.courseName ?? 'Course'}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs shrink-0 ml-2">{remaining} / {c.total} credits left</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full transition-all ${remaining <= 2 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${100 - pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" /> Recent Reports
            </h2>
            <Link href="/student/progress-reports" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentReports.map((r) => (
              <Link
                key={r.id}
                href={`/student/progress-reports/${r.id}`}
                className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {r.monthYear instanceof Date
                    ? r.monthYear.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : String(r.monthYear)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.courseName ?? 'Course'}</p>
                {r.sentAt && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Sent {new Date(r.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
