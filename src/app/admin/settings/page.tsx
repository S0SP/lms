import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Save,
  Building2,
  LayoutTemplate,
  Activity,
  Globe,
  Mail,
  Landmark,
  Languages,
  AlertTriangle,
  CircleCheck,
  ImageOff,
  Calendar,
  CreditCard,
  Webhook,
  CheckCircle2,
  XCircle,
  Video,
  Bot,
  Zap,
  Info,
  ExternalLink,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  orgs,
  users,
  courses,
  sessions,
  educatorProfiles,
  availabilityProfiles,
  paymentPlans,
  storeSettings,
} from '@/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { config } from '@/config/unifiedConfig';

export const dynamic = 'force-dynamic';

/** Mirrors requireAuth(['owner','admin']) from src/lib/api.ts for server pages. */
const ADMIN_ROLES = ['owner', 'admin'];

/**
 * Tenant scope. The Auth.js JWT only carries id + role, so the org has to be read
 * back from the users row. Admin rows created before tenancy was enforced have a
 * null org_id, so we fall back to the first org — the same resolution order as
 * courseService.resolveOrgId.
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

const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-name': 'Organisation name must be between 2 and 120 characters.',
  'invalid-subdomain':
    'Subdomain must be lowercase letters, numbers and hyphens, and cannot start or end with a hyphen.',
  'subdomain-taken': 'That subdomain is already used by another organisation.',
  'missing-org': 'No organisation row exists to update yet.',
};

function titleCase(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Persists the two writable org columns. Everything else in `orgs` is read-only. */
async function saveOrganisation(formData: FormData) {
  'use server';

  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const orgId = await resolveOrgId(session.user.id as string);
  if (!orgId) redirect('/admin/settings?error=missing-org&tab=organisation');

  const name = String(formData.get('name') ?? '').trim();
  const subdomain = String(formData.get('subdomain') ?? '').trim().toLowerCase();
  const rawMinAttendance = formData.get('minAttendanceMinutes');
  const minAttendanceMinutes = rawMinAttendance ? Math.max(1, parseInt(String(rawMinAttendance), 10) || 40) : 40;

  if (name.length < 2 || name.length > 120) redirect('/admin/settings?error=invalid-name&tab=organisation');
  if (!SUBDOMAIN_PATTERN.test(subdomain)) redirect('/admin/settings?error=invalid-subdomain&tab=organisation');

  try {
    await db
      .update(orgs)
      .set({
        name,
        subdomain,
        minAttendanceMinutes,
        updatedAt: new Date(),
      })
      .where(eq(orgs.id, orgId));
  } catch {
    // orgs.subdomain is UNIQUE — a collision surfaces as a Postgres error.
    redirect('/admin/settings?error=subdomain-taken&tab=organisation');
  }

  redirect('/admin/settings?saved=1&tab=organisation');
}

function EmptyValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-600">
      {children}
    </span>
  );
}

interface PageProps {
  searchParams: Promise<{ saved?: string; error?: string; tab?: string }>;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const { saved, error, tab } = await searchParams;
  const currentTab = tab || 'organisation';
  const orgId = await resolveOrgId(session.user.id as string);

  if (!orgId) {
    return (
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <div className="mt-6 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-12 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 dark:text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No organisation found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Settings belong to an organisation and no <code className="text-xs">orgs</code> row exists
            yet, so there is nothing to show or edit.
          </p>
        </div>
      </div>
    );
  }

  const [
    orgRows,
    settingsRows,
    roleRows,
    courseCount,
    sessionCount,
    profileCount,
    timezoneRows,
    currencyRows,
  ] = await Promise.all([
    db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1),
    db.select().from(storeSettings).where(eq(storeSettings.orgId, orgId)).limit(1),
    db
      .select({ role: users.role, total: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.orgId, orgId))
      .groupBy(users.role),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(courses)
      .where(eq(courses.orgId, orgId)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(sessions)
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .where(eq(courses.orgId, orgId)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(educatorProfiles)
      .innerJoin(users, eq(educatorProfiles.userId, users.id))
      .where(and(eq(users.orgId, orgId), eq(users.role, 'educator'))),
    db
      .select({
        timezone: availabilityProfiles.timezone,
        total: sql<number>`count(*)::int`,
      })
      .from(availabilityProfiles)
      .innerJoin(users, eq(availabilityProfiles.educatorId, users.id))
      .where(and(eq(users.orgId, orgId), eq(users.role, 'educator')))
      .groupBy(availabilityProfiles.timezone)
      .orderBy(desc(sql<number>`count(*)`)),
    db
      .select({ currency: paymentPlans.currency, total: sql<number>`count(*)::int` })
      .from(paymentPlans)
      .innerJoin(courses, eq(paymentPlans.courseId, courses.id))
      .where(eq(courses.orgId, orgId))
      .groupBy(paymentPlans.currency)
      .orderBy(desc(sql<number>`count(*)`)),
  ]);

  const org = orgRows[0] ?? null;
  const store = settingsRows[0] ?? null;
  const roles = new Map(roleRows.map((r) => [r.role, r.total]));

  const totals = [
    { label: 'Learners', value: roles.get('learner') ?? 0 },
    { label: 'Educators', value: roles.get('educator') ?? 0 },
    { label: 'Educator Profiles', value: profileCount[0]?.total ?? 0 },
    { label: 'Parents', value: roles.get('parent') ?? 0 },
    { label: 'Courses', value: courseCount[0]?.total ?? 0 },
    { label: 'Sessions', value: sessionCount[0]?.total ?? 0 },
  ];

  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  const navItems = [
    { id: 'organisation', href: '/admin/settings?tab=organisation', label: 'Organisation', icon: Building2 },
    { id: 'storefront', href: '/admin/settings?tab=storefront', label: 'Storefront', icon: LayoutTemplate },
    { id: 'integrations', href: '/admin/settings?tab=integrations', label: 'Integrations', icon: Calendar },
    { id: 'payments', href: '/admin/settings?tab=payments', label: 'Payment Gateways', icon: CreditCard },
    { id: 'webhooks', href: '/admin/settings?tab=webhooks', label: 'Webhooks & APIs', icon: Webhook },
    { id: 'activity', href: '/admin/settings?tab=activity', label: 'Activity & DB', icon: Activity },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {org ? `Configuration for ${org.name}.` : 'Manage platform configuration and preferences.'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          ) : null}
          {saved ? (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
              <CircleCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Organisation details saved.</p>
            </div>
          ) : null}

          {/* TAB 1: ORGANISATION */}
          {currentTab === 'organisation' && (
            <div className="space-y-6">
              <div
                id="organisation"
                className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Organisation Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    The core identity columns stored on the <code className="text-xs">orgs</code> row.
                  </p>
                </div>

                {org ? (
                  <form action={saveOrganisation} className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        Organisation Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        defaultValue={org.name}
                        className="w-full px-4 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="subdomain"
                        className="block text-sm font-bold text-gray-700 dark:text-gray-300"
                      >
                        Subdomain
                      </label>
                      <input
                        id="subdomain"
                        name="subdomain"
                        type="text"
                        required
                        maxLength={63}
                        defaultValue={org.subdomain}
                        className="w-full px-4 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                      />
                      <p className="text-xs text-gray-400 dark:text-gray-500">Unique across all academies.</p>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="minAttendanceMinutes"
                        className="block text-sm font-bold text-gray-700 dark:text-gray-300"
                      >
                        Minimum Zoom Attendance Duration (Minutes)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="minAttendanceMinutes"
                          name="minAttendanceMinutes"
                          type="number"
                          min={1}
                          max={300}
                          required
                          defaultValue={org.minAttendanceMinutes ?? 40}
                          className="w-36 px-4 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-center font-bold"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">minutes</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Minimum time a student must stay in a Zoom session to have their attendance automatically recorded as Attended.
                        <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">
                          (Set to 1 or 2 for instant testing, or 40 for production classes).
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-sm font-bold text-gray-700 dark:text-gray-300">Logo</span>
                      {org.logoUrl ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={org.logoUrl}
                            alt={`${org.name} logo`}
                            className="w-16 h-16 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2333]"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400 break-all">{org.logoUrl}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-4 py-3">
                          <ImageOff className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No logo has been uploaded. <code className="text-xs">logo_url</code> is null.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <span className="block text-sm font-bold text-gray-700 dark:text-gray-300">Timestamps</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created {fmtDateTime(org.createdAt)} · Last updated {fmtDateTime(org.updatedAt)}
                      </p>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-400 dark:text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Organisation row not found
                    </p>
                  </div>
                )}
              </div>

              {/* Regional & Contact Settings */}
              <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Regional &amp; Contact Settings
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Live schedule timezones and active payment plan currencies.
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Globe className="w-4 h-4 text-gray-400" />
                      Timezone
                    </span>
                    {timezoneRows.length > 0 ? (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {timezoneRows.map((t) => `${t.timezone} (${t.total})`).join(', ')}
                        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                          from educator schedules
                        </span>
                      </span>
                    ) : (
                      <EmptyValue>No educator has set a timezone yet</EmptyValue>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Landmark className="w-4 h-4 text-gray-400" />
                      Currency
                    </span>
                    {currencyRows.length > 0 ? (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {currencyRows.map((c) => `${c.currency} (${c.total} plan${c.total === 1 ? '' : 's'})`).join(', ')}
                        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">from course plans</span>
                      </span>
                    ) : (
                      <EmptyValue>No course pricing plan has been created</EmptyValue>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Mail className="w-4 h-4 text-gray-400" />
                      Support Email
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{config.email.from}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STOREFRONT */}
          {currentTab === 'storefront' && (
            <div
              id="storefront"
              className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Storefront Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  The active banner configuration stored on <code className="text-xs">store_settings</code>.
                </p>
              </div>

              {store ? (
                <dl className="p-6 space-y-3 text-sm">
                  {[
                    { label: 'Title', value: store.title },
                    { label: 'Subtitle', value: store.subtitle },
                    { label: 'Background', value: store.bgColor },
                    { label: 'Text', value: store.textColor },
                    { label: 'External URL', value: store.externalUrl },
                  ].map((row) => (
                    <div key={row.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <dt className="font-semibold text-gray-700 dark:text-gray-300">{row.label}</dt>
                      <dd className="text-gray-600 dark:text-gray-300 break-all">
                        {row.value ? row.value : <EmptyValue>Not set</EmptyValue>}
                      </dd>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <dt className="font-semibold text-gray-700 dark:text-gray-300">Last updated</dt>
                    <dd className="text-gray-600 dark:text-gray-300">{fmtDateTime(store.updatedAt)}</dd>
                  </div>
                </dl>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <LayoutTemplate className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    No storefront banner configured
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This organisation has no custom banner row yet. Default academy branding is displayed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTEGRATIONS */}
          {currentTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Third-Party Integrations</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Real-time status of external video, calendar, email, and messaging services.
                  </p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Google Calendar */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">Google Calendar Sync</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Enables automatic 2-way session syncing for educators and learners.
                        </p>
                        <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                          Callback URI: {config.googleCalendar.redirectUri}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {config.googleCalendar.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unconfigured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Zoom */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">Zoom Server-to-Server OAuth</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Generates instant meeting rooms and recording URLs for 1-on-1 and group classes.
                        </p>
                        {config.zoom.accountId && (
                          <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                            Account ID: ••••••••{config.zoom.accountId.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {config.zoom.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unconfigured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transactional Email (SMTP) */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">SMTP Transactional Email</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Sends invites, session reminders, PIN notifications, and parent reports.
                        </p>
                        <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                          Sender: {config.email.from} {config.email.smtpHost ? `· Host: ${config.email.smtpHost}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {config.email.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          <Info className="w-3.5 h-3.5" />
                          Dev Console Mode
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Generation Engine */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">AI Pedagogical Engine</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Powers automatic session summaries, multi-question quizzes, and revision notes.
                        </p>
                        <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                          Model: {config.gemini.model || 'gemini-2.5-flash'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {config.gemini.apiKey || config.anthropic.apiKey ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Key Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Realtime Chat (Ably) */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">Live Course Chat &amp; Events</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Powers real-time websocket messaging in course workspaces and 1-on-1 chats.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {config.ably.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          WebSockets Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          Polling Fallback
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS */}
          {currentTab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Payment Gateways &amp; Billing</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage student fee collections, credit top-ups, and currency settlement gateways.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Razorpay Gateway Card */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          ₹
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">Razorpay (India / INR)</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">UPI, Net Banking, Credit/Debit Cards, EMI</p>
                        </div>
                      </div>
                      <div>
                        {config.razorpay.enabled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Live Gateway Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Dev Simulator Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400">Key ID</span>
                        <span className="font-mono text-gray-900 dark:text-gray-200">
                          {config.razorpay.keyId || 'Auto-fallback to test simulation'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400">Webhook Secret</span>
                        <span className="text-gray-900 dark:text-gray-200">
                          {config.razorpay.webhookSecret ? 'Configured & Verified' : 'Not set'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        When live credentials are not set in <code className="font-mono">.env</code>, student fee payments and credit checkouts run in test simulation mode. Invoices, credit ledger top-ups, and auto-enrollments succeed end-to-end without real transactions.
                      </span>
                    </div>
                  </div>

                  {/* Stripe Gateway Card */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4 opacity-75">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                          $
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">Stripe (International)</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">USD, EUR, GBP, AUD Global Cards</p>
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          Available on Request
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Stripe multi-currency checkout is scaffolded and activates when <code className="font-mono">STRIPE_SECRET_KEY</code> is configured.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WEBHOOKS & APIS */}
          {currentTab === 'webhooks' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Inbound Webhooks &amp; Public Endpoints</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Configure these URLs in your third-party provider dashboards to receive asynchronous events.
                  </p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Payment Webhook */}
                  <div className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        Razorpay Payment Verification &amp; Capture
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        POST
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-50 dark:bg-[#1C2333] border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-800 dark:text-gray-200 break-all select-all">
                      {config.appUrl}/api/v1/payments/verify
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Verifies HMAC SHA256 signatures, credits student balances, and activates course enrollments.
                    </p>
                  </div>

                  {/* Zoom Webhook */}
                  <div className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        Zoom Video Meeting Events
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        POST
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-50 dark:bg-[#1C2333] border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-800 dark:text-gray-200 break-all select-all">
                      {config.appUrl}/api/webhooks/zoom
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Receives <code className="font-mono">meeting.ended</code> and <code className="font-mono">recording.completed</code> webhooks.
                    </p>
                  </div>

                  {/* Google Calendar Webhook */}
                  <div className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        Google Calendar OAuth Consent Callback
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        GET
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-50 dark:bg-[#1C2333] border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-800 dark:text-gray-200 break-all select-all">
                      {config.googleCalendar.redirectUri}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Must be listed in your Google Cloud Console Authorized Redirect URIs.
                    </p>
                  </div>

                  {/* Session Reminders Cron */}
                  <div className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        Upstash QStash Reminder Webhook
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        POST
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-50 dark:bg-[#1C2333] border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-800 dark:text-gray-200 break-all select-all">
                      {config.appUrl}/api/cron/session-reminder
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Receives scheduled callbacks to send student and educator 1-hour and 10-minute class reminders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY & DB */}
          {currentTab === 'activity' && (
            <div
              id="activity"
              className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  What This Organisation Contains
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Live database row counts, scoped strictly to this organisation.
                </p>
              </div>
              <dl className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {totals.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-gray-200 dark:border-gray-800 p-4"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {row.label}
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {row.value.toLocaleString()}
                    </dd>
                  </div>
                ))}
              </dl>
              {roleRows.length > 0 ? (
                <p className="px-6 pb-6 text-xs text-gray-400 dark:text-gray-500">
                  Roles in use: {roleRows.map((r) => `${titleCase(r.role)} (${r.total})`).join(' · ')}
                </p>
              ) : (
                <p className="px-6 pb-6 text-xs text-gray-400 dark:text-gray-500">
                  No user accounts are attached to this organisation yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
