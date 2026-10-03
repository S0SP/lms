import React from 'react';
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
  if (!orgId) redirect('/admin/settings?error=missing-org');

  const name = String(formData.get('name') ?? '').trim();
  const subdomain = String(formData.get('subdomain') ?? '').trim().toLowerCase();

  if (name.length < 2 || name.length > 120) redirect('/admin/settings?error=invalid-name');
  if (!SUBDOMAIN_PATTERN.test(subdomain)) redirect('/admin/settings?error=invalid-subdomain');

  try {
    await db
      .update(orgs)
      .set({ name, subdomain, updatedAt: new Date() })
      .where(eq(orgs.id, orgId));
  } catch {
    // orgs.subdomain is UNIQUE — a collision surfaces as a Postgres error.
    redirect('/admin/settings?error=subdomain-taken');
  }

  redirect('/admin/settings?saved=1');
}

function EmptyValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-600">
      {children}
    </span>
  );
}

interface PageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const { saved, error } = await searchParams;
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
      // The whole org row — `orgs` only has name, subdomain, logo_url and timestamps.
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

      // Sessions carry no org_id — scope them through their course.
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

      // The org has no timezone column; these are the real per-educator timezones.
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

      // The org has no currency column; these are the real per-plan currencies.
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
    { href: '#organisation', label: 'Organisation', icon: Building2 },
    { href: '#storefront', label: 'Storefront', icon: LayoutTemplate },
    { href: '#activity', label: 'Activity', icon: Activity },
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
        {/* Settings Navigation — in-page anchors to the sections below */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${
                  index === 0
                    ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            ))}
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

          {/* Organisation */}
          <div
            id="organisation"
            className="scroll-mt-8 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Organisation Details</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                The columns stored on the <code className="text-xs">orgs</code> row.
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The resolved organisation id has no matching row, so there is nothing to edit.
                </p>
              </div>
            )}
          </div>

          {/* Fields that have no column in the schema — shown honestly as unavailable */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Regional &amp; Contact Settings
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <code className="text-xs">orgs</code> has no columns for these, so they cannot be edited here.
                Where a real value exists elsewhere in the database it is shown instead.
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
                  <Languages className="w-4 h-4 text-gray-400" />
                  Locale
                </span>
                <EmptyValue>Not stored — no locale column exists</EmptyValue>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Support Email
                </span>
                <EmptyValue>Not stored — no support-email column exists</EmptyValue>
              </div>
            </div>
          </div>

          {/* Storefront */}
          <div
            id="storefront"
            className="scroll-mt-8 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Storefront Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                The single <code className="text-xs">store_settings</code> row for this organisation.
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
                      {row.value ? (
                        row.value
                      ) : (
                        <EmptyValue>Not set</EmptyValue>
                      )}
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
                  No storefront configured
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This organisation has no <code className="text-xs">store_settings</code> row, so there
                  are no banner values to show.
                </p>
              </div>
            )}
          </div>

          {/* Activity */}
          <div
            id="activity"
            className="scroll-mt-8 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                What This Organisation Contains
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Live row counts, scoped to this organisation only.
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
        </div>
      </div>
    </div>
  );
}
