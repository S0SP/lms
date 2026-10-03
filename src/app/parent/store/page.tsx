import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  courseEducators,
  courseEnrollments,
  courses,
  parentProfiles,
  paymentPlans,
  users,
} from '@/db/schema';
import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { ArrowRight, BookOpen, Clock, Search, Star, User, Users } from 'lucide-react';
import { ParentStoreFilter } from '@/components/store/StoreFilters';

export const dynamic = 'force-dynamic';

function formatMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return 'Price not set';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    // Currency code stored on the row is not a valid ISO code.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const TYPE_LABELS: Record<string, string> = {
  one_on_one: 'One-on-one',
  group: 'Group',
  recorded: 'Recorded',
};

const PLAN_LABELS: Record<string, string> = {
  per_session: 'Per session',
  bundle: 'Bundle',
  subscription: 'Subscription',
  free: 'Free',
};

const initialsOf = (name: string | null) =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default async function ParentStore({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; board?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const parentUserId = session.user.id as string;

  // Authorisation: enrolment is recorded per child, so the permitted learner ids
  // decide whose "Enrolled" state may be shown. This is the same
  // parent_profiles.user_id / .learner_id link reportRepository.isLinkedParent()
  // checks.
  const links = await db
    .select({ learnerId: parentProfiles.learnerId, learnerName: users.name })
    .from(parentProfiles)
    .innerJoin(users, eq(parentProfiles.learnerId, users.id))
    .where(eq(parentProfiles.userId, parentUserId));

  const learnerIds = links.map((l) => l.learnerId);

  if (learnerIds.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg p-10 flex flex-col items-center justify-center text-center">
          <User className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No child linked</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            Your account is not linked to a learner profile yet, so no purchase can be attributed to
            a child. Please contact the admin.
          </p>
        </div>
      </div>
    );
  }

  const childName = (id: string) => links.find((l) => l.learnerId === id)?.learnerName ?? 'Child';

  const { q: qParam, board: boardParam } = await searchParams;
  const q = (qParam ?? '').trim();
  const board = (boardParam ?? '').trim();

  // Price comes from the course's real payment plan — the default one, otherwise
  // the cheapest. A course with no priced plan renders "Price not set".
  const priceSql = sql<string | null>`(
    SELECT (p.price)::text FROM payment_plans p
    WHERE p.course_id = ${courses.id} AND p.price IS NOT NULL
    ORDER BY p.is_default DESC, p.price ASC
    LIMIT 1
  )`;
  const currencySql = sql<string | null>`(
    SELECT p.currency FROM payment_plans p
    WHERE p.course_id = ${courses.id} AND p.price IS NOT NULL
    ORDER BY p.is_default DESC, p.price ASC
    LIMIT 1
  )`;

  // Draft and archived courses are never listed; the search terms only refine
  // that same published set.
  const catalogWhere = and(
    eq(courses.status, 'published'),
    q ? ilike(courses.name, `%${q}%`) : undefined,
    board ? or(ilike(courses.board, `%${board}%`), ilike(courses.name, `%${board}%`)) : undefined,
  );

  const [catalog, boards] = await Promise.all([
    db
      .select({
        id: courses.id,
        name: courses.name,
        type: courses.type,
        description: courses.description,
        thumbnailUrl: courses.thumbnailUrl,
        board: courses.board,
        grade: courses.grade,
        defaultSessionDurationMin: courses.defaultSessionDurationMin,
        price: priceSql,
        currency: currencySql,
        sessionCount: sql<number>`(
          SELECT count(*)::int FROM sessions s
          WHERE s.course_id = ${courses.id} AND s.status <> 'cancelled'
        )`,
        activeLearners: sql<number>`(
          SELECT count(*)::int FROM course_enrollments ce
          WHERE ce.course_id = ${courses.id} AND ce.status = 'active'
        )`,
        rating: sql<number | null>`(
          SELECT round(avg(cr.rating), 1)::float8 FROM course_reviews cr
          WHERE cr.course_id = ${courses.id} AND cr.is_public = true
        )`,
        reviewCount: sql<number>`(
          SELECT count(*)::int FROM course_reviews cr
          WHERE cr.course_id = ${courses.id} AND cr.is_public = true
        )`,
      })
      .from(courses)
      .where(catalogWhere)
      .orderBy(asc(courses.name)),

    db
      .selectDistinct({ board: courses.board })
      .from(courses)
      .where(eq(courses.status, 'published')),
  ]);

  const courseIds = catalog.map((c) => c.id);

  const [educatorRows, enrollmentRows, planRows] = await Promise.all([
    courseIds.length
      ? db
          .select({ courseId: courseEducators.courseId, educatorName: users.name })
          .from(courseEducators)
          .innerJoin(users, eq(courseEducators.educatorId, users.id))
          .where(inArray(courseEducators.courseId, courseIds))
          .orderBy(asc(users.name))
      : [],

    // Only a child of this parent can make a course show as enrolled.
    courseIds.length
      ? db
          .select({
            courseId: courseEnrollments.courseId,
            learnerId: courseEnrollments.learnerId,
          })
          .from(courseEnrollments)
          .where(
            and(
              inArray(courseEnrollments.courseId, courseIds),
              inArray(courseEnrollments.learnerId, learnerIds),
              eq(courseEnrollments.status, 'active'),
            ),
          )
      : [],

    courseIds.length
      ? db
          .select({
            courseId: paymentPlans.courseId,
            type: paymentPlans.type,
            creditPackSize: paymentPlans.creditPackSize,
          })
          .from(paymentPlans)
          .where(inArray(paymentPlans.courseId, courseIds))
      : [],
  ]);

  const educatorsByCourse = new Map<string, string[]>();
  for (const row of educatorRows) {
    educatorsByCourse.set(row.courseId, [...(educatorsByCourse.get(row.courseId) ?? []), row.educatorName]);
  }

  const enrolledByCourse = new Map<string, string[]>();
  for (const row of enrollmentRows) {
    const key = `${row.courseId}:${row.learnerId}`;
    if (!enrolledByCourse.has(key)) enrolledByCourse.set(key, [childName(row.learnerId)]);
  }

  const enrolledCourseIds = new Set(enrollmentRows.map((row) => row.courseId));

  const plansByCourse = new Map<string, string[]>();
  for (const plan of planRows) {
    plansByCourse.set(plan.courseId, [
      ...(plansByCourse.get(plan.courseId) ?? []),
      PLAN_LABELS[plan.type] ?? plan.type,
    ]);
  }

  const boardOptions = boards
    .map((b) => b.board)
    .filter((b): b is string => !!b)
    .sort();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Course Store</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {catalog.length} published {catalog.length === 1 ? 'course' : 'courses'}
            {q || board ? ' matching your filters' : ' available'}.
          </p>
        </div>

        <ParentStoreFilter
          initialQ={q ?? ''}
          initialBoard={board ?? ''}
          boardOptions={boardOptions}
        />
      </div>

      {/* Course Grid */}
      {catalog.length === 0 ? (
        <div className="bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg py-16 px-4 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            No courses to show
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            {q || board
              ? 'No published course matches that search. Try a different term.'
              : 'No course has been published to the store yet. Check back soon or book a consultation.'}
          </p>
          {q || board ? (
            <Link
              href="/parent/store"
              className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/consultation"
              className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Book a consultation
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalog.map((course) => {
            const educators = educatorsByCourse.get(course.id) ?? [];
            const enrolled = [...enrolledByCourse.entries()]
              .filter(([key]) => key.startsWith(`${course.id}:`))
              .flatMap(([, names]) => names);
            const planLabels = plansByCourse.get(course.id) ?? [];
            const price =
              course.price !== null && course.currency !== null
                ? formatMoney(Number(course.price), course.currency)
                : 'Price not set';

            return (
              <div
                key={course.id}
                className="group bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-all"
              >
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded">
                      {TYPE_LABELS[course.type] ?? course.type}
                    </span>
                    {course.board && (
                      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm text-white rounded">
                        {course.board}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {course.name}
                    </h3>
                    {course.rating !== null && (
                      <div className="flex items-center gap-1 text-[13px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        {course.rating}
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          ({course.reviewCount})
                        </span>
                      </div>
                    )}
                  </div>

                  {course.description ? (
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  ) : (
                    <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-4">
                      No description has been added yet.
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[12px] text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
                    {course.sessionCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {course.sessionCount} {course.sessionCount === 1 ? 'session' : 'sessions'}
                        {course.defaultSessionDurationMin ? ` · ${course.defaultSessionDurationMin}m` : ''}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {course.activeLearners} active{' '}
                      {course.activeLearners === 1 ? 'learner' : 'learners'}
                    </div>
                    {educators.length > 0 && (
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                        <span className="truncate">{educators.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">
                    {planLabels.length > 0
                      ? `Payment plans: ${planLabels.join(' · ')}`
                      : 'No payment plan configured for this course'}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                        Price
                      </span>
                      <span
                        className={
                          course.price === null
                            ? 'text-base font-medium text-gray-400 dark:text-gray-500'
                            : 'text-lg font-bold text-gray-900 dark:text-gray-100'
                        }
                      >
                        {price}
                      </span>
                    </div>
                    {enrolledCourseIds.has(course.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-md">
                        <span
                          className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 text-[9px] font-bold flex items-center justify-center"
                          title={enrolled.join(', ')}
                        >
                          {initialsOf(enrolled[0] ?? null) || '—'}
                        </span>
                        Enrolled
                      </span>
                    ) : (
                      <Link
                        href="/consultation"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Enquire
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
