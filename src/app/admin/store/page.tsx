import React from 'react';
import { redirect } from 'next/navigation';
import {
  Plus,
  Search,
  Store,
  Users,
  User,
  PlayCircle,
  ImageOff,
  LayoutTemplate,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { AdminStoreFilter } from '@/components/store/StoreFilters';
import {
  orgs,
  users,
  courses,
  courseEnrollments,
  paymentPlans,
  courseSellingPages,
  storeSettings,
} from '@/db/schema';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** Mirrors requireAuth(['owner','admin']) from src/lib/api.ts for server pages. */
const ADMIN_ROLES = ['owner', 'admin'];

const COURSE_STATUSES = ['draft', 'published', 'archived'] as const;
type CourseStatus = (typeof COURSE_STATUSES)[number];

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

const STATUS_TONE: Record<CourseStatus, string> = {
  published: 'bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-gray-100',
  draft: 'bg-gray-100/90 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400',
  archived: 'bg-amber-100/90 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300',
};

const STATUS_TONE_PLAIN: Record<CourseStatus, string> = {
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  archived: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

const TYPE_ICON = {
  one_on_one: User,
  group: Users,
  recorded: PlayCircle,
} as const;

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

function formatPrice(
  min: string | null,
  max: string | null,
  currency: string | null,
  planCount: number,
) {
  if (min === null) return 'No price set';
  if (max === null || min === max) return currency ? `${currency} ${min}` : min;
  return `${min} – ${max}${currency ? ` ${currency}` : ''} · ${planCount} plans`;
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminStorePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  const orgId = await resolveOrgId(session.user.id as string);

  const { q = '', status: statusParam = '' } = await searchParams;
  const status = COURSE_STATUSES.includes(statusParam as CourseStatus)
    ? (statusParam as CourseStatus)
    : null;

  if (!orgId) {
    return (
      <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center space-y-3">
          <Store className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">No organisation found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            The store is scoped to a single organisation and none exists yet. Create one before listing
            courses.
          </p>
        </div>
      </div>
    );
  }

  const courseWhere = and(
    eq(courses.orgId, orgId),
    status ? eq(courses.status, status) : undefined,
    q
      ? or(ilike(courses.name, `%${q}%`), ilike(courses.shortCode, `%${q}%`), ilike(courses.urlSlug, `%${q}%`))
      : undefined,
  );

  const [courseRows, settingsRows, planRows, enrollmentRows, sellingPageRows] = await Promise.all([
    db
      .select({
        id: courses.id,
        name: courses.name,
        shortCode: courses.shortCode,
        type: courses.type,
        status: courses.status,
        thumbnailUrl: courses.thumbnailUrl,
        urlSlug: courses.urlSlug,
        board: courses.board,
        grade: courses.grade,
        isAdminBooked: courses.isAdminBooked,
        defaultSessionDurationMin: courses.defaultSessionDurationMin,
        createdAt: courses.createdAt,
      })
      .from(courses)
      .where(courseWhere)
      .orderBy(desc(courses.createdAt))
      .limit(60),

    // The storefront hero is a single per-org row in store_settings.
    db.select().from(storeSettings).where(eq(storeSettings.orgId, orgId)).limit(1),

    // Prices live on payment_plans, not on courses — aggregate per course so the
    // card never shows a plan that belongs to a different course.
    db
      .select({
        courseId: paymentPlans.courseId,
        planCount: sql<number>`count(*)::int`,
        distinctCurrencies: sql<number>`count(distinct ${paymentPlans.currency})::int`,
        minPrice: sql<string | null>`min(${paymentPlans.price})`,
        maxPrice: sql<string | null>`max(${paymentPlans.price})`,
        currency: sql<string | null>`min(${paymentPlans.currency})`,
      })
      .from(paymentPlans)
      .innerJoin(courses, eq(paymentPlans.courseId, courses.id))
      .where(eq(courses.orgId, orgId))
      .groupBy(paymentPlans.courseId),

    db
      .select({
        courseId: courseEnrollments.courseId,
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${courseEnrollments.status} = 'active')::int`,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courses.orgId, orgId))
      .groupBy(courseEnrollments.courseId),

    db
      .select({
        courseId: courseSellingPages.courseId,
        publishedAt: courseSellingPages.publishedAt,
      })
      .from(courseSellingPages)
      .innerJoin(courses, eq(courseSellingPages.courseId, courses.id))
      .where(eq(courses.orgId, orgId)),
  ]);

  const settings = settingsRows[0] ?? null;
  const plansByCourse = new Map(planRows.map((p) => [p.courseId, p]));
  const enrollmentsByCourse = new Map(enrollmentRows.map((e) => [e.courseId, e]));
  const sellingByCourse = new Map(sellingPageRows.map((s) => [s.courseId, s]));

  const totalCourses = courseRows.length;
  const hasFilters = Boolean(q || status);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full">
      {/* Page Header & Tabs */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Store Management</h2>
          <Link
            href="/admin/courses/create"
            className="bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Course
          </Link>
        </div>

        {/* Underline Tabs */}
        <div className="flex gap-8">
          <span className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold text-sm px-1">
            Courses
          </span>
          <Link
            href="/admin/settings"
            className="pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 font-bold text-sm px-1 transition-colors"
          >
            Store Settings
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Storefront Preview — rendered from the org's store_settings row */}
        <section className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Storefront Preview</h3>
            {settings ? (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Last updated{' '}
                {settings.updatedAt.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            ) : null}
          </div>

          {settings ? (
            <div className="p-6">
              <div
                className="w-full h-48 md:h-64 rounded-xl flex flex-col justify-center items-center text-center p-8 relative overflow-hidden"
                style={{
                  backgroundColor: settings.bgColor ?? undefined,
                  color: settings.textColor ?? undefined,
                }}
              >
                {settings.coverImageUrl ? (
                  <img
                    src={settings.coverImageUrl}
                    alt="Storefront cover"
                    className="absolute inset-0 w-full h-full object-cover opacity-25"
                  />
                ) : null}
                <h4
                  className="text-3xl md:text-5xl font-bold mb-4 relative z-10 tracking-tight"
                  style={{ color: settings.textColor ?? undefined }}
                >
                  {settings.title || 'Untitled storefront'}
                </h4>
                <p
                  className="text-sm md:text-lg max-w-2xl relative z-10"
                  style={{ color: settings.textColor ?? undefined, opacity: 0.85 }}
                >
                  {settings.subtitle || 'No subtitle has been set for this storefront.'}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-gray-200 dark:border-gray-800 pt-6">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Storefront logo"
                    className="w-10 h-10 rounded-lg object-contain border border-gray-200 dark:border-gray-700"
                  />
                ) : null}
                <span className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Banner Theme
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Background</span>
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: settings.bgColor ?? 'transparent' }}
                    title={settings.bgColor ?? 'Not set'}
                  />
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {settings.bgColor ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Text</span>
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: settings.textColor ?? 'transparent' }}
                    title={settings.textColor ?? 'Not set'}
                  />
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {settings.textColor ?? '—'}
                  </span>
                </div>
                {settings.externalUrl ? (
                  <a
                    href={settings.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    {settings.externalUrl}
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <LayoutTemplate className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                No storefront configured
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                This organisation has no <code className="text-xs">store_settings</code> row, so there is no
                banner to preview. The public catalog still lists published courses.
              </p>
            </div>
          )}
        </section>

        {/* Course Grid Section */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {hasFilters ? 'Matching Courses' : 'Courses'}{' '}
              <span className="text-gray-400 dark:text-gray-500 font-semibold">({totalCourses})</span>
            </h3>

            <AdminStoreFilter
              initialQ={q ?? ''}
              initialStatus={status ?? ''}
              statusOptions={COURSE_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
            />
          </div>

          {courseRows.length === 0 ? (
            <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center space-y-3">
              {hasFilters ? (
                <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              ) : (
                <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              )}
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {hasFilters ? 'No courses match your filters' : 'No courses in this store yet'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {hasFilters
                  ? 'Try a different search term or clear the status filter.'
                  : 'Create your first course to start selling in the storefront.'}
              </p>
              {!hasFilters ? (
                <Link
                  href="/admin/courses/create"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Course
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courseRows.map((course) => {
                const TypeIcon = TYPE_ICON[course.type] ?? BookOpen;
                const plans = plansByCourse.get(course.id);
                const enrollments = enrollmentsByCourse.get(course.id);
                const selling = sellingByCourse.get(course.id);
                const priceLabel = plans
                  ? formatPrice(
                      plans.minPrice,
                      plans.maxPrice,
                      plans.distinctCurrencies === 1 ? plans.currency : null,
                      plans.planCount,
                    )
                  : 'No pricing plan';

                return (
                  <div
                    key={course.id}
                    className={`bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col group ${
                      course.status === 'draft' ? 'opacity-90' : ''
                    }`}
                  >
                    <div className="aspect-video relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {course.thumbnailUrl ? (
                        <img
                          alt={`${course.name} thumbnail`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={course.thumbnailUrl}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-gray-600">
                          <ImageOff className="w-8 h-8" />
                          <span className="text-xs font-medium">No thumbnail</span>
                        </div>
                      )}
                      <div
                        className={`absolute top-2 right-2 backdrop-blur font-bold text-[10px] px-2 py-1 rounded uppercase tracking-wide shadow-sm ${
                          STATUS_TONE[course.status]
                        }`}
                      >
                        {course.status}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                        {course.name}
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 flex items-center gap-1.5">
                        <TypeIcon className="w-3.5 h-3.5" />
                        {titleCase(course.type)}
                        {course.board || course.grade ? ` · ${[course.board, course.grade].filter(Boolean).join(' ')}` : ''}
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs">
                        {enrollments
                          ? `${enrollments.active} active · ${enrollments.total} total enrollment${enrollments.total === 1 ? '' : 's'}`
                          : 'No enrollments yet'}
                      </p>

                      <div className="mt-auto pt-4">
                        <div className="flex justify-between items-end mb-3 gap-2">
                          <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                            {priceLabel}
                          </span>
                          {selling?.publishedAt ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                              Page live
                            </span>
                          ) : null}
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              STATUS_TONE_PLAIN[course.status]
                            }`}
                          >
                            {course.isAdminBooked ? 'Admin booked' : 'Self-serve'}
                          </span>
                          {course.urlSlug ? (
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500 truncate">
                              /{course.urlSlug}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">No public slug</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {courseRows.length > 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
              Showing up to 60 most recently created courses.{' '}
              <Link href="/admin/courses" className="text-blue-600 dark:text-blue-400 hover:underline">
                Manage all courses
              </Link>{' '}
              ·{' '}
              <Link href="/store" className="text-blue-600 dark:text-blue-400 hover:underline">
                View public storefront
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
