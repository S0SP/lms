import React from 'react';

export default function StudentLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Welcome Banner Skeleton */}
      <div className="p-6 md:p-8 rounded-3xl bg-linear-to-r from-blue-600/20 via-indigo-600/15 to-purple-600/10 border border-blue-500/20 space-y-3">
        <div className="h-8 w-64 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-96 bg-gray-200/60 dark:bg-neutral-800/60 rounded" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-3"
          >
            <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 rounded" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-neutral-700 rounded-md" />
          </div>
        ))}
      </div>

      {/* Sessions and Progress Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-4">
          <div className="h-6 w-44 bg-gray-200 dark:bg-neutral-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="p-4 rounded-xl border border-gray-100 dark:border-neutral-800/50 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-800/60 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-4">
          <div className="h-6 w-36 bg-gray-200 dark:bg-neutral-800 rounded" />
          <div className="space-y-3">
            {[1, 2].map((card) => (
              <div key={card} className="h-28 rounded-xl bg-gray-100 dark:bg-neutral-800/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
