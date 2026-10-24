import React from 'react';

export default function AdminLoading() {
  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-72 bg-gray-100 dark:bg-neutral-800/60 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-9 w-32 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-neutral-800" />
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-neutral-700 rounded-md" />
            <div className="h-3 w-32 bg-gray-100 dark:bg-neutral-800/50 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-4">
          <div className="h-5 w-40 bg-gray-200 dark:bg-neutral-800 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-neutral-800/40">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-gray-200 dark:bg-neutral-800 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-800/50 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-100 dark:bg-neutral-800 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 space-y-4">
          <div className="h-5 w-32 bg-gray-200 dark:bg-neutral-800 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
