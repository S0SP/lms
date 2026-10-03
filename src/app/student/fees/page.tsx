import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { courses, courseEnrollments, credits, paymentTransactions } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import {
  Bell,
  CircleCheckBig,
  CreditCard,
  FileText,
  History,
  RotateCcw,
  TriangleAlert,
  Wallet,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type PaymentStatus = (typeof paymentTransactions.$inferSelect)['status'];

const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
        <CircleCheckBig className="w-3 h-3" />
        Paid
      </span>
    );
  }
  if (status === 'refunded') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">
        <RotateCcw className="w-3 h-3" />
        Refunded
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <TriangleAlert className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <History className="w-3 h-3" />
      Pending
    </span>
  );
}

function EmptyTransactions() {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
      <FileText className="w-9 h-9 text-gray-300 dark:text-gray-700 mb-3" />
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No payment records</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
        Payments recorded against your course enrolments will be listed here.
      </p>
    </div>
  );
}

export default async function StudentFees() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const learnerId = session.user.id as string;

  const [creditRows, transactions] = await Promise.all([
    db
      .select({
        courseId: credits.courseId,
        courseName: courses.name,
        total: credits.total,
        consumed: credits.consumed,
      })
      .from(credits)
      .leftJoin(courses, eq(credits.courseId, courses.id))
      .where(eq(credits.learnerId, learnerId))
      .orderBy(courses.name),

    // Transactions carry no learner id of their own — they hang off an
    // enrolment, so ownership is resolved through course_enrollments.
    db
      .select({
        id: paymentTransactions.id,
        provider: paymentTransactions.provider,
        amount: paymentTransactions.amount,
        currency: paymentTransactions.currency,
        status: paymentTransactions.status,
        createdAt: paymentTransactions.createdAt,
        courseName: courses.name,
      })
      .from(paymentTransactions)
      .innerJoin(courseEnrollments, eq(paymentTransactions.enrollmentId, courseEnrollments.id))
      .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.learnerId, learnerId))
      .orderBy(desc(paymentTransactions.createdAt)),
  ]);

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
  const coursesWithCredits = creditBalances.length;

  const paidTotals = new Map<string, number>();
  const pendingTotals = new Map<string, number>();
  let paidCount = 0;
  let pendingCount = 0;

  for (const t of transactions) {
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Credits Remaining */}
        <div className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Credits Remaining
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 rounded-md text-blue-600 dark:text-blue-400">
                <CreditCard className="w-[18px] h-[18px]" />
              </div>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {coursesWithCredits > 0 ? formatCredits(creditsRemaining) : '—'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {coursesWithCredits > 0
                ? `Across ${coursesWithCredits} enrolled ${coursesWithCredits === 1 ? 'course' : 'courses'}`
                : 'No credits allocated to your account yet'}
            </p>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Paid
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-green-50 dark:bg-green-500/10 rounded-md text-green-600 dark:text-green-400">
                <Wallet className="w-[18px] h-[18px]" />
              </div>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {paidCount > 0 ? formatTotals(paidTotals) : '—'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {paidCount > 0
                ? `Across ${paidCount} settled ${paidCount === 1 ? 'payment' : 'payments'}`
                : 'No settled payments recorded'}
            </p>
          </div>
        </div>

        {/* Card 3: Outstanding Payments */}
        <div className="bg-[#FFF8F3] dark:bg-orange-950/20 rounded-xl border border-[#FDECE2] dark:border-orange-900/30 p-4 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[11px] font-bold text-[#C27838] dark:text-orange-400 uppercase tracking-wider">
                Outstanding Payments
              </h3>
              <div className="w-8 h-8 flex items-center justify-center bg-[#F2DEC9] dark:bg-orange-900/50 rounded-md text-[#9C5D19] dark:text-orange-300">
                <Bell className="w-[18px] h-[18px]" />
              </div>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {hasPending ? formatTotals(pendingTotals) : '—'}
              </span>
            </div>
            <div className="mt-1.5">
              {hasPending ? (
                <span className="text-[12px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <TriangleAlert className="w-[14px] h-[14px]" />
                  {pendingCount} {pendingCount === 1 ? 'payment' : 'payments'} awaiting settlement
                </span>
              ) : (
                <span className="text-[12px] text-gray-500 dark:text-gray-400">
                  {paidCount > 0
                    ? 'Every recorded payment is settled'
                    : 'No payment schedule is configured for your enrolments'}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[12px] text-[#C27838] dark:text-orange-300">
              {hasPending
                ? 'Contact your coordinator to settle these payments.'
                : 'No action needed.'}
            </p>
          </div>
        </div>
      </div>

      {/* Credit Balance By Course */}
      <div className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161B26]/50">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Credit Balances</h3>
        </div>
        {creditBalances.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
            <CreditCard className="w-9 h-9 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No credit records</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Credits are allocated to you by an admin when you are enrolled in a course.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {creditBalances.map((c) => (
              <div key={c.courseId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {c.courseName ?? 'Course'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs shrink-0">
                    {formatCredits(c.remaining)} / {formatCredits(c.total)} left
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.remaining <= 2 ? 'bg-rose-500' : 'bg-emerald-500'
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

      {/* Transaction History Table Card */}
      <div className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#161B26]/50">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            Transaction History
          </h3>
          <span className="text-[12px] text-gray-500 dark:text-gray-400">
            {transactions.length} {transactions.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <EmptyTransactions />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-white dark:bg-[#1E2535] border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-900 dark:text-gray-100 divide-y divide-gray-100 dark:divide-gray-800/50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-[13px]">
                      {fmtDate(t.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[13px] text-gray-700 dark:text-gray-300">
                      {t.courseName ?? 'Course enrolment'}
                      <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                        {t.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300">
                      {formatMoney(Number(t.amount), t.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
