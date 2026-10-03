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
  parentProfiles,
  learnerProfiles,
} from '@/db/schema';
import { eq, and, gte, desc, or, sql, lte } from 'drizzle-orm';
import { Calendar, BookOpen, FileText, CreditCard, Video, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function fetchParentData(parentUserId: string) {
  // Get the child linked to this parent
  const [childLink] = await db
    .select({ learnerId: parentProfiles.learnerId, childName: users.name, childAvatar: users.avatarUrl })
    .from(parentProfiles)
    .leftJoin(users, eq(parentProfiles.learnerId, users.id))
    .where(eq(parentProfiles.userId, parentUserId))
    .limit(1);

  if (!childLink) return null;

  const learnerId = childLink.learnerId;
  const now = new Date();

  const [nextSession, upcomingSessions, enrollments, creditBalances, recentReports] =
    await Promise.all([
      db
        .select({
          id: sessions.id,
          title: sessions.title,
          scheduledAt: sessions.scheduledAt,
          durationMin: sessions.durationMin,
          status: sessions.status,
          courseName: courses.name,
          educatorName: users.name,
        })
        .from(sessions)
        .leftJoin(sessionAttendees, eq(sessionAttendees.sessionId, sessions.id))
        .leftJoin(courses, eq(sessions.courseId, courses.id))
        .leftJoin(users, eq(sessions.educatorId, users.id))
        .where(and(eq(sessionAttendees.learnerId, learnerId), gte(sessions.scheduledAt, now)))
        .orderBy(sessions.scheduledAt)
        .limit(1),

      db
        .select({
          id: sessions.id,
          title: sessions.title,
          scheduledAt: sessions.scheduledAt,
          durationMin: sessions.durationMin,
          status: sessions.status,
          courseName: courses.name,
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

      db
        .select({ courseName: courses.name, status: courseEnrollments.status })
        .from(courseEnrollments)
        .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
        .where(and(eq(courseEnrollments.learnerId, learnerId), eq(courseEnrollments.status, 'active'))),

      db
        .select({ courseId: credits.courseId, total: credits.total, consumed: credits.consumed, courseName: courses.name })
        .from(credits)
        .leftJoin(courses, eq(credits.courseId, courses.id))
        .where(eq(credits.learnerId, learnerId)),

      db
        .select({ id: monthlyReports.id, monthYear: monthlyReports.monthYear, courseName: courses.name, sentAt: monthlyReports.sentAt })
        .from(monthlyReports)
        .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
        .where(and(eq(monthlyReports.learnerId, learnerId), eq(monthlyReports.status, 'sent')))
        .orderBy(desc(monthlyReports.sentAt))
        .limit(3),
    ]);

  return { childLink, learnerId, nextSession: nextSession[0] ?? null, upcomingSessions, enrollments, creditBalances, recentReports };
}

export default async function ParentDashboard() {
  const session = await auth();
  const parentUserId = session!.user!.id as string;
  const parentName = session?.user?.name?.split(' ')[0] ?? 'Parent';

  const data = await fetchParentData(parentUserId);

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <User className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No child linked</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your account is not yet linked to a learner profile. Please contact the admin.
        </p>
      </div>
    );
  }

  const { childLink, upcomingSessions, nextSession, enrollments, creditBalances, recentReports } = data;
  const childName = childLink.childName ?? 'Your Child';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

      {/* Welcome + Next Session */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <span className="text-violet-700 dark:text-violet-400 font-bold text-lg">{parentName[0]}</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Welcome, {parentName} 👋</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tracking {childName}'s progress · {today}</p>
          </div>
        </div>

        <div className="h-px md:h-10 w-full md:w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

        {nextSession ? (
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {nextSession.status === 'live' ? 'Live now!' : `Next: ${nextSession.scheduledAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{nextSession.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {nextSession.scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              {nextSession.educatorName ? ` with ${nextSession.educatorName}` : ''}
              {nextSession.courseName ? ` · ${nextSession.courseName}` : ''}
            </p>
          </div>
        ) : (
          <div className="flex-1 text-sm text-gray-400 dark:text-gray-600">No upcoming sessions in the next 7 days.</div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Courses', value: enrollments.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/parent/calendar' },
          { label: 'Sessions This Week', value: upcomingSessions.length, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', href: '/parent/calendar' },
          { label: 'Credits Remaining', value: creditBalances.reduce((s, c) => s + (Number(c.total) - Number(c.consumed)), 0), icon: CreditCard, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', href: '/parent/fees' },
          { label: 'Reports', value: recentReports.length, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/parent/reports' },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-2 hover:border-blue-400 hover:shadow-sm transition-all">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming Sessions + Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> {childName}'s Schedule
            </h2>
            <Link href="/parent/calendar" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View calendar</Link>
          </div>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 py-6 text-center">No sessions in the next 7 days</p>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {s.scheduledAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{s.scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-600" /> Credits & Fees
            </h2>
            <Link href="/parent/fees" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Details</Link>
          </div>
          {creditBalances.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 py-6 text-center">No credits assigned yet</p>
          ) : (
            <div className="space-y-4">
              {creditBalances.map((c) => {
                const remaining = Number(c.total) - Number(c.consumed);
                const pct = Number(c.total) > 0 ? Math.min(100, (Number(c.consumed) / Number(c.total)) * 100) : 0;
                return (
                  <div key={c.courseId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.courseName ?? 'Course'}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{remaining}/{c.total} left</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div className={`h-full rounded-full ${remaining <= 2 ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${100 - pct}%` }} />
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
              <FileText className="w-4 h-4 text-amber-600" /> Progress Reports
            </h2>
            <Link href="/parent/reports" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentReports.map((r) => (
              <Link key={r.id} href={`/parent/reports/${r.id}`} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition-all">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {r.monthYear instanceof Date
                    ? r.monthYear.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : String(r.monthYear)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.courseName}</p>
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
