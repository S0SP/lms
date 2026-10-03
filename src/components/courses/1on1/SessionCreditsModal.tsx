'use client';

import React from 'react';
import { X, BookOpen, Clock, Calendar } from 'lucide-react';

interface CreditLedgerItem {
  id: string;
  delta: string;
  balanceAfter: string;
  note: string | null;
  source: string;
  createdAt: string;
}

interface SessionCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenManage: () => void;
  remainingCredits: number;
  consumedCredits: number;
  totalCredits: number;
  courseName: string;
  history: CreditLedgerItem[];
}

export function SessionCreditsModal({
  isOpen,
  onClose,
  onOpenManage,
  remainingCredits,
  consumedCredits,
  totalCredits,
  courseName,
  history,
}: SessionCreditsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Session Credits
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenManage();
              }}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Manage
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Card */}
        <div className="p-6 pb-2 shrink-0">
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4 text-center">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Remaining</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {remainingCredits}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Consumed</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {consumedCredits}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {totalCredits}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable History List */}
        <div className="p-6 pt-3 overflow-y-auto space-y-3 flex-1">
          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No credit transactions recorded yet.
            </div>
          ) : (
            history.map((item) => {
              const deltaNum = parseFloat(item.delta);
              const isNegative = deltaNum < 0;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131722] hover:border-gray-300 dark:hover:border-gray-700 transition flex items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {item.note || (isNegative ? 'Credits Deducted' : 'Credits Added')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                      <BookOpen className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{courseName}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>
                        {new Date(item.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}{' '}
                        •{' '}
                        {new Date(item.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`text-base font-bold ${
                        isNegative ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {deltaNum > 0 ? `+${deltaNum}` : deltaNum}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
