'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, FileText, Download, Award, MessageSquare, Loader2, AlertCircle } from 'lucide-react';

interface GradingSubmissionsModalProps {
  isOpen: boolean;
  assignmentId: string;
  assignmentTitle: string;
  maxMarks: number;
  onClose: () => void;
  onGraded?: () => void;
}

export default function GradingSubmissionsModal({
  isOpen,
  assignmentId,
  assignmentTitle,
  maxMarks,
  onClose,
  onGraded,
}: GradingSubmissionsModalProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  // Form state for grading the active submission
  const [scoreInput, setScoreInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !assignmentId) return;

    async function fetchSubmissions() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/assignments/${assignmentId}/submissions`);
        const json = await res.json();
        if (res.ok) {
          setSubmissions(json.data || []);
          if (json.data && json.data.length > 0) {
            const first = json.data[0];
            setActiveSubId(first.id);
            setScoreInput(first.totalScore !== null ? String(first.totalScore) : '');
            setFeedbackInput(first.feedback || '');
          }
        } else {
          setError(json.error || 'Failed to load submissions');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching submissions');
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, [isOpen, assignmentId]);

  if (!isOpen) return null;

  const activeSub = submissions.find((s) => s.id === activeSubId);

  const handleSelectSub = (sub: any) => {
    setActiveSubId(sub.id);
    setScoreInput(sub.totalScore !== null ? String(sub.totalScore) : '');
    setFeedbackInput(sub.feedback || '');
    setGradeSuccess(false);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubId) return;

    const numScore = Number(scoreInput);
    if (isNaN(numScore) || numScore < 0 || numScore > maxMarks) {
      alert(`Score must be between 0 and ${maxMarks}`);
      return;
    }

    try {
      setGrading(true);
      const res = await fetch(`/api/v1/assignments/${assignmentId}/submissions/${activeSubId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalScore: numScore,
          feedback: feedbackInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit grade');
      }

      setGradeSuccess(true);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === activeSubId
            ? { ...s, totalScore: numScore, feedback: feedbackInput.trim(), gradedAt: new Date().toISOString() }
            : s
        )
      );

      if (onGraded) onGraded();
      setTimeout(() => setGradeSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error saving grade');
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#131b2d]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Submissions & Grading
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {assignmentTitle} • Max Marks: {maxMarks}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No Submissions Yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">
              Students have not uploaded solutions for this assignment yet. Submissions will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Submissions List */}
            <div className="w-full md:w-80 border-r border-gray-100 dark:border-gray-800 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 shrink-0">
              {submissions.map((sub) => {
                const isSelected = sub.id === activeSubId;
                const isGraded = sub.totalScore !== null;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSub(sub)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {sub.learnerName?.charAt(0) || 'L'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {sub.learnerName || 'Student'}
                        </span>
                        {isGraded ? (
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            {sub.totalScore}/{maxMarks}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                            Ungraded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{sub.learnerEmail}</p>
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Grading Pane */}
            {activeSub ? (
              <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Student details & submitted files */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">
                          {activeSub.learnerName}
                        </h4>
                        <p className="text-xs text-gray-500">{activeSub.learnerEmail}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        Submitted: {new Date(activeSub.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                        Attached Files ({activeSub.fileR2Keys?.length || 0})
                      </span>
                      {activeSub.fileR2Keys && activeSub.fileR2Keys.length > 0 ? (
                        <div className="space-y-1.5">
                          {activeSub.fileR2Keys.map((key: string, idx: number) => {
                            const name = key.split('/').pop() || `Attachment ${idx + 1}`;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span className="text-gray-700 dark:text-gray-300 truncate">{name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                  R2 Cloud Storage
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No files attached.</p>
                      )}
                    </div>
                  </div>

                  {/* Grading Form */}
                  <form id="grade-form" onSubmit={handleSaveGrade} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Award Score (out of {maxMarks}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        step="0.5"
                        required
                        placeholder={`e.g. ${maxMarks * 0.9}`}
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Educator Feedback & Comments
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Write constructive remarks, areas of improvement, or praise for the student..."
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm resize-none"
                      />
                    </div>
                  </form>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between mt-6">
                  {gradeSuccess ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Grade and feedback saved!
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    form="grade-form"
                    disabled={grading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    Save Grade
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
