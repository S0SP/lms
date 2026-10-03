'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  MoreVertical,
  Repeat,
  FileText,
  Sparkles,
  BarChart2,
  Coins,
  Users,
  MessageSquare,
  Lock,
  Edit2,
  Check,
  Loader2,
  Tag,
  Trash2,
  Copy,
  Download,
  Video,
  Search,
  CheckSquare,
  Square,
  Sparkle,
} from 'lucide-react';
import { CalendarSessionItem } from './SessionPopoverCard';

export interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CalendarSessionItem;
  userRole?: 'educator' | 'admin' | 'owner' | 'student';
  onPlayRecording: (session: CalendarSessionItem) => void;
  onUpdateSession?: (sessionId: string, updates: Partial<CalendarSessionItem>) => Promise<void>;
  onChangeEducator?: (session: CalendarSessionItem) => void;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onStartSession?: (session: CalendarSessionItem) => void;
}

export function SessionDetailModal({
  isOpen,
  onClose,
  session,
  userRole = 'educator',
  onPlayRecording,
  onUpdateSession,
  onChangeEducator,
  onDeleteSession,
  onStartSession,
}: SessionDetailModalProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesGenerated, setNotesGenerated] = useState(false);

  // 3-dot dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Editable sections state
  const [isEditingCredits, setIsEditingCredits] = useState(false);
  const [creditsInput, setCreditsInput] = useState(String(session.creditsConsumed || (session.status === 'cancelled' ? '0' : '1')));
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'Pending' | 'Submitted'>('Pending');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [privateNoteInput, setPrivateNoteInput] = useState(session.topic || '');
  const [savingNote, setSavingNote] = useState(false);

  // Rename modal state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState(session.title);

  // Toast notification inside modal
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mark Attendance Sub-Modal
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [learnersAttendance, setLearnersAttendance] = useState<{ name: string; attended: boolean; percentage: number }[]>([]);

  const isAdmin = userRole === 'admin' || userRole === 'owner';

  useEffect(() => {
    // Populate attendance list from session learners or default
    const names = session.learnerNames && session.learnerNames.length > 0 
      ? session.learnerNames 
      : ['Reyan Gaddam'];
    setLearnersAttendance(
      names.map((name, i) => ({
        name,
        attended: session.status === 'completed' ? true : false,
        percentage: session.status === 'completed' ? 99 : 0,
      }))
    );
    setCreditsInput(String(session.creditsConsumed ?? (session.status === 'cancelled' ? '0' : '1')));
    setRenameInput(session.title);
  }, [session]);

  // Handle outside click for 3-dot menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const dateObj = new Date(session.scheduledAt);
  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = dateObj.getDate();
  const weekdayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  const startTimeStr = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const endDateObj = new Date(dateObj.getTime() + (session.durationMin || 60) * 60 * 1000);
  const endTimeStr = endDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isCompleted = session.status === 'completed';
  const isCancelled = session.status === 'cancelled';
  const isUpcoming = !isCompleted && !isCancelled;

  const educatorInitials = (session.educatorName || 'Abir Sir')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const handleGenerateQuiz = () => {
    setGeneratingQuiz(true);
    setTimeout(() => {
      setGeneratingQuiz(false);
      setQuizGenerated(true);
      showToast('Post-session quiz generated successfully!');
    }, 1200);
  };

  const handleGenerateNotes = () => {
    setGeneratingNotes(true);
    setTimeout(() => {
      setGeneratingNotes(false);
      setNotesGenerated(true);
      showToast('Revision notes prepared with AI!');
    }, 1200);
  };

  const handleSavePrivateNote = async () => {
    setSavingNote(true);
    try {
      if (onUpdateSession) {
        await onUpdateSession(session.id, { topic: privateNoteInput });
      }
      setIsAddingNote(false);
      showToast('Private note saved');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveCredits = async () => {
    if (onUpdateSession) {
      await onUpdateSession(session.id, { creditsConsumed: creditsInput });
    }
    setIsEditingCredits(false);
    showToast('Credits updated');
  };

  const handleSaveFeedback = async () => {
    if (feedbackInput.trim()) {
      setFeedbackStatus('Submitted');
      showToast('Educator feedback submitted');
    }
    setIsEditingFeedback(false);
  };

  const handleSaveRename = async () => {
    if (renameInput.trim() && onUpdateSession) {
      await onUpdateSession(session.id, { title: renameInput.trim() });
      showToast('Session title updated');
    }
    setIsRenaming(false);
  };

  // Zoom / Menu Actions
  const handleCopyLink = () => {
    const link = session.zoomMeetingUrl || `https://zoom.us/j/${session.zoomMeetingId || '92847291823'}`;
    navigator.clipboard.writeText(link);
    showToast('Session link copied to clipboard!');
    setMenuOpen(false);
  };

  const handleDownloadAttendance = () => {
    const csvContent = 'Learner Name,Status,Attendance Percentage\n' +
      learnersAttendance.map(l => `"${l.name}",${l.attended ? 'Present' : 'Absent'},${l.percentage}%`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report downloaded');
    setMenuOpen(false);
  };

  const handleDownloadTranscript = () => {
    const transcriptText = `WEBVTT\n\n00:00:01.000 --> 00:00:15.000\n${session.educatorName || 'Simra Sayeed'}: Welcome to today's session on imagery and analytical methodology.\n\n00:00:16.000 --> 00:00:45.000\nReyan: Thank you! I had some questions regarding visual and tactile imagery from the worksheet.\n\n00:00:46.000 --> 00:01:20.000\n${session.educatorName || 'Simra Sayeed'}: Let's break down each category step by step...`;
    const blob = new Blob([transcriptText], { type: 'text/vtt;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transcript_${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.vtt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Zoom transcript downloaded');
    setMenuOpen(false);
  };

  const handleDownloadChat = () => {
    const chatText = `Session Chat Log - ${session.title}\nDate: ${dateObj.toLocaleDateString()}\n\n05:05 AM - ${session.educatorName || 'Simra Sayeed'}: Welcome to the session! Sharing worksheet link in chat.\n05:12 AM - Reyan: Got the link, opening now.\n05:40 AM - ${session.educatorName || 'Simra Sayeed'}: Great work on question 4!\n06:00 AM - Reyan: Thank you for the session!`;
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chat_log_${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('In-meeting chat log downloaded');
    setMenuOpen(false);
  };

  const handleDownloadRecording = () => {
    showToast('Starting recording MP4 download...');
    setMenuOpen(false);
    onPlayRecording(session);
  };

  const handleDeleteSession = async () => {
    if (confirm('Are you sure you want to delete this session?')) {
      if (onDeleteSession) {
        await onDeleteSession(session.id);
      }
      onClose();
    }
  };

  const handleDeleteRecording = () => {
    if (confirm('Are you sure you want to delete this Zoom recording? This cannot be undone.')) {
      showToast('Recording deleted from cloud storage');
      setMenuOpen(false);
    }
  };

  const handleToggleAttendance = (index: number) => {
    setLearnersAttendance(prev => prev.map((item, idx) => {
      if (idx === index) {
        const nextAttended = !item.attended;
        return {
          ...item,
          attended: nextAttended,
          percentage: nextAttended ? 99 : 0,
        };
      }
      return item;
    }));
  };

  const filteredLearners = learnersAttendance.filter(l => 
    l.name.toLowerCase().includes(attendanceSearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 text-gray-900 dark:text-gray-100 flex flex-col animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast inside modal */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white dark:bg-white dark:text-gray-900 px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md animate-in fade-in duration-150">
            <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─── TOP HEADER ─── */}
        <div className="px-8 pt-7 pb-4 flex items-start justify-between border-b border-gray-100 dark:border-gray-800/80">
          <div>
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="px-3 py-1 text-base font-bold border border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-950 dark:text-white focus:outline-hidden"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1 className="text-xl font-extrabold tracking-tight text-gray-950 dark:text-white">
                {session.title}
              </h1>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {session.courseName || session.title}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── DATE & ACTION BAR ─── */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#111622]/40 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Date Badge */}
            <div className="flex flex-col items-center justify-center w-12 h-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs overflow-hidden shrink-0">
              <span className="w-full text-center py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-900 text-white dark:bg-gray-700">
                {monthShort}
              </span>
              <span className="text-lg font-black text-gray-950 dark:text-white leading-tight">
                {dayNum}
              </span>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-950 dark:text-white truncate max-w-[280px]">
                {isCancelled
                  ? 'Live Session (Cancelled)'
                  : isUpcoming
                  ? 'Live Session'
                  : session.title}
              </h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                {weekdayShort}, {startTimeStr} - {endTimeStr}
              </p>

              <div className="flex items-center gap-1.5 mt-1.5">
                {isCancelled ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Cancelled
                  </span>
                ) : isUpcoming ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Upcoming
                  </span>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                      Ended
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                      Completed
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons & 3-Dot Menu */}
          <div className="flex items-center gap-2 relative" ref={menuRef}>
            {isCompleted && (
              <button
                type="button"
                onClick={() => onPlayRecording(session)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-gray-700 dark:text-gray-300" />
                <span>Play Recording</span>
              </button>
            )}

            {isUpcoming && (
              <button
                type="button"
                onClick={() => {
                  if (onStartSession) onStartSession(session);
                  else if (session.zoomMeetingUrl) window.open(session.zoomMeetingUrl, '_blank');
                  else showToast('Launching Zoom session...');
                }}
                className="px-5 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Start
              </button>
            )}

            {/* Three Dot Trigger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Three Dot Dropdown Menu (Matches Screenshot 2, 4) */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1C2333] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-150">
                {isCompleted ? (
                  <>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsRenaming(true);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        <span>Rename</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        showToast('Tag editor opened');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-gray-500" />
                      <span>Add tags</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleDeleteSession();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                    <button
                      onClick={handleCopyLink}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>Copy session link</span>
                    </button>

                    <button
                      onClick={handleDownloadAttendance}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download attendance</span>
                    </button>

                    <button
                      onClick={handleDownloadTranscript}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download transcript</span>
                    </button>

                    <button
                      onClick={handleDownloadChat}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download chat</span>
                    </button>

                    <button
                      onClick={handleDownloadRecording}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download Recording</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={handleDeleteRecording}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Recording</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        showToast('Tag editor opened');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-gray-500" />
                      <span>Add tags</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleDeleteSession();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      onClick={handleCopyLink}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>Copy session link</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── MODAL CONTENT BODY ─── */}
        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* 1. HOSTED BY */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#121826] text-white dark:bg-blue-600 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {educatorInitials}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                  HOSTED BY
                </p>
                <p className="text-sm font-extrabold text-gray-950 dark:text-white">
                  {session.educatorName || 'Abir Sir'}
                </p>
              </div>
            </div>

            {/* Change Educator button (Only for Admin, or upcoming if admin) */}
            {isAdmin && isUpcoming && (
              <button
                type="button"
                onClick={() => {
                  if (onChangeEducator) onChangeEducator(session);
                  else showToast('Change educator modal triggered');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            )}
          </div>

          {/* ─── COMPLETED SESSION SECTIONS (Screenshot 2) ─── */}
          {isCompleted && (
            <>
              {/* 2. SUMMARY (AI) */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/80">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                      SUMMARY
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 border border-pink-200/80 dark:border-pink-800/60">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                    {session.aiSummary
                      ? session.aiSummary
                      : session.topic
                      ? session.topic
                      : `The meeting was an interactive lesson between ${session.educatorName || 'Simra'} and ${session.learnerNames?.[0] || 'Reyan'}. ${session.educatorName || 'Simra'} reviewed curriculum concepts, imagery types, and analytical exercises with live queries.`}
                    {summaryExpanded && (
                      <span className="block mt-2 text-gray-600 dark:text-gray-400">
                        Additional details: Visual and auditory examples were practiced with 1-on-1 feedback. Homework questions were set for the upcoming review module.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className="ml-1 text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                    >
                      {summaryExpanded ? 'See Less' : 'See More'}
                    </button>
                  </p>
                </div>
              </div>

              {/* 3. POST SESSION QUIZ (AI) */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/80">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                    <BarChart2 className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                        POST SESSION QUIZ
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 border border-pink-200/80 dark:border-pink-800/60">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {quizGenerated ? '5 practice questions generated ✓' : 'Generate quiz now'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={generatingQuiz}
                  onClick={handleGenerateQuiz}
                  className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {generatingQuiz ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                    </span>
                  ) : quizGenerated ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>

              {/* 4. REVISION NOTES (AI) */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/80">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                        REVISION NOTES
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 border border-pink-200/80 dark:border-pink-800/60">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {notesGenerated ? 'Summary study sheet prepared ✓' : 'Generate revision notes now'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={generatingNotes}
                  onClick={handleGenerateNotes}
                  className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {generatingNotes ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                    </span>
                  ) : notesGenerated ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ─── CREDITS CONSUMED (Completed or Cancelled) ─── */}
          {(isCompleted || isCancelled) && (
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/80">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                  <Coins className="w-4 h-4" />
                </div>

                <div>
                  <p className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                    CREDITS CONSUMED
                  </p>
                  {isEditingCredits ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={creditsInput}
                        onChange={(e) => setCreditsInput(e.target.value)}
                        className="w-20 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      />
                      <button
                        onClick={handleSaveCredits}
                        className="px-2.5 py-1 text-xs font-bold bg-blue-600 text-white rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {isCancelled ? '0 credits' : `${creditsInput || '1'} credit`}
                    </p>
                  )}
                </div>
              </div>

              {/* Admin only can edit credits */}
              {isAdmin && !isEditingCredits && (
                <button
                  type="button"
                  onClick={() => setIsEditingCredits(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          )}

          {/* ─── ATTENDANCE (Completed Only) ─── */}
          {isCompleted && (
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/80">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>

                <div>
                  <p className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                    ATTENDANCE
                  </p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {learnersAttendance.filter(l => l.attended).length} present
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  View
                </button>
                {/* Admin only gets attendance edit button */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setAttendanceModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── EDUCATOR FEEDBACK (Completed or Cancelled) ─── */}
          {(isCompleted || isCancelled) && (
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/80">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>

                <div>
                  <p className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                    EDUCATOR FEEDBACK
                  </p>
                  {isCancelled ? (
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Feedback by {session.educatorName || 'Abir Sir'}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(session.scheduledAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}, 12:01 pm
                      </p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                        Comment: Student is unwell
                      </p>
                    </div>
                  ) : isEditingFeedback ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        rows={2}
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Add educator feedback for student & parents..."
                        className="w-full p-2 text-xs border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-hidden"
                      />
                      <button
                        onClick={handleSaveFeedback}
                        className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer"
                      >
                        Save Feedback
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        feedbackStatus === 'Submitted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {feedbackStatus}
                    </span>
                  )}
                </div>
              </div>

              {!isEditingFeedback && (
                <button
                  type="button"
                  onClick={() => setIsEditingFeedback(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isCancelled ? 'Edit' : 'Add feedback'}</span>
                </button>
              )}
            </div>
          )}

          {/* ─── PRIVATE NOTE (Always shown) ─── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>

              <div className="flex-1">
                <p className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                  PRIVATE NOTE
                </p>
                {isAddingNote ? (
                  <div className="space-y-2 mt-1">
                    <textarea
                      rows={2}
                      value={privateNoteInput}
                      onChange={(e) => setPrivateNoteInput(e.target.value)}
                      placeholder="Add private note visible only to admins and faculty..."
                      className="w-full p-2 text-xs border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePrivateNote}
                        disabled={savingNote}
                        className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg disabled:opacity-50 cursor-pointer"
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                      <button
                        onClick={() => setIsAddingNote(false)}
                        className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {privateNoteInput || 'Only visible to Admins & Educators'}
                  </span>
                )}
              </div>
            </div>

            {!isAddingNote && (
              <button
                type="button"
                onClick={() => setIsAddingNote(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{privateNoteInput ? 'Edit' : 'Add'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MARK ATTENDANCE SUB-MODAL (Screenshot 1) ─── */}
      {attendanceModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setAttendanceModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-gray-900 dark:text-gray-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-extrabold text-gray-950 dark:text-white">
                Mark Attendance
              </h2>
              <button
                onClick={() => setAttendanceModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Learners"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111622] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Table / List Header */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-[#111622]">
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <span>Learner</span>
                  <span>Attended</span>
                </div>

                {/* Learners rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800/80 max-h-60 overflow-y-auto">
                  {filteredLearners.length > 0 ? (
                    filteredLearners.map((learner, idx) => {
                      const init = learner.name.charAt(0).toUpperCase();
                      return (
                        <div
                          key={idx}
                          className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#121826] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {init}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">
                                {learner.name}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {learner.attended ? `Present · ${learner.percentage}%` : 'Absent'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(idx)}
                            className="text-gray-900 dark:text-white hover:opacity-80 transition cursor-pointer"
                          >
                            {learner.attended ? (
                              <CheckSquare className="w-5 h-5 fill-gray-900 dark:fill-white text-white dark:text-gray-900" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-500">
                      No learners found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendanceModalOpen(false);
                  showToast('Attendance recorded successfully');
                }}
                className="px-6 py-2 text-xs font-bold text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 rounded-xl transition shadow-xs cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
