'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export function ParentStoreFilter({
  initialQ,
  initialBoard,
  boardOptions,
}: {
  initialQ: string;
  initialBoard: string;
  boardOptions: string[];
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQ);
  const [board, setBoard] = React.useState(initialBoard || 'all');

  const handleApply = (newBoard?: string) => {
    const b = newBoard !== undefined ? newBoard : board;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (b && b !== 'all') params.set('board', b);
    router.push(`/parent/store${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
      <div className="relative flex-1 md:w-56 w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApply();
          }}
          placeholder="Search courses..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow text-gray-900 dark:text-gray-100"
        />
      </div>

      <div className="w-full sm:w-44">
        <CustomSelect
          value={board}
          onChange={(val) => {
            setBoard(val);
            handleApply(val);
          }}
          options={[
            { value: 'all', label: 'All boards' },
            ...boardOptions.map((b) => ({ value: b, label: b })),
          ]}
          size="sm"
        />
      </div>

      <button
        type="button"
        onClick={() => handleApply()}
        className="px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
      >
        Apply
      </button>
    </div>
  );
}

export function AdminStoreFilter({
  initialQ,
  initialStatus,
  statusOptions,
}: {
  initialQ: string;
  initialStatus: string;
  statusOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQ);
  const [status, setStatus] = React.useState(initialStatus || 'all');

  const handleApply = (newStatus?: string) => {
    const s = newStatus !== undefined ? newStatus : status;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (s && s !== 'all') params.set('status', s);
    router.push(`/admin/store${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      <div className="relative w-full sm:w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApply();
          }}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-[#161B26] transition-all"
          placeholder="Search courses..."
          type="search"
        />
      </div>

      <div className="w-full sm:w-44">
        <CustomSelect
          value={status}
          onChange={(val) => {
            setStatus(val);
            handleApply(val);
          }}
          options={[
            { value: 'all', label: 'All statuses' },
            ...statusOptions,
          ]}
          size="sm"
        />
      </div>

      <button
        type="button"
        onClick={() => handleApply()}
        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
      >
        Apply
      </button>
    </div>
  );
}
