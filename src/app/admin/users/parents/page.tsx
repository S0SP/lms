import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Shield,
  ShieldQuestion,
  UserRound,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { orgs, users, parentProfiles } from '@/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** Mirrors requireAuth(['owner','admin']) from src/lib/api.ts for server pages. */
const ADMIN_ROLES = ['owner', 'admin'];

/** Second reference to `users` so a parent row can point at its learner. */
const learnerUser = alias(users, 'learner_user');

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

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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

function titleCase(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function pageHref(page: number, perPage: number, q: string) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (perPage !== 20) sp.set('perPage', String(perPage));
  if (page > 1) sp.set('page', String(page));
  const query = sp.toString();
  return query ? `/admin/users/parents?${query}` : '/admin/users/parents';
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}

export default async function ParentsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const orgId = await resolveOrgId(session.user.id as string);

  const { q = '', page: pageParam = '1', perPage: perPageParam = '20' } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam) || 1);
  const perPage = Math.min(50, Math.max(5, Number.parseInt(perPageParam) || 20));

  if (!orgId) {
    return (
      <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-12 text-center space-y-3">
          <UserRound className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">No organisation found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Parents are scoped to a single organisation and none exists yet.
          </p>
        </div>
      </div>
    );
  }

  // Only the parent login accounts of this tenant, joined to their profile and to
  const tenantFilter = or(eq(users.orgId, orgId), isNull(users.orgId));
  const whereClause = and(
    tenantFilter,
    eq(users.role, 'parent'),
    q
      ? or(
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.phone, `%${q}%`),
          ilike(parentProfiles.name, `%${q}%`),
          ilike(parentProfiles.email, `%${q}%`),
          ilike(parentProfiles.phone, `%${q}%`),
        )
      : undefined,
  );

  const [parentRows, totalRow, unlinkedRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        profileId: parentProfiles.id,
        relationship: parentProfiles.relationship,
        profilePhone: parentProfiles.phone,
        profileCreatedAt: parentProfiles.createdAt,
        learnerId: learnerUser.id,
        learnerName: learnerUser.name,
        learnerAvatarUrl: learnerUser.avatarUrl,
      })
      .from(users)
      .leftJoin(parentProfiles, eq(parentProfiles.userId, users.id))
      .leftJoin(learnerUser, eq(parentProfiles.learnerId, learnerUser.id))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause),

    // parent_profiles rows whose learner belongs to this org but which have no
    // login account yet (user_id is null until the parent activates one).
    db
      .select({
        id: parentProfiles.id,
        name: parentProfiles.name,
        email: parentProfiles.email,
        phone: parentProfiles.phone,
        relationship: parentProfiles.relationship,
        createdAt: parentProfiles.createdAt,
        learnerName: learnerUser.name,
      })
      .from(parentProfiles)
      .innerJoin(learnerUser, eq(parentProfiles.learnerId, learnerUser.id))
      .where(and(eq(learnerUser.orgId, orgId), isNull(parentProfiles.userId)))
      .orderBy(desc(parentProfiles.createdAt))
      .limit(25),
  ]);

  const total = totalRow[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Users Management</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage roles, permissions, and details for all platform participants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users/parents/add"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Parent
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto no-scrollbar">
        <Link
          href="/admin/users/learners"
          className="pb-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 px-1 whitespace-nowrap font-semibold"
        >
          Learners
        </Link>
        <Link
          href="/admin/users/educators"
          className="pb-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 px-1 whitespace-nowrap font-semibold"
        >
          Educators
        </Link>
        <Link href="/admin/users/parents" className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold px-1 whitespace-nowrap">
          Parents
        </Link>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Toolbar — plain GET form so search runs on the server */}
        <form
          method="get"
          className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-900/50"
        >
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search parents..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Search
          </button>
          {q ? (
            <Link
              href="/admin/users/parents"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Parent Details</th>
                <th className="px-6 py-4">Linked Learner</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {parentRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="py-16 text-center space-y-3">
                      <UserRound className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {q ? `No parents found for "${q}"` : 'No parent accounts yet'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        {q
                          ? 'Try a different name, email, or phone number.'
                          : 'Parent accounts appear here once a parent activates a login.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                parentRows.map((parent) => (
                  <tr
                    key={parent.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs">
                          {parent.avatarUrl ? (
                            <img
                              src={parent.avatarUrl}
                              alt={parent.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            initials(parent.name)
                          )}
                        </div>
                        <div>
                          <div className="mb-0.5">
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {parent.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {parent.email}
                            <br />
                            {parent.phone ?? parent.profilePhone ?? 'No phone number'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {parent.learnerId ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            {parent.learnerName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {parent.relationship ? titleCase(parent.relationship) : 'Linked'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600">
                          No learner linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {parent.profileId ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Shield className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <ShieldQuestion className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            No parent profile
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          parent.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {parent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {fmtDate(parent.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — real server-side pages driven by searchParams */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {from}–{to} of {total.toLocaleString()} parent account{total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-1">
            {totalPages > 1 ? (
              <>
                <Link
                  href={pageHref(page - 1, perPage, q)}
                  aria-disabled={page <= 1}
                  className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    page <= 1
                      ? 'text-gray-300 dark:text-gray-700 pointer-events-none'
                      : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={pageHref(p, perPage, q)}
                    className={`w-8 h-8 rounded font-bold text-sm flex items-center justify-center transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                <Link
                  href={pageHref(page + 1, perPage, q)}
                  aria-disabled={page >= totalPages}
                  className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    page >= totalPages
                      ? 'text-gray-300 dark:text-gray-700 pointer-events-none'
                      : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">Page 1 of 1</span>
            )}
          </div>
        </div>
      </div>

      {/* Parent records that have not activated a login account yet. */}
      <div className="mt-8 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
          <UserCog className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Parent Records Without a Login
          </h3>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {unlinkedRows.length} pending
          </span>
        </div>
        {unlinkedRows.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Shield className="w-9 h-9 text-emerald-400 dark:text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Every parent record has a login
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No pending parent records are waiting to be activated.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {unlinkedRows.map((row) => (
              <li key={row.id} className="p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                  {initials(row.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{row.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {row.email}
                    {row.phone ? ` · ${row.phone}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-end gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {row.learnerName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {row.relationship ? titleCase(row.relationship) : 'Linked'} · added{' '}
                    {fmtDate(row.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
