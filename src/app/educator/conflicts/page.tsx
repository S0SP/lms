import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, Filter, TriangleAlert } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  users,
  sessions,
  courses,
  sessionConflicts,
  leaves,
} from '@/db/schema';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ConflictFilter } from '@/components/educator/ConflictFilter';

export const dynamic = 'force-dynamic';

/**
 * Mirrors requireAuth(['educator', 'owner', 'admin']) from src/lib/api.ts. The role
 * gate is only the first line of defence — every query below is additionally scoped to
 * the signed-in users.id, so holding an admin role still only ever reads your own
 * conflicts.
 */
const EDUCATOR_ROLES = ['educator', 'owner', 'admin'];

const CONFLICT_TONE: Record<string, string> = {
  leave: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  lms_overlap: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SESSION_REF_KEYS = [
  'conflictingSessionId',
  'conflicting_session_id',
  'conflictSessionId',
  'conflict_session_id',
  'otherSessionId',
  'other_session_id',
  'overlappingSessionId',
  'overlapping_session_id',
  'clashingSessionId',
  'clashing_session_id',
];

const LEAVE_REF_KEYS = ['leaveId', 'leave_id'];

function titleCase(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

/** "Today" / "Tomorrow" are derived from the stored timestamp, never hardcoded per row. */
function dayLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

type SourcedSession = { scheduledAt: Date; durationMin: number };

function sessionRange(s: SourcedSession) {
  return `${dayLabel(s.scheduledAt)}, ${fmtTime(s.scheduledAt)} - ${fmtTime(
    new Date(s.scheduledAt.getTime() + s.durationMin * 60_000),
  )}`;
}

/** Real overlap width in minutes, computed from the two stored start times + durations. */
function overlapMinutes(a: SourcedSession, b: SourcedSession) {
  const aStart = a.scheduledAt.getTime();
  const aEnd = aStart + a.durationMin * 60_000;
  const bStart = b.scheduledAt.getTime();
  const bEnd = bStart + b.durationMin * 60_000;
  return Math.max(0, Math.round((Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / 60_000));
}

/**
 * details_json is free-form jsonb and nothing in the codebase writes it yet, so probe
 * the documented key names. `null` = no reference present, a uuid string = a reference
 * that must be resolved to one of THIS educator's rows, `undefined` = a reference was
 * named but is unusable — the row is then dropped rather than shown with a placeholder.
 */
function readIdRef(details: unknown, keys: string[]): string | null | undefined {
  if (!details || typeof details !== 'object') return null;
  const record = details as Record<string, unknown>;
  for (const key of keys) {
    const raw = record[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== 'string' || !UUID_RE.test(raw)) return undefined;
    return raw;
  }
  return null;
}

/** details_json holds the conflict specifics; surface them as plain key/value text. */
function describeDetails(details: unknown, skip: string[]) {
  if (!details || typeof details !== 'object') return [];
  return Object.entries(details as Record<string, unknown>)
    .filter(([key, value]) => !skip.includes(key) && value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => ({
      key: titleCase(key),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
}

export default async function EducatorConflicts({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = (session.user as { role?: string }).role ?? '';
  if (!EDUCATOR_ROLES.includes(role)) redirect('/');

  const educatorId = session.user.id as string;
  const { state } = await searchParams;
  const showResolved = state === 'resolved';
  const showOpen = state === 'open';
  const hasFilter = showOpen || showResolved;

  // Tenancy: sessions carry no org_id — the course does. The JWT only has id + role,
  // so the org is read back from the users row. A null org_id simply means there is no
  // tenant to narrow by; sessions.educatorId remains the hard per-user boundary.
  const meRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, educatorId))
    .limit(1);
  const orgId = meRows[0]?.orgId ?? null;

  // AUTHORISATION: the innerJoin chain means a conflict can only surface if the session
  // it points at is one of this educator's own sessions AND belongs to their org.
  // A conflict whose session was deleted is dropped by the join (FK is ON DELETE CASCADE).
  const baseScope = orgId
    ? and(eq(sessions.educatorId, educatorId), eq(courses.orgId, orgId))
    : eq(sessions.educatorId, educatorId);

  const stateFilter = showOpen
    ? isNull(sessionConflicts.resolvedAt)
    : showResolved
      ? sql`${sessionConflicts.resolvedAt} is not null`
      : undefined;

  const [conflictRows, totalCount, openCount, resolvedCount] = await Promise.all([
    db
      .select({
        id: sessionConflicts.id,
        sessionId: sessionConflicts.sessionId,
        conflictSource: sessionConflicts.conflictSource,
        detailsJson: sessionConflicts.detailsJson,
        resolvedAt: sessionConflicts.resolvedAt,
        createdAt: sessionConflicts.createdAt,
        resolverName: users.name,
        sessionTitle: sessions.title,
        sessionStatus: sessions.status,
        scheduledAt: sessions.scheduledAt,
        durationMin: sessions.durationMin,
        courseName: courses.name,
      })
      .from(sessionConflicts)
      .innerJoin(sessions, eq(sessionConflicts.sessionId, sessions.id))
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .leftJoin(users, eq(sessionConflicts.resolvedBy, users.id))
      .where(and(baseScope, stateFilter))
      .orderBy(asc(sessionConflicts.resolvedAt), desc(sessionConflicts.createdAt))
      .limit(100),

    db
      .select({ value: sql<number>`count(*)::int` })
      .from(sessionConflicts)
      .innerJoin(sessions, eq(sessionConflicts.sessionId, sessions.id))
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .where(baseScope),

    db
      .select({ value: sql<number>`count(*)::int` })
      .from(sessionConflicts)
      .innerJoin(sessions, eq(sessionConflicts.sessionId, sessions.id))
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .where(and(baseScope, isNull(sessionConflicts.resolvedAt))),

    db
      .select({ value: sql<number>`count(*)::int` })
      .from(sessionConflicts)
      .innerJoin(sessions, eq(sessionConflicts.sessionId, sessions.id))
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .where(and(baseScope, sql`${sessionConflicts.resolvedAt} is not null`)),
  ]);

  // Resolve whatever details_json points at — strictly within this educator's own rows,
  // so a reference to a colleague's session or leave simply fails to resolve.
  const conflictRowsSafe = conflictRows.map((c) => ({
    ...c,
    otherSessionId: readIdRef(c.detailsJson, SESSION_REF_KEYS),
    leaveId: readIdRef(c.detailsJson, LEAVE_REF_KEYS),
  }));

  const otherSessionIds = [
    ...new Set(conflictRowsSafe.map((c) => c.otherSessionId).filter((v): v is string => !!v)),
  ];
  const leaveIds = [...new Set(conflictRowsSafe.map((c) => c.leaveId).filter((v): v is string => !!v))];

  const [otherSessions, relatedLeaves] = await Promise.all([
    otherSessionIds.length > 0
      ? db
          .select({
            id: sessions.id,
            title: sessions.title,
            status: sessions.status,
            scheduledAt: sessions.scheduledAt,
            durationMin: sessions.durationMin,
            courseName: courses.name,
          })
          .from(sessions)
          .innerJoin(courses, eq(sessions.courseId, courses.id))
          .where(
            and(
              inArray(sessions.id, otherSessionIds),
              eq(sessions.educatorId, educatorId),
              orgId ? eq(courses.orgId, orgId) : undefined,
            ),
          )
      : Promise.resolve([]),
    leaveIds.length > 0
      ? db
          .select({
            id: leaves.id,
            type: leaves.type,
            startDate: leaves.startDate,
            endDate: leaves.endDate,
            startTime: leaves.startTime,
            endTime: leaves.endTime,
          })
          .from(leaves)
          .where(and(inArray(leaves.id, leaveIds), eq(leaves.educatorId, educatorId)))
      : Promise.resolve([]),
  ]);

  const otherById = new Map(otherSessions.map((s) => [s.id, s]));
  const leaveById = new Map(relatedLeaves.map((l) => [l.id, l]));

  // Drop any row whose referenced counterpart is missing, deleted, or owned by someone else.
  const visible = conflictRowsSafe.filter((c) => {
    if (c.otherSessionId === undefined || c.leaveId === undefined) return false;
    if (c.otherSessionId && !otherById.has(c.otherSessionId)) return false;
    if (c.leaveId && !leaveById.has(c.leaveId)) return false;
    return true;
  });

  const total = totalCount[0]?.value ?? 0;
  const open = openCount[0]?.value ?? 0;
  const resolved = resolvedCount[0]?.value ?? 0;

  const FILTERS = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Needs resolution' },
    { value: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-8 bg-[#faf8ff] dark:bg-[#080D16]">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-[28px] leading-[36px] tracking-[-0.02em] font-bold text-[#131b2d] dark:text-gray-100 mb-2">
              Session Conflicts
            </h2>
            <p className="text-[#414754] dark:text-gray-400 text-[14px]">
              {total > 0
                ? `${open} conflict${open === 1 ? '' : 's'} still need manual resolution, ${resolved} resolved.`
                : 'Review and resolve overlapping commitments in your schedule.'}
            </p>
          </div>

          <ConflictFilter currentState={showOpen ? 'open' : showResolved ? 'resolved' : 'all'} />
        </div>

        {total === 0 ? (
          /* No conflict has ever been raised against this educator's sessions */
          <div className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-[0px_4px_12px_rgba(15,23,41,0.08)] mb-8">
            <CheckCircle2 className="w-16 h-16 text-[#08BD7E] dark:text-green-500 mb-6" />
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-bold text-[#131b2d] dark:text-gray-100 mb-2">
              No scheduling conflicts
            </h3>
            <p className="text-[#414754] dark:text-gray-400 text-[14px] max-w-md">
              Nothing has clashed with a leave, a calendar event, or another of your sessions. Your
              schedule is perfectly aligned.
            </p>
          </div>
        ) : visible.length === 0 ? (
          /* Conflicts exist in the scoped set, but none can be rendered honestly */
          <div className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-[0px_4px_12px_rgba(15,23,41,0.08)] mb-8">
            <Filter className="w-12 h-12 text-[#E5E9F0] dark:text-gray-700 mb-6" />
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-bold text-[#131b2d] dark:text-gray-100 mb-2">
              {hasFilter ? 'No conflicts match this filter' : 'No resolvable conflicts'}
            </h3>
            <p className="text-[#414754] dark:text-gray-400 text-[14px] max-w-md">
              {hasFilter
                ? `${open} of ${total} conflict${total === 1 ? '' : 's'} still need manual resolution.`
                : 'Every recorded conflict points at a session or leave that no longer belongs to your account, so none of them can be shown.'}
            </p>
            {hasFilter ? (
              <Link
                href="/educator/conflicts"
                className="mt-6 px-4 py-2 border border-[#E5E9F0] dark:border-gray-800 rounded-lg text-[#2F80F9] dark:text-blue-400 font-semibold text-[12px] tracking-[0.02em] hover:bg-[#F9FAFB] dark:hover:bg-gray-800 transition-colors"
              >
                Show all conflicts
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-8">
            {visible.map((conflict) => {
              const other = conflict.otherSessionId ? otherById.get(conflict.otherSessionId) : undefined;
              const leave = conflict.leaveId ? leaveById.get(conflict.leaveId) : undefined;
              const minutes = other
                ? overlapMinutes(
                    { scheduledAt: conflict.scheduledAt, durationMin: conflict.durationMin },
                    other,
                  )
                : null;
              const details = describeDetails(conflict.detailsJson, [
                ...SESSION_REF_KEYS,
                ...LEAVE_REF_KEYS,
              ]);

              return (
                <div
                  key={conflict.id}
                  className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-800 rounded-xl p-6 shadow-[0px_4px_12px_rgba(15,23,41,0.08)] hover:shadow-[0px_8px_24px_rgba(15,23,41,0.12)] transition-shadow relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${
                      conflict.resolvedAt ? 'bg-[#08BD7E] dark:bg-green-500' : 'bg-[#ba1a1a] dark:bg-red-500'
                    }`}
                  />

                  {/* Resolution state comes straight from resolved_at / resolved_by */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 pl-3">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        CONFLICT_TONE[conflict.conflictSource] ??
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {titleCase(conflict.conflictSource)}
                    </span>
                    {conflict.resolvedAt ? (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#08BD7E]/10 dark:bg-green-900/30 text-[#08BD7E] dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved {fmtDate(conflict.resolvedAt)}
                        {conflict.resolverName ? ` by ${conflict.resolverName}` : ''}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#ba1a1a]/10 dark:bg-red-900/30 text-[#ba1a1a] dark:text-red-400">
                        <TriangleAlert className="w-3 h-3" />
                        Needs resolution &middot; raised {fmtDate(conflict.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col lg:flex-row items-stretch gap-6 pl-3">
                    {/* Session A — always this educator's own session */}
                    <div className="flex-1 w-full bg-[#F9FAFB] dark:bg-[#080D16] border border-[#E5E9F0] dark:border-gray-800 rounded-lg p-4">
                      <div className="mb-3">
                        <span className="bg-[#2F80F9]/10 dark:bg-blue-900/30 text-[#2F80F9] dark:text-blue-400 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider">
                          {conflict.courseName}
                        </span>
                      </div>
                      <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-bold text-[#131b2d] dark:text-gray-100 mb-1">
                        {conflict.sessionTitle}
                      </h3>
                      <div className="flex items-center gap-2 text-[#414754] dark:text-gray-400 text-[12px]">
                        <Clock className="w-4 h-4" />
                        <span>
                          {sessionRange({
                            scheduledAt: conflict.scheduledAt,
                            durationMin: conflict.durationMin,
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#727785] dark:text-gray-500 mt-1">
                        {titleCase(conflict.sessionStatus)} &middot; {conflict.durationMin} min
                      </p>
                    </div>

                    {/* Connection — only rendered when a real counterpart was resolved */}
                    {(other || leave) && (
                      <div className="flex flex-col items-center shrink-0 lg:px-4 py-2 lg:py-0 relative z-10">
                        <div className="h-8 w-px bg-[#ba1a1a]/30 dark:bg-red-500/30 hidden lg:block absolute -top-4"></div>
                        <div className="flex flex-col items-center gap-1 bg-[#ffdad6] dark:bg-red-900/30 text-[#ba1a1a] dark:text-red-400 px-3 py-1.5 rounded-full border border-[#ba1a1a]/20 dark:border-red-900/50 shadow-sm">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="font-semibold text-[12px] tracking-[0.02em]">
                              overlaps with
                            </span>
                          </span>
                          {minutes !== null && minutes > 0 ? (
                            <span className="text-[11px] font-semibold tracking-[0.02em]">
                              {minutes} min overlap
                            </span>
                          ) : null}
                        </div>
                        <div className="h-8 w-px bg-[#ba1a1a]/30 dark:bg-red-500/30 hidden lg:block absolute -bottom-4"></div>
                      </div>
                    )}

                    {/* Session B or the leave — only rendered from a resolved real row */}
                    {other && (
                      <div className="flex-1 w-full bg-[#F9FAFB] dark:bg-[#080D16] border border-[#E5E9F0] dark:border-gray-800 rounded-lg p-4">
                        <div className="mb-3">
                          <span className="bg-[#a36700]/10 dark:bg-amber-900/30 text-[#a36700] dark:text-amber-400 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider">
                            {other.courseName}
                          </span>
                        </div>
                        <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-bold text-[#131b2d] dark:text-gray-100 mb-1">
                          {other.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[#414754] dark:text-gray-400 text-[12px]">
                          <Clock className="w-4 h-4" />
                          <span>
                            {sessionRange({
                              scheduledAt: other.scheduledAt,
                              durationMin: other.durationMin,
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#727785] dark:text-gray-500 mt-1">
                          {titleCase(other.status)} &middot; {other.durationMin} min
                        </p>
                      </div>
                    )}

                    {leave && (
                      <div className="flex-1 w-full bg-[#F9FAFB] dark:bg-[#080D16] border border-[#E5E9F0] dark:border-gray-800 rounded-lg p-4">
                        <div className="mb-3">
                          <span className="bg-[#a36700]/10 dark:bg-amber-900/30 text-[#a36700] dark:text-amber-400 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider">
                            {titleCase(leave.type)} leave
                          </span>
                        </div>
                        <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-bold text-[#131b2d] dark:text-gray-100 mb-1">
                          {fmtDate(leave.startDate)}
                          {leave.endDate.getTime() !== leave.startDate.getTime()
                            ? ` - ${fmtDate(leave.endDate)}`
                            : ''}
                        </h3>
                        <div className="flex items-center gap-2 text-[#414754] dark:text-gray-400 text-[12px]">
                          <Clock className="w-4 h-4" />
                          <span>
                            {dayLabel(leave.startDate)}
                            {leave.startTime && leave.endTime
                              ? ` · ${leave.startTime}-${leave.endTime}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions — real navigation only; resolution has no write endpoint */}
                    <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0 mt-4 lg:mt-0 lg:pl-6 lg:border-l border-[#E5E9F0] dark:border-gray-800">
                      <Link
                        href={`/educator/sessions/${conflict.sessionId}`}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-700 rounded-lg text-[#2F80F9] dark:text-blue-400 font-semibold text-[12px] hover:border-[#2F80F9] hover:bg-[#2F80F9]/5 transition-all text-center"
                      >
                        View session
                      </Link>
                      {other ? (
                        <Link
                          href={`/educator/sessions/${other.id}`}
                          className="flex-1 lg:flex-none px-4 py-2 bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-700 rounded-lg text-[#2F80F9] dark:text-blue-400 font-semibold text-[12px] hover:border-[#2F80F9] hover:bg-[#2F80F9]/5 transition-all text-center"
                        >
                          View clash
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {/* Free-form details recorded on the conflict row itself */}
                  {details.length > 0 ? (
                    <dl className="mt-4 pl-3 flex flex-wrap gap-x-6 gap-y-1">
                      {details.map((d) => (
                        <div key={d.key} className="text-[12px]">
                          <dt className="inline text-[#727785] dark:text-gray-500">{d.key}: </dt>
                          <dd className="inline text-[#414754] dark:text-gray-300">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[12px] text-[#727785] dark:text-gray-600 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Conflicts are surfaced warnings only — no session is ever cancelled automatically, and
          resolution is always recorded manually.
        </p>
      </div>
    </div>
  );
}
