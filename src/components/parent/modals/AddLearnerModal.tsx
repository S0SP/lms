'use client';

import React, { useState } from 'react';
import { X, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddLearnerModal({ isOpen, onClose, onSuccess }: AddLearnerModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLinkLearner = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter a valid invite code or student email');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/v1/user/parent-linking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to link learner account');
      }

      setSuccessMessage(json.data?.message || 'Learner successfully linked!');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setInviteCode('');
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error linking account. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E2535] rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-gray-500" />
            Link a Learner
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enter the unique invite code or student email provided by the administrator to link your child&apos;s account to your profile.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Invite Code or Student Email
              </label>
              <input 
                type="text" 
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. LRN-8472-9X or student@email.com" 
                disabled={loading}
                className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/50 rounded-md">
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                If you haven&apos;t received an invite code, you can also use your scholar&apos;s registered email or student PIN.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleLinkLearner}
            disabled={loading || !inviteCode.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Linking...' : 'Link Learner'}
          </button>
        </div>

      </div>
    </div>
  );
}
