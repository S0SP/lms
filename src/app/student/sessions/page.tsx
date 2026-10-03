import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { courses, courseEnrollments, sessionAttendees, sessions, users } from '@/db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, or } from 'drizzle-orm';
import { CalendarX2, CircleCheck, QrCode, TriangleAlert, Video } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

type SessionStatus = (typeof sessions.$inferSelect)['status'];

const dayLabel = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const timeLabel = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const fullDateLabel = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const endOf = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

function initialsOf(name: string | null) {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const shell =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border';

  if (status === 'live') {
    return (
      <span className={`${shell} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live now
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className={`${shell} bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:border-gray-700`}>
        <CircleCheck className="w-3 h-3" />
        Completed
      </span>
    );
  }
  if (status === 'no_show') {
    return (
      <span className={`${shell} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20`}>
        <TriangleAlert className="w-3 h-3" />
        No show
      </span>
    );
  }
  return (
    <span className={`${shell} bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20`}>
      <QrCode className="w-3 h-3" />
      Scheduled
    </span>
  );
}

function EmptyState({ tab }: { tab: 'upcoming' | 'past' }) {
  return (
    <div className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-10 flex flex-col items-center justify-center text-center">
      <CalendarX2 className="w-9 h-9 text-gray-300 dark:text-gray-700 mb-3" />
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
        {tab === 'upcoming'
          ? 'Sessions you are booked into or enrolled for will appear here once they are scheduled.'
          : 'Once a session has taken place it will be listed here with what it cost you in credits.'}
      </p>
    </div>
  );
}

export default async function StudentSessions({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const learnerId = session.user.id as string;

  const { tab } = await searchParams;
  const activeTab: 'upcoming' | 'past' = tab === 'past' ? 'past' : 'upcoming';

  const now = new Date();

  // A learner may only see a session if they are an attendee of it, or if they
  // are enrolled in its course — 1:1 sessions are booked on the course and do
  // not get a session_attendees row.
  const ownedByLearner = or(
    inArray(
      sessions.id,
      db
        .select({ id: sessionAttendees.sessionId })
        .from(sessionAttendees)
        .where(eq(sessionAttendees.learnerId, learnerId)),
    ),
    inArray(
      sessions.courseId,
      db
        .select({ courseId: courseEnrollments.courseId })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.learnerId, learnerId)),
    ),
  );
  const notCancelled = and(ne(sessions.status, 'cancelled'), isNull(sessions.cancelledAt));

  const selection = {
    id: sessions.id,
    title: sessions.title,
    topic: sessions.topic,
    scheduledAt: sessions.scheduledAt,
    durationMin: sessions.durationMin,
    status: sessions.status,
    zoomMeetingUrl: sessions.zoomMeetingUrl,
    actualStartAt: sessions.actualStartAt,
    creditsConsumed: sessions.creditsConsumed,
    courseName: courses.name,
    educatorName: users.name,
    educatorAvatar: users.avatarUrl,
  };

  const [upcoming, past] = await Promise.all([
    db
      .select(selection)
      .from(sessions)
      .leftJoin(courses, eq(sessions.courseId, courses.id))
      .leftJoin(users, eq(sessions.educatorId, users.id))
      .where(and(ownedByLearner, notCancelled, gte(sessions.scheduledAt, now)))
      .orderBy(asc(sessions.scheduledAt)),

    db
      .select(selection)
      .from(sessions)
      .leftJoin(courses, eq(sessions.courseId, courses.id))
      .leftJoin(users, eq(sessions.educatorId, users.id))
      // Split on the scheduled date alone so no non-cancelled session can fall
      // through both tabs; the status badge still reflects live/completed.
      .where(and(ownedByLearner, notCancelled, lt(sessions.scheduledAt, now)))
      .orderBy(desc(sessions.scheduledAt)),
  ]);

  const rows = activeTab === 'past' ? past : upcoming;

  const tabs: { key: 'upcoming' | 'past'; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'past', label: 'Past', count: past.length },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">My Sessions</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          View and manage your upcoming and past learning sessions.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.key === 'upcoming' ? '/student/sessions' : '/student/sessions?tab=past'}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
                activeTab === t.key
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{t.label}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {t.count}
              </span>
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          rows.map((s) => {
            const isPast = activeTab === 'past';
            const actualEnd = s.actualStartAt ? endOf(s.actualStartAt, s.durationMin) : null;
            const credits = s.creditsConsumed !== null ? Number(s.creditsConsumed) : null;

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm"
              >
                <div className="flex flex-col md:flex-row gap-4 md:items-center w-full md:w-auto">
                  <div className="bg-gray-50 dark:bg-[#161B26] rounded-lg p-3 min-w-[120px] text-center shrink-0 border border-gray-100 dark:border-gray-800">
                    <div
                      className={`font-bold text-lg ${
                        isPast
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {dayLabel(s.scheduledAt)}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      {timeLabel(s.scheduledAt)} - {timeLabel(endOf(s.scheduledAt, s.durationMin))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[17px]">
                        {s.title}
                      </h3>
                      <StatusBadge status={s.status} />
                    </div>

                    {s.topic && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{s.topic}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <UserAvatar
                        src={s.educatorAvatar}
                        alt={s.educatorName ?? 'Educator'}
                        initials={initialsOf(s.educatorName) || '?'}
                        className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                        fallbackClassName="bg-gray-200 dark:bg-gray-700 text-[10px] font-medium text-gray-600 dark:text-gray-300"
                      />
                      {s.educatorName && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {s.educatorName}
                        </span>
                      )}
                      {s.courseName && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          &middot; {s.courseName}
                        </span>
                      )}
                    </div>

                    {isPast && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {s.actualStartAt ? (
                          <>
                            Held {fullDateLabel(s.actualStartAt)}
                            {actualEnd ? `, ${timeLabel(s.actualStartAt)} - ${timeLabel(actualEnd)}` : ''}
                          </>
                        ) : (
                          <>Scheduled for {fullDateLabel(s.scheduledAt)}</>
                        )}
                        {credits !== null && <> &middot; {credits} credits consumed</>}
                      </p>
                    )}
                  </div>
                </div>

                {!isPast && (
                  <div className="shrink-0 w-full md:w-auto">
                    {s.zoomMeetingUrl ? (
                      <a
                        href={s.zoomMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Join
                      </a>
                    ) : (
                      <p className="w-full md:w-auto text-center md:text-right text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-md px-4 py-2">
                        Join link not shared yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
