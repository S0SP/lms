'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit2, Plus, Loader2, Check } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface EducatorItem {
  id: string;
  name: string;
  email: string;
  payoutRateOverride?: string | null;
}

interface AddEducatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  assignedEducators: EducatorItem[];
  onUpdated: () => void;
}

export function AddEducatorModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  assignedEducators,
  onUpdated,
}: AddEducatorModalProps) {
  const [allEducators, setAllEducators] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isAdding, setIsAdding] = useState(assignedEducators.length === 0);
  const [selectedEducatorId, setSelectedEducatorId] = useState('');
  const [payoutRate, setPayoutRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsAdding(assignedEducators.length === 0);
    async function fetchEducators() {
      try {
        setLoadingList(true);
        setErrorMsg(null);
        const res = await fetch('/api/v1/educators?perPage=100');
        if (res.ok) {
          const json = await res.json();
          const list = json.data || [];
          setAllEducators(list);
          const firstUnassigned = list.find((e: any) => !assignedEducators.some((ae) => ae.id === e.id));
          if (firstUnassigned) {
            setSelectedEducatorId(firstUnassigned.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch educators:', err);
      } finally {
        setLoadingList(false);
      }
    }
    fetchEducators();
  }, [isOpen, assignedEducators]);

  if (!isOpen) return null;

  // Filter unassigned educators for adding
  const unassigned = allEducators.filter(
    (e) => !assignedEducators.some((ae) => ae.id === e.id)
  );

  const handleStartAdding = () => {
    setErrorMsg(null);
    setIsAdding(true);
    if (!selectedEducatorId && unassigned.length > 0) {
      setSelectedEducatorId(unassigned[0].id);
    }
  };

  const handleAssign = async () => {
    if (!selectedEducatorId) {
      setErrorMsg('Please select an educator to assign.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/courses/${courseId}/educators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educatorId: selectedEducatorId,
          payoutRateOverride: payoutRate ? parseFloat(payoutRate) : null,
        }),
      });
      if (res.ok) {
        setSelectedEducatorId('');
        setPayoutRate('');
        setIsAdding(false);
        onUpdated();
      } else {
        const json = await res.json();
        setErrorMsg(json.error || 'Failed to assign educator');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error assigning educator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (eduId: string) => {
    if (!confirm('Are you sure you want to unassign this educator from the course?')) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/courses/${courseId}/educators?educatorId=${eduId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onUpdated();
      } else {
        const json = await res.json();
        setErrorMsg(json.error || 'Failed to remove educator');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error removing educator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayout = async (eduId: string) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/courses/${courseId}/educators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educatorId: eduId,
          payoutRateOverride: payoutRate ? parseFloat(payoutRate) : null,
        }),
      });
      if (res.ok) {
        setEditingEduId(null);
        setPayoutRate('');
        onUpdated();
      } else {
        const json = await res.json();
        setErrorMsg(json.error || 'Failed to update payout');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating payout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Add Educator
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {assignedEducators.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              No educators currently assigned to this course.
            </div>
          ) : (
            assignedEducators.map((edu) => (
              <div
                key={edu.id}
                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131722] flex items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {edu.name ? edu.name[0].toUpperCase() : 'E'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {edu.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {edu.email}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      Payout: {edu.payoutRateOverride ? `₹${edu.payoutRateOverride}/hr` : 'Default rate'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    title="Remove Educator"
                    onClick={() => handleRemove(edu.id)}
                    disabled={submitting}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit Payout"
                    onClick={() => {
                      setEditingEduId(editingEduId === edu.id ? null : edu.id);
                      setPayoutRate(edu.payoutRateOverride || '');
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Edit Payout Inline Box */}
          {editingEduId && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Update Educator Payout Rate (₹/hr)
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={payoutRate}
                  onChange={(e) => setPayoutRate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                />
                <button
                  onClick={() => handleUpdatePayout(editingEduId)}
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}

          {/* Add Another Form */}
          {isAdding && (
            <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Select Educator
                </label>
                {loadingList ? (
                  <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading educators...</span>
                  </div>
                ) : unassigned.length === 0 ? (
                  <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs">
                    All educators are already assigned or none exist.
                  </div>
                ) : (
                  <CustomSelect
                    value={selectedEducatorId}
                    onChange={(v) => setSelectedEducatorId(v)}
                    placeholder="-- Select an Educator --"
                    options={unassigned.map((e) => ({
                      value: e.id,
                      label: `${e.name} (${e.email})`,
                    }))}
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Hourly Payout Rate (₹) (Optional)
                </label>
                <input
                  type="number"
                  placeholder="Leave empty for educator default"
                  value={payoutRate}
                  onChange={(e) => setPayoutRate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!selectedEducatorId || submitting || unassigned.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{submitting ? 'Assigning...' : 'Assign Educator'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleStartAdding}
            disabled={isAdding}
            className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
          >
            + Add Another
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
