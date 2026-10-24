import React from 'react';

export default function AdminCalendarLoading() {
  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 animate-pulse">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-neutral-800/60 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-9 w-28 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="h-6 w-32 bg-gray-200 dark:bg-neutral-800 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-100 dark:bg-neutral-800 rounded-lg" />
            <div className="h-8 w-20 bg-gray-100 dark:bg-neutral-800 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="h-6 bg-gray-100 dark:bg-neutral-800/50 rounded text-center text-xs text-transparent" />
          ))}
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="min-h-24 p-2 rounded-xl border border-gray-100 dark:border-neutral-800/40 bg-gray-50/50 dark:bg-neutral-800/20 space-y-2"
            >
              <div className="h-4 w-5 bg-gray-200 dark:bg-neutral-700 rounded" />
              {i % 3 === 0 && (
                <div className="h-5 w-full bg-blue-100 dark:bg-blue-900/30 rounded-md" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
