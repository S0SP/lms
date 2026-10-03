'use client';

import React, { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, Upload, MoreHorizontal, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LearnerSummary } from '@/lib/api-client';

interface LearnersTableProps {
  learners: LearnerSummary[];
  total: number;
  page: number;
  perPage: number;
  q: string;
}

export function LearnersTable({ learners, total, page, perPage, q: initialQ }: LearnersTableProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / perPage);

  const navigate = useCallback(
    (params: Record<string, string | number | undefined>) => {
      const sp = new URLSearchParams();
      if (params.q) sp.set('q', String(params.q));
      if (params.page && Number(params.page) > 1) sp.set('page', String(params.page));
      startTransition(() => {
        router.push(`/admin/users/learners?${sp.toString()}`);
      });
    },
    [router],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      navigate({ q, page: 1 });
    },
    [q, navigate],
  );

  const avatar = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Learners</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {total.toLocaleString()} total learner{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold text-sm">
            Export CSV
          </button>
          <Link
            href="/admin/users/learners/add"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Learner
          </Link>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Learner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade / Board</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className={isPending ? 'opacity-50' : ''}>
              {learners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400 dark:text-gray-600">
                    {q ? `No learners found for "${q}"` : 'No learners yet. Add one to get started.'}
                  </td>
                </tr>
              ) : (
                learners.map((learner) => (
                  <tr
                    key={learner.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {learner.avatarUrl ? (
                          <img src={learner.avatarUrl} alt={learner.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {avatar(learner.name)}
                          </div>
                        )}
                        <div>
                          <Link href={`/admin/users/learners/${learner.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {learner.name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      <div>{learner.email}</div>
                      {learner.phone && <div className="text-xs text-gray-400">{learner.phone}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {learner.grade && learner.board
                        ? `${learner.grade} · ${learner.board}`
                        : learner.grade ?? learner.board ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      {learner.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {new Date(learner.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/learners/${learner.id}`} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 block">
                        <MoreHorizontal className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || isPending}
                onClick={() => navigate({ q, page: page - 1 })}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-600 dark:text-gray-400 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages || isPending}
                onClick={() => navigate({ q, page: page + 1 })}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
