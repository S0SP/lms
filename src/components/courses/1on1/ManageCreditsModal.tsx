'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ManageCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  learnerId: string;
  onSuccess?: () => void;
}

export function ManageCreditsModal({
  isOpen,
  onClose,
  courseId,
  learnerId,
  onSuccess,
}: ManageCreditsModalProps) {
  const [tab, setTab] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid positive number of credits.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const delta = tab === 'add' ? num : -num;

      const res = await fetch('/api/v1/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          learnerId,
          delta,
          reason: notes.trim() || (tab === 'add' ? 'Credits Added' : 'Credits Deducted'),
        }),
      });

      if (res.ok) {
        setAmount('');
        setNotes('');
        onSuccess?.();
        onClose();
      } else {
        const json = await res.json();
        setErrorMsg(json.error || 'Failed to update credits.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while updating credits.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Manage Credits
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Subtabs: Add | Deduct */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => {
                setTab('add');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'add'
                  ? 'bg-white dark:bg-[#161B26] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Add
            </button>
            <button
              onClick={() => {
                setTab('deduct');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'deduct'
                  ? 'bg-white dark:bg-[#161B26] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Deduct
            </button>
          </div>

          {/* Credit input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {tab === 'add' ? 'Credits to add' : 'Credits to deduct'}
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          {/* Notes input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Add notes
            </label>
            <textarea
              maxLength={100}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your note here"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition resize-none shadow-2xs"
            />
            <div className="flex justify-end">
              <span className="text-[11px] text-gray-400 font-medium">
                {notes.length}/100
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !amount}
              className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{tab === 'add' ? 'Add Credits' : 'Deduct Credits'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
