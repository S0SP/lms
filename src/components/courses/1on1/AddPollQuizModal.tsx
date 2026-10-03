'use client';

import React, { useState } from 'react';
import { X, GripVertical, Trash2, Plus, Loader2, CheckCircle2 } from 'lucide-react';

interface AddPollQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onPollCreated?: (newPollPost: any) => void;
}

export function AddPollQuizModal({
  isOpen,
  onClose,
  courseId,
  onPollCreated,
}: AddPollQuizModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(0);
  const [quizMode, setQuizMode] = useState(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState(false);
  const [turnOffComments, setTurnOffComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 10) return;
    const nextLetter = String.fromCharCode(65 + options.length);
    setOptions([...options, `Option ${nextLetter}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    if (correctOptionIndex === index) {
      setCorrectOptionIndex(0);
    } else if (correctOptionIndex !== null && correctOptionIndex > index) {
      setCorrectOptionIndex(correctOptionIndex - 1);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      setErrorMsg('Please enter a question.');
      return;
    }
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setErrorMsg('Please provide at least 2 valid options.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payloadOptions = validOptions.map((optText, idx) => ({
        text: optText,
        isCorrect: quizMode ? correctOptionIndex === idx : false,
      }));

      const res = await fetch(`/api/v1/courses/${courseId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPoll: true,
          question: question.trim(),
          isQuizMode: quizMode,
          showResultsImmediately,
          commentsDisabled: turnOffComments,
          options: payloadOptions,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        onPollCreated?.(json.data);
        onClose();
      } else {
        const json = await res.json();
        setErrorMsg(json.error || 'Failed to create poll/quiz.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while creating poll.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Add Poll/Quiz
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Question */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="When do you want the next session to be?"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Options
              </label>
              {quizMode && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Select the correct answer
                </span>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <span className="text-gray-300 dark:text-gray-600 cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </span>

                  {/* Radio selector for correct answer in Quiz mode */}
                  {quizMode && (
                    <button
                      type="button"
                      title="Mark as correct answer"
                      onClick={() => setCorrectOptionIndex(index)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                        correctOptionIndex === index
                          ? 'border-emerald-600 bg-emerald-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500'
                      }`}
                    >
                      {correctOptionIndex === index && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className={`flex-1 px-3.5 py-2 bg-white dark:bg-gray-800 border rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none transition shadow-2xs ${
                      quizMode && correctOptionIndex === index
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-gray-200 dark:border-gray-700 focus:border-blue-500'
                    }`}
                  />

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddOption}
              className="mt-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer pt-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Option</span>
            </button>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
            {/* Quiz mode toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  Quiz mode
                </div>
                <div className="text-[11px] text-gray-400">
                  Auto enables selecting correct option
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quizMode}
                onClick={() => setQuizMode(!quizMode)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  quizMode ? 'bg-[#0F172A] dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    quizMode ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Show results immediately */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Show results immediately after voting
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showResultsImmediately}
                onClick={() => setShowResultsImmediately(!showResultsImmediately)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  showResultsImmediately ? 'bg-[#0F172A] dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    showResultsImmediately ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Turn off comments */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Turn off comments
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={turnOffComments}
                onClick={() => setTurnOffComments(!turnOffComments)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  turnOffComments ? 'bg-[#0F172A] dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    turnOffComments ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !question.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Poll</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
