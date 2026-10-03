import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  courseEnrollments,
  courses,
  parentProfiles,
  sessionAttendees,
  sessions,
  users,
} from '@/db/schema';
import { and, asc, eq, gte, inArray, isNull, lt, ne, or } from 'drizzle-orm';
import { CalendarX2, ChevronLeft, ChevronRight, Clock, User, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

type SessionStatus = (typeof sessions.$inferSelect)['status'];

const timeLabel = (d: Date) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const endOf = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

/** Local calendar day key, used to group sessions onto the grid. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** One colour per linked child, so a parent can tell the schedules apart. */
const CHILD_COLOURS = [
  { dot: 'bg-blue-500', chip: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300' },
  { dot: 'bg-purple-500', chip: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-300' },
  { dot: 'bg-teal-500', chip: 'bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-900 text-teal-700 dark:text-teal-300' },
  { dot: 'bg-rose-500', chip: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300' },
];
const OTHER_CHIP =
  'bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';

function StatusPill({ status }: { status: SessionStatus }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
        Live
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300">
        Done
      </span>
    );
  }
  if (status === 'no_show') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
        No show
      </span>
    );
  }
  return null;
}

const utcOffsetLabel = () => {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
};

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ParentCalendar({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const parentUserId = session.user.id as string;

  // Authorisation: a parent may only ever see a session booked for a learner they
  // are linked to — the same parent_profiles.user_id / .learner_id link that
  // reportRepository.isLinkedParent() checks.
  const links = await db
    .select({ learnerId: parentProfiles.learnerId, learnerName: users.name })
    .from(parentProfiles)
    .innerJoin(users, eq(parentProfiles.learnerId, users.id))
    .where(eq(parentProfiles.userId, parentUserId));

  const learnerIds = links.map((l) => l.learnerId);
  const childName = (id: string) => links.find((l) => l.learnerId === id)?.learnerName ?? 'Child';

  if (learnerIds.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-[#1E2535] rounded-lg border border-gray-200 dark:border-gray-800 p-10 flex flex-col items-center justify-center text-center">
          <User className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No child linked</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            Your account is not linked to a learner profile yet, so there is no schedule to show.
            Please contact the admin.
          </p>
        </div>
      </div>
    );
  }

  // Month being viewed. Defaults to the current month; ?month=YYYY-MM walks it.
  const { month: monthParam } = await searchParams;
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam ?? '');
  const now = new Date();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  // A malformed or out-of-range ?month falls back to the current month.
  const viewMonth = monthIndex >= 0 && monthIndex <= 11 ? monthIndex : now.getMonth();
  const viewYear = match ? Number(match[1]) : now.getFullYear();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const nextMonth = new Date(viewYear, viewMonth + 1, 1);
  const prevMonthParam = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const nextMonthParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  // A child owns a session either by being an attendee, or — for 1:1 sessions,
  // which are booked on the course and get no session_attendees row — by being
  // enrolled in the course. Same rule as the student sessions page.
  const ownedByChild = or(
    inArray(
      sessions.id,
      db
        .select({ id: sessionAttendees.sessionId })
        .from(sessionAttendees)
        .where(inArray(sessionAttendees.learnerId, learnerIds)),
    ),
    inArray(
      sessions.courseId,
      db
        .select({ courseId: courseEnrollments.courseId })
        .from(courseEnrollments)
        .where(inArray(courseEnrollments.learnerId, learnerIds)),
    ),
  );
  const notCancelled = and(ne(sessions.status, 'cancelled'), isNull(sessions.cancelledAt));

  const monthSessions = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      scheduledAt: sessions.scheduledAt,
      durationMin: sessions.durationMin,
      status: sessions.status,
      zoomMeetingUrl: sessions.zoomMeetingUrl,
      courseName: courses.name,
      educatorName: users.name,
    })
    .from(sessions)
    .leftJoin(courses, eq(sessions.courseId, courses.id))
    .leftJoin(users, eq(sessions.educatorId, users.id))
    .where(and(ownedByChild, notCancelled, gte(sessions.scheduledAt, monthStart), lt(sessions.scheduledAt, nextMonth)))
    .orderBy(asc(sessions.scheduledAt));

  // Second pass: attribute each session to the child who attends it, so the grid
  // can colour a shared group session separately from each child.
  const sessionIds = monthSessions.map((s) => s.id);
  const attendance = sessionIds.length
    ? await db
        .select({ sessionId: sessionAttendees.sessionId, learnerId: sessionAttendees.learnerId })
        .from(sessionAttendees)
        .where(
          and(
            inArray(sessionAttendees.sessionId, sessionIds),
            inArray(sessionAttendees.learnerId, learnerIds),
          ),
        )
    : [];

  const attendeesBySession = new Map<string, string[]>();
  for (const row of attendance) {
    const list = attendeesBySession.get(row.sessionId) ?? [];
    if (!list.includes(row.learnerId)) list.push(row.learnerId);
    attendeesBySession.set(row.sessionId, list);
  }

  const byDay = new Map<string, typeof monthSessions>();
  for (const s of monthSessions) {
    const key = dayKey(s.scheduledAt);
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  // Month grid: always whole weeks, Sunday first.
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const leadingBlanks = new Date(viewYear, viewMonth, 1).getDay();
  const cellCount = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const todayKey = dayKey(now);
  const monthTitle = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const sessionCount = monthSessions.length;
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const subtitle =
    sessionCount === 0
      ? `No sessions scheduled in ${monthTitle}.`
      : `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} in ${monthTitle}.`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Session Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>

        <Link
          href="/consultation"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
        >
          Book a Trial
        </Link>
      </div>

      <div className="bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col">
        {/* Calendar Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <Link
              href={`/parent/calendar?month=${prevMonthParam}`}
              aria-label="Previous month"
              className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 w-32 text-center">
              {monthTitle}
            </h2>
            <Link
              href={`/parent/calendar?month=${nextMonthParam}`}
              aria-label="Next month"
              className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {!isCurrentMonth && (
            <Link
              href="/parent/calendar"
              className="px-3 py-1 text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              This month
            </Link>
          )}
        </div>

        {/* Calendar Grid Header */}
        {sessionCount > 0 && (
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>
        )}

        {/* Calendar Grid Body */}
        {sessionCount === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <CalendarX2 className="w-9 h-9 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Nothing scheduled in {monthTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Once a session is booked for {links.length === 1 ? childName(learnerIds[0]) : 'your children'}{' '}
              it will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26]">
            {Array.from({ length: cellCount }, (_, index) => {
              const dayNumber = index - leadingBlanks + 1;
              const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
              const cellDate = new Date(viewYear, viewMonth, dayNumber);
              const key = dayKey(cellDate);
              const items = inMonth ? (byDay.get(key) ?? []) : [];
              const isToday = inMonth && key === todayKey;

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-1.5 relative ${
                    inMonth ? '' : 'opacity-50 bg-gray-50 dark:bg-black/20'
                  }`}
                >
                  {isToday ? (
                    <span className="inline-block w-6 h-6 text-center leading-6 text-xs font-medium bg-blue-600 text-white rounded-full m-0.5">
                      {dayNumber}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100 p-1 inline-block">
                      {dayNumber < 1
                        ? dayNumber + daysInPrevMonth
                        : dayNumber > daysInMonth
                          ? dayNumber - daysInMonth
                          : dayNumber}
                    </span>
                  )}

                  {items.map((s) => {
                    const attendees = attendeesBySession.get(s.id) ?? [];
                    const colourIndex = attendees.length
                      ? links.findIndex((l) => l.learnerId === attendees[0])
                      : -1;
                    const chip =
                      colourIndex >= 0 ? CHILD_COLOURS[colourIndex % CHILD_COLOURS.length].chip : OTHER_CHIP;

                    return (
                      <div
                        key={s.id}
                        className={`mt-1 p-1.5 text-xs border rounded overflow-hidden ${chip}`}
                      >
                        <div className="font-semibold truncate flex items-center gap-1">
                          {s.title}
                          <StatusPill status={s.status} />
                        </div>
                        <div className="text-[10px] truncate opacity-80">
                          {timeLabel(s.scheduledAt)} - {timeLabel(endOf(s.scheduledAt, s.durationMin))}
                          {attendees.length ? ` · ${childName(attendees[0])}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 bg-white dark:bg-[#1E2535] flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4 flex-wrap">
            {links.map((l, i) => (
              <div key={l.learnerId} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    CHILD_COLOURS[i % CHILD_COLOURS.length].dot
                  }`}
                />
                {l.learnerName ?? 'Child'}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              No attendee listed
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Times shown in {utcOffsetLabel()}
          </div>
        </div>
      </div>

      {/* Upcoming sessions with join links */}
      {sessionCount > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
            Sessions in {monthTitle}
          </h2>
          <div className="space-y-3">
            {[...byDay.entries()].map(([day, items]) => (
              <div
                key={day}
                className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 p-4"
              >
                <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <div className="space-y-2">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-gray-50 dark:bg-white/5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                            {s.title}
                          </span>
                          <StatusPill status={s.status} />
                        </div>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {timeLabel(s.scheduledAt)} - {timeLabel(endOf(s.scheduledAt, s.durationMin))}{' '}
                          &middot; {s.durationMin}m
                          {s.courseName ? ` \u00b7 ${s.courseName}` : ''}
                          {s.educatorName ? ` \u00b7 ${s.educatorName}` : ''}
                        </p>
                        {(attendeesBySession.get(s.id) ?? []).length > 0 && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {(attendeesBySession.get(s.id) ?? []).map(childName).join(', ')}
                          </p>
                        )}
                      </div>
                      {s.zoomMeetingUrl ? (
                        <a
                          href={s.zoomMeetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-md transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          Join
                        </a>
                      ) : (
                        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5">
                          Join link not shared yet
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
