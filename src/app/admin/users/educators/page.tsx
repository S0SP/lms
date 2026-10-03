import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  School,
  CheckCircle2,
  Circle,
  Tag,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  orgs,
  users,
  educatorProfiles,
  courseEducators,
  courses,
  educatorTags,
  tags,
} from '@/db/schema';
import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { EducatorsTableClient, EducatorTableRow } from '@/components/admin/EducatorsTableClient';

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

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

function pageHref(page: number, perPage: number, q: string) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (perPage !== 20) sp.set('perPage', String(perPage));
  if (page > 1) sp.set('page', String(page));
  const query = sp.toString();
  return query ? `/admin/users/educators?${query}` : '/admin/users/educators';
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string; educatorId?: string }>;
}

export default async function EducatorsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const orgId = await resolveOrgId(session.user.id as string);

  const { q = '', page: pageParam = '1', perPage: perPageParam = '20', educatorId } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam) || 1);
  const perPage = Math.min(50, Math.max(5, Number.parseInt(perPageParam) || 20));

  if (!orgId) {
    return (
      <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-12 text-center space-y-3">
          <School className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">No organisation found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Educators are scoped to a single organisation and none exists yet.
          </p>
        </div>
      </div>
    );
  }

  // Role filter + tenant filter (matching org or unassigned) + real case-insensitive search
  const tenantFilter = or(eq(users.orgId, orgId), isNull(users.orgId));
  const whereClause = and(
    tenantFilter,
    eq(users.role, 'educator'),
    q
      ? or(
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.phone, `%${q}%`),
        )
      : undefined,
  );

  const [educatorRows, totalRow, courseCountRows, tagRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        tagline: educatorProfiles.tagline,
        calendarConnected: educatorProfiles.calendarConnected,
      })
      .from(users)
      .leftJoin(educatorProfiles, eq(users.id, educatorProfiles.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),

    db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause),

    // course_educators has no org_id — scope through the assigned course.
    db
      .select({ educatorId: courseEducators.educatorId, total: sql<number>`count(*)::int` })
      .from(courseEducators)
      .innerJoin(courses, eq(courseEducators.courseId, courses.id))
      .where(eq(courses.orgId, orgId))
      .groupBy(courseEducators.educatorId),

    db
      .select({
        educatorId: educatorTags.educatorId,
        name: tags.name,
        colorHex: tags.colorHex,
      })
      .from(educatorTags)
      .innerJoin(tags, eq(educatorTags.tagId, tags.id))
      .innerJoin(users, eq(educatorTags.educatorId, users.id))
      .where(and(tenantFilter, eq(users.role, 'educator')))
      .orderBy(asc(tags.name)),
  ]);

  const total = totalRow[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const courseCounts = new Map(courseCountRows.map((c) => [c.educatorId, c.total]));

  const tagsByEducator = new Map<string, typeof tagRows>();
  for (const row of tagRows) {
    const list = tagsByEducator.get(row.educatorId) ?? [];
    list.push(row);
    tagsByEducator.set(row.educatorId, list);
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const educatorsForClient: EducatorTableRow[] = educatorRows.map((educator) => ({
    id: educator.id,
    name: educator.name,
    email: educator.email,
    phone: educator.phone,
    avatarUrl: educator.avatarUrl,
    role: educator.role,
    isActive: educator.isActive,
    createdAt: educator.createdAt.toISOString(),
    lastLoginAt: educator.lastLoginAt ? educator.lastLoginAt.toISOString() : null,
    tagline: educator.tagline,
    calendarConnected: educator.calendarConnected,
    tags: tagsByEducator.get(educator.id) ?? [],
    courseCount: courseCounts.get(educator.id) ?? 0,
  }));

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
            href="/admin/users/educators/add"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Educator
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
        <Link href="/admin/users/educators" className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold px-1 whitespace-nowrap">
          Educators
        </Link>
        <Link
          href="/admin/users/parents"
          className="pb-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 px-1 whitespace-nowrap font-semibold"
        >
          Parents
        </Link>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Toolbar — plain GET form so search runs on the server */}
        <form method="get" className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search educators..."
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
              href="/admin/users/educators"
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
                <th className="px-6 py-4">Name &amp; Role</th>
                <th className="px-6 py-4">Specialty Tags</th>
                <th className="px-6 py-4">Courses</th>
                <th className="px-6 py-4">Calendar Sync</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4">Joined On</th>
              </tr>
            </thead>
            <EducatorsTableClient
              educators={educatorsForClient}
              q={q}
              initialEducatorId={educatorId || null}
            />
          </table>
        </div>

        {/* Pagination — real server-side pages driven by searchParams */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {from}–{to} of {total.toLocaleString()} educator{total === 1 ? '' : 's'}
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
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page 1 of 1
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
