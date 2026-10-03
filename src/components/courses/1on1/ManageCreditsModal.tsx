'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, User } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ManageCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  learnerId?: string;
  onSuccess?: () => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ManageCreditsModal({
  isOpen,
  onClose,
  courseId,
  learnerId: initialLearnerId,
  onSuccess,
}: ManageCreditsModalProps) {
  const [tab, setTab] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Learner selection
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  const [availableLearners, setAvailableLearners] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [loadingLearners, setLoadingLearners] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Check if initialLearnerId is a valid UUID
    const isValidUUID = initialLearnerId && UUID_REGEX.test(initialLearnerId);
    if (isValidUUID) {
      setSelectedLearnerId(initialLearnerId);
    } else {
      setSelectedLearnerId('');
    }

    // Always fetch available learners in case admin needs to select or change learner
    async function loadLearners() {
      try {
        setLoadingLearners(true);
        const res = await fetch('/api/v1/learners?perPage=100');
        if (res.ok) {
          const json = await res.json();
          const list = json.data || [];
          setAvailableLearners(list);
          if (!isValidUUID && list.length > 0) {
            setSelectedLearnerId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load learners:', err);
      } finally {
        setLoadingLearners(false);
      }
    }

    loadLearners();
  }, [isOpen, initialLearnerId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid positive number of credits.');
      return;
    }

    const effectiveLearnerId = selectedLearnerId || initialLearnerId;
    if (!effectiveLearnerId || !UUID_REGEX.test(effectiveLearnerId)) {
      setErrorMsg('Please select a valid learner to adjust credits.');
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
          learnerId: effectiveLearnerId,
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
        let displayError = json.error || 'Failed to update credits.';
        if (typeof displayError === 'string' && displayError.startsWith('[')) {
          try {
            const parsed = JSON.parse(displayError);
            if (Array.isArray(parsed) && parsed[0]?.message) {
              displayError = parsed[0].message;
            }
          } catch {
            // keep string
          }
        }
        setErrorMsg(displayError);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while updating credits.');
    } finally {
      setLoading(false);
    }
  };

  const showLearnerDropdown = !initialLearnerId || !UUID_REGEX.test(initialLearnerId) || availableLearners.length > 1;

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
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
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

          {/* Learner Selector */}
          {showLearnerDropdown && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Select Learner</span>
              </label>
              {loadingLearners ? (
                <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading learners...</span>
                </div>
              ) : availableLearners.length === 0 ? (
                <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs">
                  No learners found. Please create or invite a learner first.
                </div>
              ) : (
                <CustomSelect
                  value={selectedLearnerId}
                  onChange={(v) => setSelectedLearnerId(v)}
                  placeholder="Select a learner"
                  options={availableLearners.map((l) => ({
                    value: l.id,
                    label: `${l.name}${l.email ? ` (${l.email})` : ''}`,
                  }))}
                />
              )}
            </div>
          )}

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
              placeholder="e.g. 10"
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
            <div className="text-right text-[10px] text-gray-400">
              {notes.length}/100
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || parseFloat(amount) <= 0 || (showLearnerDropdown && !selectedLearnerId)}
            className="px-6 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : tab === 'add' ? (
              'Add Credits'
            ) : (
              'Deduct Credits'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
