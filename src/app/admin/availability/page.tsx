import React from 'react';
import { redirect } from 'next/navigation';
import {
  CalendarDays,
  CalendarOff,
  TriangleAlert,
  CheckCircle2,
  Circle,
  Clock,
  Globe,
  CalendarX,
  UserRound,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  orgs,
  users,
  educatorProfiles,
  availabilityProfiles,
  leaves,
  sessions,
  sessionConflicts,
  courses,
} from '@/db/schema';
import { and, asc, desc, eq, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** Mirrors requireAuth(['owner','admin']) from src/lib/api.ts for server pages. */
const ADMIN_ROLES = ['owner', 'admin'];

/**
 * Tenant scope. The Auth.js JWT only carries id + role, so the org has to be read
 * back from the users row. Admin rows created before tenancy was enforced have a
 * null org_id, so we fall back to the first org — the same resolution order as
 * courseService.resolveOrgId. Returning null means "no org exists yet"; callers
 * must render empty states rather than querying across every org.
 */
async function resolveOrgId(userId: string) {
  const [me] = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (me?.orgId) return me.orgId;

  const [firstOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
  return firstOrg?.id ?? null;
}

const WEEKDAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
  { key: 'saturday', label: 'SAT' },
  { key: 'sunday', label: 'SUN' },
] as const;

const CONFLICT_TONE: Record<string, string> = {
  leave: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  lms_overlap: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
};

function titleCase(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/** schedule_json is free-form jsonb: { monday: [{ start, end }] }. Read it defensively. */
function readSlots(schedule: unknown, dayKey: string) {
  if (!schedule || typeof schedule !== 'object') return [];
  const raw = (schedule as Record<string, unknown>)[dayKey];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((slot) => {
      const value = (slot ?? {}) as { start?: unknown; end?: unknown };
      return {
        start: typeof value.start === 'string' ? value.start : '',
        end: typeof value.end === 'string' ? value.end : '',
      };
    })
    .filter((slot) => slot.start !== '' && slot.end !== '');
}

/** overrides_json is keyed by ISO date — the keys themselves are the real override dates. */
function readOverrideDates(overrides: unknown) {
  if (!overrides || typeof overrides !== 'object') return [];
  return Object.keys(overrides as Record<string, unknown>).sort();
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** details_json holds the conflict specifics; surface them as plain key/value text. */
function describeDetails(details: unknown) {
  if (!details || typeof details !== 'object') return [];
  return Object.entries(details as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => ({
      key: titleCase(key),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
}

export default async function AdminAvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const orgId = await resolveOrgId(session.user.id as string);

  if (!orgId) {
    return (
      <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center space-y-3">
          <TriangleAlert className="w-10 h-10 text-amber-400 dark:text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">No organisation found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Availability is scoped to a single organisation and none exists yet.
          </p>
        </div>
      </div>
    );
  }

  const now = new Date();

  // availability_profiles / leaves have no org_id — both are scoped through the
  // owning educator's users row, and the weekly grid only ever uses real schedule_json.
  const [educatorRows, leaveRows, conflictRows] = await Promise.all([
    db
      .select({
        educatorId: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        calendarConnected: educatorProfiles.calendarConnected,
        profileId: availabilityProfiles.id,
        profileName: availabilityProfiles.name,
        timezone: availabilityProfiles.timezone,
        isDefault: availabilityProfiles.isDefault,
        scheduleJson: availabilityProfiles.scheduleJson,
        overridesJson: availabilityProfiles.overridesJson,
      })
      .from(users)
      .leftJoin(educatorProfiles, eq(educatorProfiles.userId, users.id))
      .leftJoin(availabilityProfiles, eq(availabilityProfiles.educatorId, users.id))
      .where(and(eq(users.orgId, orgId), eq(users.role, 'educator')))
      .orderBy(asc(users.name)),

    db
      .select({
        id: leaves.id,
        educatorId: leaves.educatorId,
        educatorName: users.name,
        type: leaves.type,
        startDate: leaves.startDate,
        endDate: leaves.endDate,
        startTime: leaves.startTime,
        endTime: leaves.endTime,
        reason: leaves.reason,
      })
      .from(leaves)
      .innerJoin(users, eq(leaves.educatorId, users.id))
      .where(and(eq(users.orgId, orgId), gte(leaves.endDate, now)))
      .orderBy(asc(leaves.startDate))
      .limit(50),

    // Conflicts hang off sessions → courses, which is what carries the tenant.
    db
      .select({
        id: sessionConflicts.id,
        sessionId: sessionConflicts.sessionId,
        conflictSource: sessionConflicts.conflictSource,
        detailsJson: sessionConflicts.detailsJson,
        resolvedAt: sessionConflicts.resolvedAt,
        createdAt: sessionConflicts.createdAt,
        sessionTitle: sessions.title,
        scheduledAt: sessions.scheduledAt,
        courseName: courses.name,
        educatorName: users.name,
      })
      .from(sessionConflicts)
      .innerJoin(sessions, eq(sessionConflicts.sessionId, sessions.id))
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .innerJoin(users, eq(sessions.educatorId, users.id))
      .where(eq(courses.orgId, orgId))
      .orderBy(asc(sessionConflicts.resolvedAt), desc(sessionConflicts.createdAt))
      .limit(50),
  ]);

  const totalSlots = educatorRows.reduce(
    (sum, e) =>
      sum + WEEKDAYS.reduce((daySum, day) => daySum + readSlots(e.scheduleJson, day.key).length, 0),
    0,
  );
  const profiledEducators = educatorRows.filter((e) => e.profileId !== null).length;
  const openConflicts = conflictRows.filter((c) => c.resolvedAt === null).length;

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Availability Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {educatorRows.length} educator{educatorRows.length === 1 ? '' : 's'} ·{' '}
            {profiledEducators} with a schedule · {totalSlots} weekly slot{totalSlots === 1 ? '' : 's'}
            {openConflicts > 0 ? ` · ${openConflicts} unresolved conflict${openConflicts === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      </div>

      {/* Weekly availability grid — every cell comes from availability_profiles.schedule_json */}
      <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[260px_repeat(7,_1fr)] border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="p-4 font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center border-r border-gray-200 dark:border-gray-800">
            Educator
          </div>
          {WEEKDAYS.map((day) => (
            <div
              key={day.key}
              className="p-4 text-center border-r border-gray-200 dark:border-gray-800 last:border-r-0"
            >
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{day.label}</span>
            </div>
          ))}
        </div>

        {educatorRows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserRound className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No educators yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Add an educator to this organisation and their weekly schedule will appear here.
            </p>
          </div>
        ) : (
          educatorRows.map((e) => {
            const overrideDates = readOverrideDates(e.overridesJson);
            return (
              <div
                key={e.educatorId}
                className="grid grid-cols-[260px_repeat(7,_1fr)] border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                {/* Educator Info */}
                <div className="p-4 flex items-center gap-3 border-r border-gray-200 dark:border-gray-800">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                      {e.avatarUrl ? (
                        <img
                          src={e.avatarUrl}
                          alt={e.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        initials(e.name)
                      )}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#161B26] z-10 ${
                        e.calendarConnected ? 'bg-emerald-500' : 'bg-white dark:bg-[#161B26] border-gray-300 dark:border-gray-600'
                      }`}
                      title={e.calendarConnected ? 'Calendar connected' : 'Calendar not connected'}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {e.name}
                    </div>
                    {e.profileId ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                        <Globe className="w-3 h-3 shrink-0" />
                        {e.timezone}
                        {e.isDefault ? ' · default' : ''}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        No availability profile
                      </div>
                    )}
                    {overrideDates.length > 0 ? (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {overrideDates.length} date override{overrideDates.length === 1 ? '' : 's'}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* One cell per weekday, straight from the stored schedule */}
                {WEEKDAYS.map((day) => {
                  const slots = readSlots(e.scheduleJson, day.key);
                  return (
                    <div
                      key={day.key}
                      className="p-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0 flex flex-col justify-center gap-1"
                    >
                      {slots.length === 0 ? (
                        <span className="text-[10px] text-gray-300 dark:text-gray-600 text-center py-1">
                          {e.profileId ? 'No slots' : '—'}
                        </span>
                      ) : (
                        slots.map((slot, i) => (
                          <span
                            key={`${slot.start}-${slot.end}-${i}`}
                            className="text-center text-[10px] font-semibold px-1 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap"
                          >
                            {slot.start}–{slot.end}
                          </span>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-6 text-sm text-gray-500 dark:text-gray-400 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>Available slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
          <span>No availability stored</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-[#161B26]" />
          <span>Calendar Synced</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white dark:bg-[#161B26] border-2 border-gray-300 dark:border-gray-600" />
          <span>Not Synced</span>
        </div>
      </div>

      {/* Leaves + Conflicts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Upcoming leaves */}
        <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Upcoming Leaves
            </h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {leaveRows.length} scheduled
            </span>
          </div>
          {leaveRows.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CalendarDays className="w-9 h-9 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No upcoming leaves</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nothing is marked unavailable from today onwards.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {leaveRows.map((leave) => (
                <li key={leave.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <CalendarX className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {leave.educatorName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {leave.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmtDate(leave.startDate)}
                      {leave.endDate.getTime() !== leave.startDate.getTime()
                        ? ` – ${fmtDate(leave.endDate)}`
                        : ''}
                      {leave.type === 'partial' && leave.startTime && leave.endTime
                        ? ` · ${leave.startTime}–${leave.endTime}`
                        : ''}
                    </p>
                    {leave.reason ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{leave.reason}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Session conflicts */}
        <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <TriangleAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Session Conflicts</h3>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {openConflicts} unresolved of {conflictRows.length}
            </span>
          </div>
          {conflictRows.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 dark:text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No conflicts detected</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nothing has clashed with a leave, calendar event, or another session.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {conflictRows.map((conflict) => {
                const details = describeDetails(conflict.detailsJson);
                return (
                  <li key={conflict.id} className="p-4 flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        conflict.resolvedAt
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {conflict.resolvedAt ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <TriangleAlert className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {conflict.sessionTitle}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            CONFLICT_TONE[conflict.conflictSource] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {titleCase(conflict.conflictSource)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtDate(conflict.scheduledAt)} · {conflict.courseName} · {conflict.educatorName}
                      </p>
                      {details.length > 0 ? (
                        <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                          {details.map((d) => (
                            <div key={d.key} className="text-xs">
                              <dt className="inline text-gray-400 dark:text-gray-500">{d.key}: </dt>
                              <dd className="inline text-gray-600 dark:text-gray-300">{d.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {conflict.resolvedAt
                          ? `Resolved ${fmtDate(conflict.resolvedAt)}`
                          : `Raised ${fmtDate(conflict.createdAt)} · needs manual resolution`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 mt-6 flex items-center gap-1.5">
        <Circle className="w-3 h-3" />
        Conflicts are surfaced warnings only — no session is ever cancelled automatically.
      </p>
    </div>
  );
}
