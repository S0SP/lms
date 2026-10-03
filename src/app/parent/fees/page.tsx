import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {
  courseEnrollments,
  courses,
  credits,
  parentProfiles,
  paymentPlans,
  paymentTransactions,
  users,
} from '@/db/schema';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { Coins, CreditCard, FileText, Landmark, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PaymentStatus = (typeof paymentTransactions.$inferSelect)['status'];
type PlanType = (typeof paymentPlans.$inferSelect)['type'];

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Credits are stored as numeric(8,2), so drop the fraction when it is whole. */
function formatCredits(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function formatMoney(amount: number, currency: string) {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(safe);
  } catch {
    // Currency code stored on the row is not a valid ISO code.
    return `${currency} ${safe.toFixed(2)}`;
  }
}

/** Totals are tracked per currency so amounts are never added across currencies. */
function formatTotals(totals: Map<string, number>) {
  if (totals.size === 0) return '—';
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
}

const PLAN_LABELS: Record<PlanType, string> = {
  per_session: 'Per session',
  bundle: 'Bundle',
  subscription: 'Subscription',
  free: 'Free',
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Paid
      </span>
    );
  }
  if (status === 'refunded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Refunded
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Pending
    </span>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
      <Icon className="w-9 h-9 text-gray-300 dark:text-gray-700 mb-3" />
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{body}</p>
    </div>
  );
}

function NoChildLinked({ note }: { note: string }) {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 p-10 flex flex-col items-center justify-center text-center">
        <User className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">No child linked</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
          Your account is not linked to a learner profile yet, so there is nothing to show. {note}
        </p>
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function ParentFees({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const parentUserId = session.user.id as string;

  // Authorisation: a parent may only ever see rows belonging to a learner they are
  // linked to. This is the same link reportRepository.isLinkedParent() checks —
  // parent_profiles.user_id is the logged-in parent and .learner_id the child.
  const links = await db
    .select({ learnerId: parentProfiles.learnerId, learnerName: users.name })
    .from(parentProfiles)
    .innerJoin(users, eq(parentProfiles.learnerId, users.id))
    .where(eq(parentProfiles.userId, parentUserId));

  const learnerIds = links.map((l) => l.learnerId);
  if (learnerIds.length === 0) {
    return <NoChildLinked note="Please contact the admin to have a learner linked to you." />;
  }

  const [creditRows, enrollments, allTransactions] = await Promise.all([
    db
      .select({
        id: credits.id,
        learnerId: credits.learnerId,
        learnerName: users.name,
        courseId: credits.courseId,
        courseName: courses.name,
        total: credits.total,
        consumed: credits.consumed,
      })
      .from(credits)
      .leftJoin(courses, eq(credits.courseId, courses.id))
      .leftJoin(users, eq(credits.learnerId, users.id))
      .where(inArray(credits.learnerId, learnerIds))
      .orderBy(asc(users.name), asc(courses.name)),

    db
      .select({
        id: courseEnrollments.id,
        learnerId: courseEnrollments.learnerId,
        learnerName: users.name,
        courseId: courseEnrollments.courseId,
        courseName: courses.name,
        status: courseEnrollments.status,
      })
      .from(courseEnrollments)
      .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .leftJoin(users, eq(courseEnrollments.learnerId, users.id))
      .where(inArray(courseEnrollments.learnerId, learnerIds))
      .orderBy(asc(courses.name)),

    // Transactions carry no learner id of their own — they hang off an enrolment,
    // so ownership is resolved through course_enrollments.
    db
      .select({
        id: paymentTransactions.id,
        provider: paymentTransactions.provider,
        amount: paymentTransactions.amount,
        currency: paymentTransactions.currency,
        status: paymentTransactions.status,
        createdAt: paymentTransactions.createdAt,
        courseName: courses.name,
        learnerName: users.name,
      })
      .from(paymentTransactions)
      .innerJoin(courseEnrollments, eq(paymentTransactions.enrollmentId, courseEnrollments.id))
      .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .leftJoin(users, eq(courseEnrollments.learnerId, users.id))
      .where(inArray(courseEnrollments.learnerId, learnerIds))
      .orderBy(desc(paymentTransactions.createdAt)),
  ]);

  const enrolledCourseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const plans = enrolledCourseIds.length
    ? await db
        .select({
          courseId: paymentPlans.courseId,
          type: paymentPlans.type,
          price: paymentPlans.price,
          currency: paymentPlans.currency,
          creditPackSize: paymentPlans.creditPackSize,
        })
        .from(paymentPlans)
        .where(inArray(paymentPlans.courseId, enrolledCourseIds))
        .orderBy(desc(paymentPlans.isDefault), asc(paymentPlans.price))
    : [];

  // One plan per course: the default one, otherwise the first row of the ordered
  // list (default desc, cheapest first).
  const planByCourse = new Map<string, (typeof plans)[number]>();
  for (const plan of plans) {
    if (!planByCourse.has(plan.courseId)) planByCourse.set(plan.courseId, plan);
  }

  // Year tabs are derived from the transactions themselves rather than hardcoded.
  const { year: yearParam } = await searchParams;
  const availableYears = [...new Set(allTransactions.map((t) => t.createdAt.getFullYear()))].sort(
    (a, b) => b - a,
  );
  const requestedYear = Number(yearParam);
  const activeYear =
    yearParam && Number.isInteger(requestedYear) && availableYears.includes(requestedYear)
      ? requestedYear
      : null;
  const transactions = activeYear
    ? allTransactions.filter((t) => t.createdAt.getFullYear() === activeYear)
    : allTransactions;

  const creditBalances = creditRows.map((c) => {
    const total = Number(c.total);
    const consumed = Number(c.consumed);
    return {
      ...c,
      total,
      consumed,
      remaining: total - consumed,
      usedPct: total > 0 ? Math.min(100, (consumed / total) * 100) : 0,
    };
  });

  const creditsRemaining = creditBalances.reduce((sum, c) => sum + c.remaining, 0);
  const creditsConsumed = creditBalances.reduce((sum, c) => sum + c.consumed, 0);
  const creditByLearnerAndCourse = new Map(creditBalances.map((c) => [`${c.learnerId}:${c.courseId}`, c]));

  const paidTotals = new Map<string, number>();
  const pendingTotals = new Map<string, number>();
  let paidCount = 0;
  let pendingCount = 0;

  for (const t of allTransactions) {
    const amount = Number(t.amount);
    if (t.status === 'paid') {
      paidTotals.set(t.currency, (paidTotals.get(t.currency) ?? 0) + amount);
      paidCount += 1;
    } else if (t.status === 'created' || t.status === 'failed') {
      pendingTotals.set(t.currency, (pendingTotals.get(t.currency) ?? 0) + amount);
      pendingCount += 1;
    }
  }

  const hasPending = pendingTotals.size > 0;
  const providers = [...new Set(allTransactions.map((t) => t.provider))];

  const activePlans = enrollments
    .filter((e) => e.status === 'active' && planByCourse.has(e.courseId))
    .map((e) => ({
      ...e,
      plan: planByCourse.get(e.courseId)!,
      credit: creditByLearnerAndCourse.get(`${e.learnerId}:${e.courseId}`) ?? null,
    }));

  const childLabel =
    links.length === 1 ? (links[0].learnerName ?? 'your child') : `${links.length} children`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 p-4 min-h-[104px] flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Paid
          </span>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {paidCount > 0 ? formatTotals(paidTotals) : '—'}
            </span>
            <span className="text-[12px] text-gray-500 dark:text-gray-400">
              {paidCount > 0
                ? `Across ${paidCount} settled ${paidCount === 1 ? 'payment' : 'payments'} for ${childLabel}`
                : 'No settled payments recorded'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 p-4 min-h-[104px] flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Credits Remaining
          </span>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {creditBalances.length > 0 ? formatCredits(creditsRemaining) : '—'}
            </span>
            <span className="text-[12px] text-gray-500 dark:text-gray-400">
              {creditBalances.length > 0
                ? `${formatCredits(creditsConsumed)} consumed of ${formatCredits(
                    creditBalances.reduce((s, c) => s + c.total, 0),
                  )} allocated`
                : 'No credits allocated yet'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 p-4 min-h-[104px] flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Outstanding
          </span>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {hasPending ? formatTotals(pendingTotals) : '—'}
            </span>
            <span
              className={`text-[12px] ${
                hasPending
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {hasPending
                ? `${pendingCount} ${pendingCount === 1 ? 'payment' : 'payments'} awaiting settlement`
                : 'Nothing pending'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Active Plans & Payment Providers) */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
              Active Plans
            </h2>
            <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              {activePlans.length === 0 ? (
                <EmptyBlock
                  icon={Coins}
                  title="No active plans"
                  body="A plan appears here once a child is actively enrolled in a course that has a payment plan configured."
                />
              ) : (
                activePlans.map((p) => {
                  const used = p.credit?.consumed ?? null;
                  const total = p.credit?.total ?? null;
                  const pct =
                    used !== null && total !== null && total > 0
                      ? Math.min(100, (used / total) * 100)
                      : null;
                  const price =
                    p.plan.price !== null
                      ? formatMoney(Number(p.plan.price), p.plan.currency)
                      : 'Price not set';

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center p-4 border-b border-gray-100 dark:border-gray-800 gap-4 last:border-b-0"
                    >
                      <div className="w-full sm:w-1/3 shrink-0">
                        <h4 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                          {p.courseName ?? 'Course'}
                        </h4>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">
                          {p.learnerName ?? 'Child'} · {PLAN_LABELS[p.plan.type]}
                        </p>
                      </div>
                      <div className="w-full sm:w-1/3 flex flex-col gap-1.5 shrink-0">
                        {pct !== null ? (
                          <>
                            <div className="flex justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                              <span>
                                {formatCredits(used!)}/{formatCredits(total!)} credits used
                              </span>
                              <span>{Math.round(pct)}%</span>
                            </div>
                            <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            No credits allocated for this course yet
                          </span>
                        )}
                      </div>
                      <div className="w-full sm:w-auto flex-1 flex sm:flex-col sm:items-end justify-between items-center sm:justify-center">
                        <span className="text-[12px] text-gray-500 dark:text-gray-400 sm:mb-1">
                          {p.plan.creditPackSize ? `${p.plan.creditPackSize} credits per pack · ` : ''}
                          {price}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
              Payment Providers
            </h2>
            <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-4">
              {providers.length === 0 ? (
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  No payment provider has been recorded yet.
                </p>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {providers.map((provider) => (
                    <span
                      key={provider}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      {provider}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right shrink-0">
                Card details are held by the payment provider, not stored here.
              </p>
            </div>
          </section>
        </div>

        {/* Right Column (Transaction History) */}
        <div className="lg:col-span-1">
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center justify-between">
              Transaction History
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 normal-case">
                {transactions.length} {transactions.length === 1 ? 'record' : 'records'}
              </span>
            </h2>
            <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
              {availableYears.length > 1 && (
                <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-wrap">
                  <Link
                    href="/parent/fees"
                    className={`px-2 py-1 rounded text-[11px] font-medium ${
                      activeYear === null
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    All years
                  </Link>
                  {availableYears.map((year) => (
                    <Link
                      key={year}
                      href={`/parent/fees?year=${year}`}
                      className={`px-2 py-1 rounded text-[11px] font-medium ${
                        activeYear === year
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {year}
                    </Link>
                  ))}
                </div>
              )}
              {transactions.length === 0 ? (
                <EmptyBlock
                  icon={FileText}
                  title="No transactions"
                  body="Payments recorded against your childs course enrolments will be listed here."
                />
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[40%]">
                        Date
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[30%]">
                        Status
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-[30%]">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {transactions.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                            {fmtDate(t.createdAt)}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {t.courseName ?? 'Course'}
                            {t.learnerName ? ` · ${t.learnerName}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <PaymentStatusBadge status={t.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                            {formatMoney(Number(t.amount), t.currency)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Credit balances per child and course */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
          Credit Balances
        </h2>
        <div className="bg-white dark:bg-[#1E2535] rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
          {creditBalances.length === 0 ? (
            <EmptyBlock
              icon={CreditCard}
              title="No credit records"
              body="Credits are allocated by an admin once a child is enrolled in a course."
            />
          ) : (
            <div className="p-4 space-y-4">
              {creditBalances.map((c) => (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm gap-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {c.courseName ?? 'Course'}
                      <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                        {c.learnerName ?? 'Child'}
                      </span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs shrink-0">
                      {formatCredits(c.remaining)} / {formatCredits(c.total)} left
                    </span>
                  </div>
                  <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.remaining <= 2 ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${100 - c.usedPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {formatCredits(c.consumed)} of {formatCredits(c.total)} credits consumed
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
