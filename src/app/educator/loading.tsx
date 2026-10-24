import React from 'react';

export default function EducatorLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="p-6 md:p-8 rounded-3xl bg-linear-to-r from-emerald-600/15 via-teal-600/10 to-blue-600/10 border border-emerald-500/20 space-y-3">
        <div className="h-8 w-60 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-80 bg-gray-200/60 dark:bg-neutral-800/60 rounded" />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-3"
          >
            <div className="h-4 w-28 bg-gray-200 dark:bg-neutral-800 rounded" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-neutral-700 rounded-md" />
          </div>
        ))}
      </div>

      {/* Sessions Table Skeleton */}
      <div className="p-6 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-neutral-800 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-16 rounded-xl bg-gray-100 dark:bg-neutral-800/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
