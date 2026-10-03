'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Sparkles,
  Users,
  Coins,
  FileText,
  RotateCw,
  Edit2,
  CheckCircle2,
  Calendar,
  Clock,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  courseName?: string;
  courseSubtitle?: string;
  onPlayRecording?: (videoUrl: string) => void;
  onSessionUpdated?: () => void;
}

export function SessionDetailsModal({
  isOpen,
  onClose,
  session,
  courseName,
  courseSubtitle,
  onPlayRecording,
  onSessionUpdated,
}: SessionDetailsModalProps) {
  const [showFullSummary, setShowFullSummary] = useState(false);

  // ── Real AI state loaded from backend ──
  const [loadingAiState, setLoadingAiState] = useState(false);
  const [hasAiKey, setHasAiKey] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [notesGenerated, setNotesGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── Loading states for generate actions ──
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Edit credits state
  const [isEditingCredits, setIsEditingCredits] = useState(false);
  const [creditsConsumed, setCreditsConsumed] = useState(
    session?.creditsConsumed ? String(session.creditsConsumed) : '1'
  );
  const [savingCredits, setSavingCredits] = useState(false);

  // Feedback State
  const [isAddingFeedback, setIsAddingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  // ── Fetch real AI state from backend ──
  const fetchAiState = useCallback(async () => {
    if (!session?.id) return;
    setLoadingAiState(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/v1/sessions/${session.id}/ai`);
      if (res.ok) {
        const data = await res.json();
        const d = data.data || data;
        setHasAiKey(Boolean(d.hasAiKey));
        setAiSummary(d.aiSummary || null);
        setQuizGenerated(Boolean(d.hasQuiz));
        setNotesGenerated(Boolean(d.hasNotes));
      }
    } catch {
      // Non-fatal — just show the generate buttons
    } finally {
      setLoadingAiState(false);
    }
  }, [session?.id]);

  useEffect(() => {
    if (isOpen && session?.id) {
      fetchAiState();
    }
  }, [isOpen, session?.id, fetchAiState]);

  if (!isOpen || !session) return null;

  const date = new Date(session.scheduledAt);
  const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = date.getDate();
  const timeFormatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const durationMin = session.durationMin || 60;
  const endDate = new Date(date.getTime() + durationMin * 60 * 1000);
  const endTimeStr = endDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // ── REAL: Generate Quiz ──
  const handleGenerateQuiz = async () => {
    if (!hasAiKey) {
      setAiError('No AI API key configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.');
      return;
    }
    setGeneratingQuiz(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/v1/sessions/${session.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quiz' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || data?.message || 'Quiz generation failed.');
      } else {
        setQuizGenerated(true);
        onSessionUpdated?.();
      }
    } catch (err: any) {
      setAiError(err?.message || 'Network error during quiz generation.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // ── REAL: Generate Revision Notes ──
  const handleGenerateNotes = async () => {
    if (!hasAiKey) {
      setAiError('No AI API key configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.');
      return;
    }
    setGeneratingNotes(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/v1/sessions/${session.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notes' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || data?.message || 'Notes generation failed.');
      } else {
        setNotesGenerated(true);
        onSessionUpdated?.();
      }
    } catch (err: any) {
      setAiError(err?.message || 'Network error during notes generation.');
    } finally {
      setGeneratingNotes(false);
    }
  };

  // ── REAL: Regenerate Summary ──
  const handleRegenerateSummary = async () => {
    if (!hasAiKey) {
      setAiError('No AI API key configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.');
      return;
    }
    setGeneratingSummary(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/v1/sessions/${session.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summary' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || data?.message || 'Summary generation failed.');
      } else {
        setAiSummary(data?.data?.summary || data?.summary || null);
        onSessionUpdated?.();
      }
    } catch (err: any) {
      setAiError(err?.message || 'Network error during summary generation.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSaveCredits = async () => {
    try {
      setSavingCredits(true);
      const res = await fetch(`/api/v1/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditsConsumed: parseFloat(creditsConsumed) || 1,
        }),
      });
      if (res.ok) {
        setIsEditingCredits(false);
        onSessionUpdated?.();
      }
    } finally {
      setSavingCredits(false);
    }
  };

  const handleSaveFeedback = async () => {
    try {
      setSavingFeedback(true);
      const res = await fetch(`/api/v1/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: feedbackText,
        }),
      });
      if (res.ok) {
        setIsAddingFeedback(false);
        onSessionUpdated?.();
      }
    } finally {
      setSavingFeedback(false);
    }
  };

  // Only show the real summary — no fake fallback
  const displaySummary = aiSummary || session.aiSummary || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {courseName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {courseSubtitle || '1-on-1 Personalized Session'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* AI Error Banner */}
          {aiError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">{aiError}</p>
              <button
                onClick={() => setAiError(null)}
                className="ml-auto text-red-400 hover:text-red-600 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* No AI key warning (non-blocking) */}
          {!loadingAiState && !hasAiKey && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                AI features are disabled — no API key configured. Add <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">GEMINI_API_KEY</code> or <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">ANTHROPIC_API_KEY</code> to your <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env</code> file.
              </p>
            </div>
          )}

          {/* Top Session Card */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131722] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-4">
              {/* Date Box */}
              <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  {monthStr}
                </span>
                <span className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">
                  {dayNum}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {session.title}
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {timeFormatted} - {endTimeStr}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Ended
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session.recordingUrl && (
                <button
                  type="button"
                  onClick={() => onPlayRecording?.(session.recordingUrl)}
                  className="py-2 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-gray-700 dark:text-gray-300" />
                  <span>Play Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 1: HOSTED BY */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center">
                {(session.educatorName || 'A')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  HOSTED BY
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {session.educatorName || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: SUMMARY (AI) */}
          <div className="flex items-start gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-gray-300">
              <FileText className="w-4 h-4" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  SUMMARY
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
                {hasAiKey && (
                  <button
                    type="button"
                    onClick={handleRegenerateSummary}
                    disabled={generatingSummary}
                    className="ml-auto py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 disabled:opacity-50"
                  >
                    {generatingSummary ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /><span>Generating...</span></>
                    ) : (
                      <span>{displaySummary ? 'Regenerate' : 'Generate'}</span>
                    )}
                  </button>
                )}
              </div>

              {loadingAiState ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading AI data...</span>
                </div>
              ) : displaySummary ? (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {showFullSummary
                    ? displaySummary
                    : displaySummary.length > 140
                    ? displaySummary.slice(0, 140) + '... '
                    : displaySummary}
                  {displaySummary.length > 140 && (
                    <button
                      type="button"
                      onClick={() => setShowFullSummary(!showFullSummary)}
                      className="font-bold text-gray-900 dark:text-white underline cursor-pointer ml-1"
                    >
                      {showFullSummary ? 'See Less' : 'See More'}
                    </button>
                  )}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  {hasAiKey
                    ? 'No summary yet. Click Generate to create one.'
                    : 'AI key required to generate summary.'}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: POST SESSION QUIZ (AI) */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-gray-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    POST SESSION QUIZ
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {quizGenerated
                    ? 'Quiz questions generated from session transcript'
                    : hasAiKey
                    ? 'Generate an interactive quiz from this session'
                    : 'AI key required'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={generatingQuiz || quizGenerated || !hasAiKey || loadingAiState}
              className="py-1.5 px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingQuiz ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : quizGenerated ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Generated</span>
                </>
              ) : (
                <span>Generate</span>
              )}
            </button>
          </div>

          {/* Section 4: REVISION NOTES (AI) */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-gray-300">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    REVISION NOTES
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {notesGenerated
                    ? 'Smart revision notes generated from session'
                    : hasAiKey
                    ? 'Generate structured revision notes for the learner'
                    : 'AI key required'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateNotes}
              disabled={generatingNotes || notesGenerated || !hasAiKey || loadingAiState}
              className="py-1.5 px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingNotes ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : notesGenerated ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Generated</span>
                </>
              ) : (
                <span>Generate</span>
              )}
            </button>
          </div>

          {/* Section 5: CREDITS CONSUMED */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-gray-300">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  CREDITS CONSUMED
                </div>
                {isEditingCredits ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={creditsConsumed}
                      onChange={(e) => setCreditsConsumed(e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleSaveCredits}
                      disabled={savingCredits}
                      className="px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      {savingCredits ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditingCredits(false)}
                      className="px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {Number(session.creditsConsumed || 1).toFixed(2)} credits
                  </div>
                )}
              </div>
            </div>

            {!isEditingCredits && (
              <button
                type="button"
                onClick={() => setIsEditingCredits(true)}
                className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Section 6: ATTENDANCE */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-gray-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  ATTENDANCE
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {session.attendeeCount != null ? `${session.attendeeCount} present` : '1 present'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                View
              </button>
              <button
                type="button"
                className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Section 7: EDUCATOR FEEDBACK */}
          <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                EDUCATOR FEEDBACK
              </div>
              <button
                type="button"
                onClick={() => setIsAddingFeedback(!isAddingFeedback)}
                className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Add feedback</span>
              </button>
            </div>

            {session.topic && !isAddingFeedback && (
              <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                {session.topic}
              </p>
            )}

            {isAddingFeedback && (
              <div className="space-y-2 mt-2">
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter comments on learner performance, homework, and topics..."
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingFeedback(false)}
                    className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFeedback}
                    disabled={savingFeedback || !feedbackText.trim()}
                    className="px-4 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold disabled:opacity-50"
                  >
                    {savingFeedback ? 'Saving...' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
