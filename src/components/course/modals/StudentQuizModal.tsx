'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

interface StudentQuizModalProps {
  isOpen: boolean;
  resourceId: string;
  resourceTitle: string;
  onClose: () => void;
  onCompleted?: (result: any) => void;
}

export default function StudentQuizModal({
  isOpen,
  resourceId,
  resourceTitle,
  onClose,
  onCompleted,
}: StudentQuizModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Attempt State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds: string[] }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !resourceId) return;

    async function loadQuiz() {
      try {
        setLoading(true);
        setError(null);
        setResult(null);
        setCurrentIndex(0);
        setAnswers({});

        // 1. Fetch quiz structure
        const res = await fetch(`/api/v1/quizzes/${resourceId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load quiz');
        }
        setQuiz(data.data);

        // 2. Start attempt
        const startRes = await fetch(`/api/v1/quizzes/${resourceId}/attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        });
        const startData = await startRes.json();
        if (startRes.ok && startData.data?.id) {
          setAttemptId(startData.data.id);
        }

        if (data.data?.timeLimitSeconds) {
          setTimeLeftSeconds(data.data.timeLimitSeconds);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading quiz');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [isOpen, resourceId]);

  // Countdown effect
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0 || result) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeftSeconds, result]);

  if (!isOpen) return null;

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const currentSelected = prev[questionId]?.selectedOptionIds || [];
      let newSelected: string[];
      if (isMulti) {
        if (currentSelected.includes(optionId)) {
          newSelected = currentSelected.filter((id) => id !== optionId);
        } else {
          newSelected = [...currentSelected, optionId];
        }
      } else {
        newSelected = [optionId];
      }
      return {
        ...prev,
        [questionId]: { selectedOptionIds: newSelected },
      };
    });
  };

  const handleSubmitQuiz = async () => {
    if (!attemptId && !quiz?.id) return;
    try {
      setSubmitting(true);
      setError(null);

      const formattedAnswers = questions.map((q: any) => ({
        questionId: q.id,
        answerJson: answers[q.id] || { selectedOptionIds: [] },
      }));

      const res = await fetch(`/api/v1/quizzes/${resourceId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          attemptId: attemptId,
          answers: formattedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit quiz');
      }

      setResult(data.data);
      if (onCompleted) onCompleted(data.data);
    } catch (err: any) {
      setError(err.message || 'Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const totalPossibleMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  return (
    <div className="fixed inset-0 bg-[#131b2d]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {quiz?.name || resourceTitle}
              </h2>
              <span className="text-xs text-gray-500">
                {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''} • {totalPossibleMarks} Marks
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {timeLeftSeconds !== null && !result && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-mono font-bold text-xs rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatTimer(timeLeftSeconds)}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
              <p className="text-xs text-gray-500">Preparing test questions...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : result ? (
            /* Result Screen */
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 mx-auto flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Quiz Completed!
                </h3>
                <p className="text-xs text-gray-500 mt-1">Your answers have been auto-graded.</p>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 inline-block min-w-[240px]">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400 block mb-1">
                  Your Score
                </span>
                <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                  {result.autoScore ?? 0} <span className="text-xl text-gray-400 font-medium">/ {totalPossibleMarks}</span>
                </span>
                <span className="block text-xs font-semibold text-emerald-600 mt-2">
                  {Math.round(((result.autoScore ?? 0) / (totalPossibleMarks || 1)) * 100)}% Accuracy
                </span>
              </div>
            </div>
          ) : totalQuestions === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              This quiz does not have any questions yet.
            </div>
          ) : (
            /* Question Stepper */
            <div className="space-y-6">
              {/* Stepper Dots */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                  {currentQuestion.marks} Mark{currentQuestion.marks !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Question Text */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
                  {currentQuestion.bodyRichtext}
                </p>
                {currentQuestion.type === 'multi_correct' && (
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 block mt-2 font-medium">
                    (Select all that apply)
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestion.options?.map((opt: any) => {
                  const isSelected = answers[currentQuestion.id]?.selectedOptionIds?.includes(opt.id);
                  const isMulti = currentQuestion.type === 'multi_correct';

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, opt.id, isMulti)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-${isMulti ? 'md' : 'full'} border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{opt.body}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#161B26]">
          {result ? (
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit Quiz
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
