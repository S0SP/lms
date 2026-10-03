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
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEducatorId, setSelectedEducatorId] = useState('');
  const [payoutRate, setPayoutRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchEducators() {
      try {
        setLoadingList(true);
        const res = await fetch('/api/v1/educators');
        if (res.ok) {
          const json = await res.json();
          setAllEducators(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch educators:', err);
      } finally {
        setLoadingList(false);
      }
    }
    fetchEducators();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!selectedEducatorId) return;
    try {
      setSubmitting(true);
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
      }
    } catch (err) {
      console.error('Error assigning educator:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (eduId: string) => {
    if (!confirm('Are you sure you want to unassign this educator from the course?')) return;
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/educators?educatorId=${eduId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onUpdated();
      }
    } catch (err) {
      console.error('Error removing educator:', err);
    }
  };

  const handleUpdatePayout = async (eduId: string) => {
    try {
      setSubmitting(true);
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
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filter unassigned educators for adding
  const unassigned = allEducators.filter(
    (e) => !assignedEducators.some((ae) => ae.id === e.id)
  );

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
          {assignedEducators.map((edu) => (
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
                    Payout: {edu.payoutRateOverride ? `₹${edu.payoutRateOverride}/hr` : 'No payout set'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Availability: Online working hours
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Remove Educator"
                  onClick={() => handleRemove(edu.id)}
                  className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
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
          ))}

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
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
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
                <CustomSelect
                  value={selectedEducatorId}
                  onChange={(v) => setSelectedEducatorId(v)}
                  placeholder="Choose educator..."
                  options={unassigned.map((e) => ({
                    value: e.id,
                    label: e.name || e.email,
                    subLabel: e.email,
                  }))}
                />
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
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedEducatorId || submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Educator'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            Add Another
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
