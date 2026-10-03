'use client';

import React, { useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

interface SessionFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  sessionTitle?: string;
  defaultCredits?: number;
  onSuccess?: () => void;
}

type SessionStatus = 'Completed' | 'No Show' | 'Other';
type SessionsConsumed = '1' | '0.5' | '0' | 'Custom';

export default function SessionFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle = 'Session Feedback',
  defaultCredits = 1,
  onSuccess,
}: SessionFeedbackModalProps) {
  const [status, setStatus] = useState<SessionStatus>('Completed');
  const [consumed, setConsumed] = useState<SessionsConsumed>('1');
  const [customCredits, setCustomCredits] = useState<string>('1.0');
  const [topicsCovered, setTopicsCovered] = useState('');
  const [comments, setComments] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    setSubmitting(true);
    setError(null);

    let creditsVal = 1;
    if (consumed === '0') creditsVal = 0;
    else if (consumed === '0.5') creditsVal = 0.5;
    else if (consumed === 'Custom') creditsVal = Math.max(0, parseFloat(customCredits) || 0);

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicsCovered,
          comments,
          homeworkAssigned,
          creditsConsumed: creditsVal,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to submit feedback');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#283043]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 transition-opacity duration-300">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-[500px] rounded-[12px] shadow-[0px_8px_24px_rgba(15,23,41,0.12)] border border-[#c1c6d6]/30 dark:border-gray-800 flex flex-col transform transition-transform duration-300 scale-100 opacity-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#c1c6d6]/50 dark:border-gray-800">
          <div>
            <h2 className="text-[18px] leading-[24px] tracking-[-0.01em] font-bold text-[#131b2d] dark:text-gray-100">
              {sessionTitle}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Submit topics covered and attendance status
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#414754] dark:text-gray-400 hover:text-[#2F80F9] dark:hover:text-blue-400 transition-colors flex items-center justify-center rounded-full p-1 hover:bg-[#eff5ff] dark:hover:bg-gray-800 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-220px)]">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Session Status */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] leading-[16px] tracking-[0.02em] font-semibold text-[#414754] dark:text-gray-400">
                Session Status
              </label>
              <div className="flex rounded-lg border border-[#c1c6d6] dark:border-gray-700 overflow-hidden bg-[#f2f3ff] dark:bg-[#080D16] p-1 gap-1">
                {(['Completed', 'No Show', 'Other'] as SessionStatus[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-[6px] text-center rounded-md transition-all ${
                      status === s
                        ? 'bg-[#2F80F9] text-white text-[12px] leading-[16px] tracking-[0.02em] font-semibold shadow-sm'
                        : 'text-[#414754] dark:text-gray-400 text-[14px] hover:bg-[#eff5ff] dark:hover:bg-gray-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sessions Consumed */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] leading-[16px] tracking-[0.02em] font-semibold text-[#414754] dark:text-gray-400">
                Credits to Deduct
              </label>
              <div className="flex flex-wrap gap-2">
                {(['1', '0.5', '0', 'Custom'] as SessionsConsumed[]).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setConsumed(c)}
                    className={`px-4 py-[6px] rounded-full transition-colors ${
                      consumed === c
                        ? 'border-2 border-[#2F80F9] bg-[#2F80F9]/10 text-[#2F80F9] text-[12px] leading-[16px] tracking-[0.02em] font-semibold shadow-sm dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'border border-[#c1c6d6] dark:border-gray-700 bg-white dark:bg-[#161B26] text-[#414754] dark:text-gray-400 text-[14px] hover:border-[#2F80F9]/50 hover:bg-[#eff5ff] dark:hover:bg-gray-800'
                    }`}
                  >
                    {c} {c !== 'Custom' && 'Credit'}
                  </button>
                ))}
              </div>
              {consumed === 'Custom' && (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  className="mt-2 w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#080D16] text-gray-900 dark:text-white"
                  placeholder="e.g. 1.5"
                />
              )}
            </div>

            {/* Topics Covered */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="topicsCovered"
                className="text-[12px] leading-[16px] tracking-[0.02em] font-semibold text-[#414754] dark:text-gray-400"
              >
                Topics Covered
              </label>
              <textarea
                id="topicsCovered"
                value={topicsCovered}
                onChange={(e) => setTopicsCovered(e.target.value)}
                className="w-full rounded-lg border border-[#c1c6d6] dark:border-gray-700 bg-white dark:bg-[#080D16] px-3 py-2.5 text-[#131b2d] dark:text-gray-100 text-[14px] focus:border-[#2F80F9] focus:ring-1 focus:ring-[#2F80F9] transition-all resize-none placeholder:text-[#727785] dark:placeholder:text-gray-600 outline-none"
                placeholder="Briefly describe what was discussed, concepts taught..."
                rows={2}
              />
            </div>

            {/* Homework / Action Items */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="homeworkAssigned"
                className="text-[12px] leading-[16px] tracking-[0.02em] font-semibold text-[#414754] dark:text-gray-400"
              >
                Homework / Exercises
              </label>
              <input
                id="homeworkAssigned"
                value={homeworkAssigned}
                onChange={(e) => setHomeworkAssigned(e.target.value)}
                className="w-full rounded-lg border border-[#c1c6d6] dark:border-gray-700 bg-white dark:bg-[#080D16] px-3 py-2 text-[#131b2d] dark:text-gray-100 text-[14px] focus:border-[#2F80F9] focus:ring-1 focus:ring-[#2F80F9] transition-all placeholder:text-[#727785] dark:placeholder:text-gray-600 outline-none"
                placeholder="Exercises or assignments given to learner..."
              />
            </div>

            {/* Comments / Internal Notes */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="comments"
                className="text-[12px] leading-[16px] tracking-[0.02em] font-semibold text-[#414754] dark:text-gray-400"
              >
                Comments & Observations
              </label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full rounded-lg border border-[#c1c6d6] dark:border-gray-700 bg-white dark:bg-[#080D16] px-3 py-2.5 text-[#131b2d] dark:text-gray-100 text-[14px] focus:border-[#2F80F9] focus:ring-1 focus:ring-[#2F80F9] transition-all resize-none placeholder:text-[#727785] dark:placeholder:text-gray-600 outline-none"
                placeholder="Feedback on student engagement, comprehension, next steps..."
                rows={3}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-[#c1c6d6]/50 dark:border-gray-800 gap-3 bg-[#f2f3ff]/30 dark:bg-[#080D16]/50 rounded-b-[12px]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#c1c6d6] dark:border-gray-700 text-[#131b2d] dark:text-gray-300 text-[12px] leading-[16px] tracking-[0.02em] font-semibold hover:bg-[#dbe2fb]/50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#2F80F9] text-white text-[12px] leading-[16px] tracking-[0.02em] font-semibold hover:bg-[#2F80F9]/90 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
