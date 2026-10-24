'use client';

import React, { useState } from 'react';
import { X, Star, MessageSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sessionName?: string;
  sessionId?: string;
  educatorId?: string;
  educatorName?: string;
}

export default function FeedbackModal({ 
  isOpen, 
  onClose,
  onSuccess,
  sessionName = "Physics - Kinematics",
  sessionId,
  educatorId,
  educatorName = "Prof. Alan"
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/v1/parent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comments: comments.trim(),
          sessionId,
          educatorId,
          sessionName,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit feedback');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess(false);
        setComments('');
        setRating(0);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error submitting feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E2535] rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-500" />
            Confidential Feedback
          </h2>
          <button 
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Feedback recorded confidentially. Thank you!</span>
            </div>
          )}
          
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sessionName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Educator: {educatorName}</p>
          </div>
          
          <div className="mb-6 flex flex-col items-center">
            <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-3">How would you rate this session?</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star 
                    className={`w-8 h-8 ${(hoveredRating || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} 
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
              <span>Private Comments</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">Visible only to Admin</span>
            </label>
            <textarea 
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share any specific feedback about the teaching style, pacing, or material..."
              className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
          <button 
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={rating === 0 || submitting || success}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>

      </div>
    </div>
  );
}
