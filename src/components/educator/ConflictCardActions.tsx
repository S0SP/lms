'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, Clock, Loader2, X, AlertTriangle } from 'lucide-react';

interface ConflictCardActionsProps {
  conflictId: string;
  sessionId: string;
  sessionTitle: string;
  sessionScheduledAt: string;
  otherSessionId?: string | null;
}

export function ConflictCardActions({
  conflictId,
  sessionId,
  sessionTitle,
  sessionScheduledAt,
  otherSessionId,
}: ConflictCardActionsProps) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customDateTime, setCustomDateTime] = useState('');
  const router = useRouter();

  const handleDismiss = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/sessions/${sessionId}/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          conflictId,
        }),
      });
      if (res.ok) {
        setResolved(true);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to dismiss conflict:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (shiftMinutes?: number, customTime?: string) => {
    try {
      setLoading(true);
      const payload: any = {
        action: 'reschedule',
        conflictId,
      };

      if (customTime) {
        payload.newScheduledAt = new Date(customTime).toISOString();
      } else if (shiftMinutes) {
        payload.shiftMinutes = shiftMinutes;
      }

      const res = await fetch(`/api/v1/sessions/${sessionId}/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setResolved(true);
        setIsModalOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to reschedule session:', err);
    } finally {
      setLoading(false);
    }
  };

  if (resolved) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Resolved</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-36 shrink-0 mt-4 lg:mt-0 lg:pl-6 lg:border-l border-[#E5E9F0] dark:border-gray-800">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={loading}
          className="flex-1 lg:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[12px] shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Reschedule</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          disabled={loading}
          className="flex-1 lg:flex-none px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Dismiss</span>}
        </button>

        <Link
          href={`/educator/sessions/${sessionId}`}
          className="flex-1 lg:flex-none px-3 py-1.5 text-[#2F80F9] dark:text-blue-400 font-semibold text-[11px] hover:underline text-center"
        >
          View session →
        </Link>
      </div>

      {/* Quick Reschedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Reschedule Session
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Current Time:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {new Date(sessionScheduledAt).toLocaleString()}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Quick Shift Options
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleReschedule(30)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold transition-all text-center"
                >
                  +30 min
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleReschedule(60)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold transition-all text-center"
                >
                  +1 hour
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleReschedule(1440)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold transition-all text-center"
                >
                  +24 hours
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label
                htmlFor="customDateTime"
                className="text-xs font-bold text-gray-700 dark:text-gray-300 block"
              >
                Or Pick Exact Date &amp; Time
              </label>
              <input
                id="customDateTime"
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !customDateTime}
                onClick={() => handleReschedule(undefined, customDateTime)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
