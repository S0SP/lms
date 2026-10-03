'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Users,
  BookOpen,
} from 'lucide-react';
import { validateEmail } from '@/lib/validation';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface AddMultipleLearnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CourseOption {
  id: string;
  name: string;
}

export function AddMultipleLearnersModal({
  isOpen,
  onClose,
  onSuccess,
}: AddMultipleLearnersModalProps) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setSuccess(false);

      // Fetch courses for dropdown
      fetch('/api/v1/courses?perPage=50')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            setCourses(json.data.map((c: any) => ({ id: c.id, name: c.name })));
            if (json.data.length > 0) setSelectedCourseId(json.data[0].id);
          }
        })
        .catch(() => {});
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError('Please provide at least one learner email or name');
      return;
    }

    setSubmitting(true);
    let createdCount = 0;

    try {
      for (const line of lines) {
        // Line format can be: "email@test.com" or "John Doe, email@test.com"
        const parts = line.split(',').map((p) => p.trim());
        let name = parts[0];
        let email = parts[1] || parts[0];

        if (parts.length === 1 && line.includes('@')) {
          name = line.split('@')[0];
          email = line;
        }

        const emailCheck = validateEmail(email, { required: true });
        if (!emailCheck.isValid) {
          throw new Error(`Invalid email on line: "${line}"`);
        }

        const res = await fetch('/api/v1/learners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: email.toLowerCase(),
            courseId: selectedCourseId || undefined,
          }),
        });

        if (res.ok) {
          createdCount++;
        }
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setRawText('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to add multiple learners');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161B26] w-full max-w-[480px] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Add Multiple Learners
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-3 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Learners added successfully! Closing...</span>
            </div>
          )}

          {courses.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                Assign to Course
              </label>
              <CustomSelect
                value={selectedCourseId}
                onChange={(val) => setSelectedCourseId(val)}
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select a course..."
                size="sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
              Learners List (One per line)
            </label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
              Format: <span className="font-mono text-gray-700 dark:text-gray-300">Name, email@domain.com</span> or just <span className="font-mono text-gray-700 dark:text-gray-300">email@domain.com</span>
            </p>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Aryan Sharma, aryan@example.com\nSimran Kaur, simran@example.com\nrohit@example.com`}
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 font-mono resize-none shadow-2xs"
            />
          </div>

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95 text-center shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition active:scale-95 text-center shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Add Learners</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
