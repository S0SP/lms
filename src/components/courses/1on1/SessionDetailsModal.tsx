'use client';

import React, { useState } from 'react';
import {
  X,
  Play,
  Sparkles,
  Users,
  Coins,
  FileText,
  RotateCw,
  Edit2,
  MoreVertical,
  CheckCircle2,
  Calendar,
  Clock,
  Loader2,
  Check,
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
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesGenerated, setNotesGenerated] = useState(false);

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

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    // Simulating quick AI generation and saving
    setTimeout(() => {
      setGeneratingQuiz(false);
      setQuizGenerated(true);
    }, 1500);
  };

  const handleGenerateNotes = async () => {
    setGeneratingNotes(true);
    setTimeout(() => {
      setGeneratingNotes(false);
      setNotesGenerated(true);
    }, 1500);
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

  const defaultSummary =
    session.aiSummary ||
    `This was an educational tutoring session between ${courseName?.split('-')[0] || 'the learner'} and educator focused on core syllabus concepts, practical numerical problems, and exam review.`;

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
              <button
                type="button"
                onClick={() => {
                  const url =
                    session.recordingUrl ||
                    'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';
                  onPlayRecording?.(url);
                }}
                className="py-2 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 fill-current text-gray-700 dark:text-gray-300" />
                <span>Play Recording</span>
              </button>
            </div>
          </div>

          {/* Section 1: HOSTED BY */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center">
                A
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  HOSTED BY
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {session.educatorName || 'Abir Sir'}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>Change</span>
            </button>
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
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {showFullSummary
                  ? defaultSummary
                  : defaultSummary.slice(0, 140) + '... '}
                <button
                  type="button"
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="font-bold text-gray-900 dark:text-white underline cursor-pointer ml-1"
                >
                  {showFullSummary ? 'See Less' : 'See More'}
                </button>
              </p>
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
                  {quizGenerated ? 'Quiz questions generated from session transcript' : 'Generate quiz now'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={generatingQuiz || quizGenerated}
              className="py-1.5 px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                  {notesGenerated ? 'Smart PDF revision notes generated' : 'Generate revision notes now'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateNotes}
              disabled={generatingNotes || notesGenerated}
              className="py-1.5 px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                      className="w-20 px-2 py-1 text-xs border rounded-lg"
                    />
                    <button
                      onClick={handleSaveCredits}
                      disabled={savingCredits}
                      className="px-2 py-1 bg-black text-white rounded text-xs"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {session.creditsConsumed || 1} credits
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
                  1 present
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

            {isAddingFeedback && (
              <div className="space-y-2 mt-2">
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter comments on learner performance, homework, and topics..."
                  className="w-full p-3 border rounded-xl text-xs bg-white dark:bg-gray-800"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingFeedback(false)}
                    className="px-3 py-1 text-xs border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFeedback}
                    disabled={savingFeedback}
                    className="px-4 py-1 text-xs bg-black text-white rounded-lg font-bold"
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
