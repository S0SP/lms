import React from 'react';

export default function AdminUsersLoading() {
  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-60 bg-gray-100 dark:bg-neutral-800/60 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-9 w-28 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-3 border-b border-gray-200/60 dark:border-neutral-800 pb-2">
        <div className="h-8 w-28 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-8 w-28 bg-gray-100 dark:bg-neutral-800/60 rounded-lg" />
        <div className="h-8 w-28 bg-gray-100 dark:bg-neutral-800/60 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-6 space-y-4">
        <div className="h-10 w-full max-w-sm bg-gray-100 dark:bg-neutral-800 rounded-xl" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-neutral-800/40">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-56 bg-gray-100 dark:bg-neutral-800/60 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-100 dark:bg-neutral-800 rounded-md" />
              <div className="h-6 w-24 bg-gray-100 dark:bg-neutral-800 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
