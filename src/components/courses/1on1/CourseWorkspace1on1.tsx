'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  PlayCircle,
  FileText,
  User,
  Plus,
  MoreVertical,
  Download,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Layers,
  Settings as SettingsIcon,
  CreditCard,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Volume2,
  Paperclip,
  Check,
  AlertCircle,
  RotateCcw,
  Eye,
  Trash2,
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Modals
import { DownloadSessionReportModal } from './DownloadSessionReportModal';
import { ManageCreditsModal } from './ManageCreditsModal';
import { SessionCreditsModal } from './SessionCreditsModal';
import { AddEducatorModal } from './AddEducatorModal';
import { AddPollQuizModal } from './AddPollQuizModal';
import { CreateChitChatModal } from './CreateChitChatModal';
import { SessionDetailsModal } from './SessionDetailsModal';
import { VideoPlayerModal } from './VideoPlayerModal';

export interface CourseWorkspaceProps {
  courseId: string;
  userRole?: 'admin' | 'educator' | 'learner';
  currentUserId?: string;
}

export function CourseWorkspace1on1({
  courseId,
  userRole = 'admin',
  currentUserId,
}: CourseWorkspaceProps) {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'content' | 'billing' | 'settings'>('home');

  // Course Data
  const [course, setCourse] = useState<any>(null);
  const [credits, setCredits] = useState<{ remaining: number; consumed: number; total: number }>({
    remaining: 0,
    consumed: 0,
    total: 0,
  });
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [timelinePosts, setTimelinePosts] = useState<any[]>([]);
  const [educators, setEducators] = useState<any[]>([]);
  const [contentSections, setContentSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isManageCreditsModalOpen, setIsManageCreditsModalOpen] = useState(false);
  const [isCreditsHistoryModalOpen, setIsCreditsHistoryModalOpen] = useState(false);
  const [isAddEducatorModalOpen, setIsAddEducatorModalOpen] = useState(false);
  const [isPollQuizModalOpen, setIsPollQuizModalOpen] = useState(false);
  const [isChitChatModalOpen, setIsChitChatModalOpen] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<any | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string; date?: string; educatorName?: string } | null>(null);

  // Settings tab form state
  const [courseNameInput, setCourseNameInput] = useState('');
  const [courseSubjectInput, setCourseSubjectInput] = useState('');
  const [courseGradeInput, setCourseGradeInput] = useState('');
  const [courseBoardInput, setCourseBoardInput] = useState('');
  const [courseStatusInput, setCourseStatusInput] = useState('active');
  const [selectedEducatorId, setSelectedEducatorId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Fetch all course workspace data concurrently
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch main datasets in parallel
      const [courseRes, sessionsRes, timelineRes, educatorsRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}`),
        fetch(`/api/v1/sessions?courseId=${courseId}&perPage=100`),
        fetch(`/api/v1/courses/${courseId}/timeline`),
        fetch(`/api/v1/courses/${courseId}/educators`),
      ]);

      if (!courseRes.ok) throw new Error('Course not found');
      const courseData = await courseRes.json();
      const c = courseData.data || courseData;
      setCourse(c);
      setCourseNameInput(c.name || '');
      setCourseSubjectInput(c.subject || '');
      setCourseGradeInput(c.grade || '');
      setCourseBoardInput(c.board || (typeof c.curriculum === 'string' ? c.curriculum : 'Cambridge IGCSE'));
      setCourseStatusInput(c.status || 'active');

      // 2. Process Educators
      let eduList: any[] = [];
      if (educatorsRes.ok) {
        const eduData = await educatorsRes.json();
        eduList = eduData.data || eduData.educators || [];
      }
      if (eduList.length === 0 && Array.isArray(c.educators) && c.educators.length > 0) {
        eduList = c.educators;
      }
      setEducators(eduList);
      if (eduList.length > 0) setSelectedEducatorId(eduList[0].id);

      // 3. Process Sessions
      if (sessionsRes.ok) {
        const sessData = await sessionsRes.json();
        setSessions(sessData.data || sessData.sessions || []);
      }

      // 4. Process Timeline Posts
      if (timelineRes.ok) {
        const timeData = await timelineRes.json();
        setTimelinePosts(timeData.data || timeData.posts || []);
      }

      // 5. Process Content curriculum sections
      const loadedSections = (c.curriculum && Array.isArray(c.curriculum) && c.curriculum.length > 0)
        ? c.curriculum
        : (c.sections && Array.isArray(c.sections) && c.sections.length > 0)
        ? c.sections
        : null;

      if (loadedSections) {
        setContentSections(loadedSections);
      }

      // 6. Fast Credits Initialization
      if (c.credits) {
        setCredits({
          remaining: Number(c.credits.total || 0) - Number(c.credits.consumed || 0),
          consumed: Number(c.credits.consumed || 0),
          total: Number(c.credits.total || 0),
        });
      }

      // Fetch credits & history asynchronously without blocking
      const learnerId = c.learners?.[0]?.id;
      fetch(`/api/v1/credits?courseId=${courseId}${learnerId ? `&learnerId=${learnerId}` : ''}&history=true`)
        .then(async (res) => {
          if (res.ok) {
            const credData = await res.json();
            const cred = credData.data?.credit || credData.credit;
            if (cred) {
              setCredits({
                remaining: Number(cred.total || 0) - Number(cred.consumed || 0),
                consumed: Number(cred.consumed || 0),
                total: Number(cred.total || 0),
              });
            }
            setCreditHistory(credData.data?.history || credData.history || []);
          }
        })
        .catch((e) => console.error('Credit load error:', e));

    } catch (err) {
      console.error('Failed to load course workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  // Handle Poll / Quiz Vote
  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/timeline/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId }),
      });
      if (res.ok) {
        const json = await res.json();
        const voteRes = json.data || json;
        // Update local timeline posts
        setTimelinePosts((prev) =>
          prev.map((post) => {
            if (post.poll && post.poll.id === pollId) {
              return {
                ...post,
                poll: {
                  ...post.poll,
                  totalVotes: voteRes.totalVotes ?? (post.poll.totalVotes || 0) + 1,
                  userVotedOptionId: optionId,
                  options: voteRes.options || post.poll.options,
                },
              };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  // Handle Cancel Session
  const handleCancelSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, status: 'cancelled' } : s))
        );
      }
    } catch (err) {
      console.error('Failed to cancel session:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: courseNameInput,
          subject: courseSubjectInput,
          grade: courseGradeInput,
          board: courseBoardInput,
          curriculum: courseBoardInput,
          status: courseStatusInput,
        }),
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500">Loading course workspace...</p>
      </div>
    );
  }

  const learner = course?.learners?.[0] || null;
  const primaryEducator = educators?.[0] || course?.educators?.[0] || null;

  // Group sessions into Upcoming and Completed/Past
  const now = new Date();
  const upcomingSessions = sessions.filter(
    (s) => new Date(s.scheduledAt || s.startTime) >= now && s.status !== 'cancelled'
  );
  const completedSessions = sessions.filter(
    (s) => new Date(s.scheduledAt || s.startTime) < now || s.status === 'completed'
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Header matching Screenshot 001 */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 sticky top-0 z-30 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (userRole === 'learner') router.push('/student/courses');
                else router.push('/admin/courses/1-on-1');
              }}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to courses"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {course?.name || '1-on-1 Personalisation Course'}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  1-on-1
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {course?.grade || 'Grade 9'} • {course?.subject || 'Physics'} • {course?.board || (typeof course?.curriculum === 'string' ? course?.curriculum : 'Cambridge IGCSE')}
              </p>
            </div>
          </div>

          {/* Action buttons on right (Screenshot 001) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              Download Session Report
            </button>

            {userRole !== 'learner' && (
              <button
                onClick={() => router.push(`/admin/courses/1-on-1/${courseId}/schedule`)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                Schedule Sessions
              </button>
            )}
          </div>
        </div>

        {/* 5 Tabs (Screenshot 001): Home, Timeline, Content, Billing, Settings */}
        <div className="max-w-7xl mx-auto flex items-center gap-8 mt-5 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
          {[
            { id: 'home', label: 'Home' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'content', label: 'Content' },
            { id: 'billing', label: 'Billing' },
            ...(userRole !== 'learner' ? [{ id: 'settings', label: 'Settings' }] : []),
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative pb-2 text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-6 flex-1">
        {/* ===================== TAB 1: HOME ===================== */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Sessions List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Sessions Section */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Upcoming Sessions
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                    {upcomingSessions.length} Scheduled
                  </span>
                </div>

                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <p className="text-sm text-neutral-500">No upcoming sessions scheduled.</p>
                    {userRole !== 'learner' && (
                      <button
                        onClick={() => router.push(`/admin/courses/1-on-1/${courseId}/schedule`)}
                        className="mt-3 px-4 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Schedule session now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => {
                      const d = new Date(session.scheduledAt || session.startTime);
                      const dayNumber = d.getDate();
                      const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                      const timeStr = d.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });

                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition"
                        >
                          <div className="flex items-center gap-4">
                            {/* Date Badge */}
                            <div className="w-12 h-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-xs">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase leading-none">
                                {monthStr}
                              </span>
                              <span className="text-lg font-extrabold text-neutral-900 dark:text-white leading-tight">
                                {dayNumber}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                                  {session.title || '1-on-1 Physics Session'}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                  Scheduled
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                {timeStr} ({session.durationMin || 60} mins) • Educator: {session.educatorName || primaryEducator.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {session.zoomMeetingUrl || session.meetingUrl ? (
                              <a
                                href={session.zoomMeetingUrl || session.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-xs transition"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Join Call
                              </a>
                            ) : null}

                            <button
                              onClick={() => setSelectedSessionForDetails(session)}
                              className="p-1.5 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition"
                              title="Session details"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past / Completed Sessions Section */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Completed Sessions
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {completedSessions.length} Conducted
                  </span>
                </div>

                {completedSessions.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-6">No completed sessions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {completedSessions.map((session) => {
                      const d = new Date(session.scheduledAt || session.startTime);
                      const dayNumber = d.getDate();
                      const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                      const timeStr = d.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });

                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            {/* Date Badge */}
                            <div className="w-12 h-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-xs">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase leading-none">
                                {monthStr}
                              </span>
                              <span className="text-lg font-extrabold text-neutral-900 dark:text-white leading-tight">
                                {dayNumber}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                                  {session.title || '1-on-1 Physics Session'}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                                  Completed
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                {timeStr} • Credits: {session.creditsConsumed || 1} • Educator: {session.educatorName || primaryEducator?.name || 'Educator'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {session.recordingUrl && (
                              <button
                                onClick={() =>
                                  setSelectedVideo({
                                    title: session.title,
                                    url: session.recordingUrl,
                                    date: d.toLocaleDateString(),
                                    educatorName: session.educatorName || primaryEducator?.name || 'Educator',
                                  })
                                }
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg flex items-center gap-1.5 transition"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                                Recording
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedSessionForDetails(session)}
                              className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 rounded-lg transition"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Credits Widget, Learner Card, Educator Card, Admin Card */}
            <div className="space-y-6">
              {/* Session Credits Widget (Screenshot 001, 016) */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Session Credits</h2>
                  <div className="flex items-center gap-1.5">
                    {userRole !== 'learner' && (
                      <button
                        onClick={() => setIsManageCreditsModalOpen(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      >
                        Manage
                      </button>
                    )}
                    <button
                      onClick={() => setIsCreditsHistoryModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                    >
                      History
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl mb-4">
                  <div>
                    <span className="block text-2xl font-black text-neutral-900 dark:text-white">
                      {credits.remaining?.toFixed(2) || '0.00'}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500">Remaining</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-neutral-900 dark:text-white">
                      {credits.consumed?.toFixed(2) || '0.00'}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500">Consumed</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-neutral-900 dark:text-white">
                      {credits.total?.toFixed(2) || '0.00'}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500">Total</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((credits.consumed || 0) / (credits.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>{(((credits.consumed || 0) / (credits.total || 1)) * 100).toFixed(0)}% consumed</span>
                    <span>{credits.remaining} sessions left</span>
                  </div>
                </div>
              </div>

              {/* Learner Card */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Enrolled Learner
                  </h2>
                  {userRole !== 'learner' && !learner && (
                    <button
                      onClick={() => setIsManageCreditsModalOpen(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      + Enroll
                    </button>
                  )}
                </div>
                {learner ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold flex items-center justify-center text-base shadow-sm">
                      {learner.name?.slice(0, 2).toUpperCase() || 'SY'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {learner.name}
                      </h3>
                      <p className="text-xs text-neutral-500">{learner.email}</p>
                      {learner.phone && <p className="text-xs text-neutral-400 mt-0.5">{learner.phone}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-2">
                    <p className="text-xs text-neutral-400">No learner enrolled yet.</p>
                    <button
                      onClick={() => setIsManageCreditsModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 transition inline-block"
                    >
                      + Assign Learner & Credits
                    </button>
                  </div>
                )}
              </div>

              {/* Educators Card */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Assigned Educators
                  </h2>
                  {userRole !== 'learner' && (
                    <button
                      onClick={() => setIsAddEducatorModalOpen(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      + Add Educator
                    </button>
                  )}
                </div>

                {educators.length > 0 ? (
                  <div className="space-y-3">
                    {educators.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {edu.name?.slice(0, 2).toUpperCase() || 'ED'}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                              {edu.name}
                            </h3>
                            <p className="text-xs text-neutral-500">{edu.email}</p>
                            {edu.payoutRateOverride && (
                              <span className="inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md">
                                Payout: ₹{edu.payoutRateOverride}/hr
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-2">
                    <p className="text-xs text-neutral-400">No educators assigned yet.</p>
                    <button
                      onClick={() => setIsAddEducatorModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 transition inline-block"
                    >
                      + Assign Educator
                    </button>
                  </div>
                )}
              </div>

              {/* Admin / Manager Card */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  Course Manager
                </h2>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white font-bold flex items-center justify-center text-base shadow-sm">
                    MK
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Ms. Khushi
                    </h3>
                    <p className="text-xs text-neutral-500">Academic Counselor & Admin</p>
                    <p className="text-xs text-neutral-400 mt-0.5">khushi@unboundyou.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: TIMELINE ===================== */}
        {activeTab === 'timeline' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Action bar (Screenshots 020, 021) */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-neutral-500">
                Share updates, voice notes, or quizzes with the learner
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsChitChatModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Create Chit chat
                </button>
                <button
                  onClick={() => setIsPollQuizModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Add Poll/Quiz
                </button>
              </div>
            </div>

            {/* Timeline Feed */}
            {timelinePosts.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-12 text-center">
                <MessageSquare className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                  No timeline posts yet
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Start the conversation by posting a voice chit-chat, learning resource, or interactive quiz.
                </p>
              </div>
            ) : (
              timelinePosts.map((post) => {
                const isPoll = !!post.poll;
                const isQuiz = post.poll?.isQuizMode;

                return (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4"
                  >
                    {/* Post Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {post.authorName?.slice(0, 2).toUpperCase() || 'UB'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900 dark:text-white">
                              {post.authorName || 'Educator'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              {post.authorRole || 'Teacher'}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400">
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {isPoll && (
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isQuiz
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {isQuiz ? 'Quiz Challenge' : 'Poll'}
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    {post.body && !isPoll && (
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {post.body}
                      </p>
                    )}

                    {/* Voice audio player if audioUrl */}
                    {post.audioUrl && (
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-700 flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <audio src={post.audioUrl} controls className="w-full h-8" />
                      </div>
                    )}

                    {/* File Attachments */}
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {post.attachments.map((file: any, i: number) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 rounded-lg transition"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Poll / Quiz rendering */}
                    {isPoll && post.poll && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                          {post.poll.question || post.body}
                        </h4>

                        <div className="space-y-2">
                          {post.poll.options?.map((opt: any) => {
                            const isVoted = post.poll.userVotedOptionId === opt.id;
                            const showResults = post.poll.totalVotes > 0 || isVoted;
                            const isCorrectOption = opt.isCorrect;

                            return (
                              <div
                                key={opt.id}
                                onClick={() => !post.poll.userVotedOptionId && handleVote(post.poll.id, opt.id)}
                                className={`relative p-3 rounded-xl border text-xs font-medium transition overflow-hidden ${
                                  post.poll.userVotedOptionId ? 'cursor-default' : 'cursor-pointer hover:border-blue-400'
                                } ${
                                  isVoted
                                    ? isQuiz && isCorrectOption
                                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                                      : isQuiz && !isCorrectOption
                                      ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20'
                                      : 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30'
                                }`}
                              >
                                {/* Percentage bar background */}
                                {showResults && (
                                  <div
                                    className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${
                                      isQuiz && isCorrectOption
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                        : 'bg-blue-100 dark:bg-blue-900/30'
                                    }`}
                                    style={{ width: `${opt.pct || 0}%` }}
                                  />
                                )}

                                <div className="relative flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isVoted
                                          ? isQuiz && isCorrectOption
                                            ? 'border-emerald-600 bg-emerald-600 text-white'
                                            : isQuiz && !isCorrectOption
                                            ? 'border-red-600 bg-red-600 text-white'
                                            : 'border-blue-600 bg-blue-600 text-white'
                                          : 'border-neutral-300 dark:border-neutral-600'
                                      }`}
                                    >
                                      {isVoted && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-neutral-900 dark:text-white font-medium">
                                      {opt.body}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isQuiz && isVoted && isCorrectOption && (
                                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Correct
                                      </span>
                                    )}
                                    {isQuiz && isVoted && !isCorrectOption && (
                                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                        ✕ Incorrect
                                      </span>
                                    )}
                                    {showResults && (
                                      <span className="font-bold text-neutral-600 dark:text-neutral-400">
                                        {opt.pct || 0}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-neutral-400 pt-2">
                          <span>{post.poll.totalVotes || 0} total responses</span>
                          {isQuiz && <span>Quiz Mode Active</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ===================== TAB 3: CONTENT ===================== */}
        {activeTab === 'content' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header matching Screenshot 023 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Curriculum & Learning Content
                </h2>
                <p className="text-xs text-neutral-500">
                  Manage syllabus units, reading materials, problem sets, and session recordings.
                </p>
              </div>
            </div>

            {/* Curriculum Sections Accordion */}
            <div className="space-y-4">
              {contentSections.map((sec, secIdx) => (
                <div
                  key={sec.id || secIdx}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs"
                >
                  <div className="p-4 bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-xs">
                        0{secIdx + 1}
                      </div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {sec.title}
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium">
                      {sec.resources?.length || 0} Resources
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {sec.resources?.map((res: any, resIdx: number) => (
                      <div
                        key={res.id || resIdx}
                        className="p-3 flex items-center justify-between hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 rounded-xl transition"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
                              {res.title}
                            </h4>
                            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                              {res.type || 'DOCUMENT'}
                            </span>
                          </div>
                        </div>

                        {res.externalUrl && res.externalUrl !== '#' ? (
                          <a
                            href={res.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center gap-1 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400 px-3 py-1">View</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Dedicated Session Recordings Accordion (Screenshot 023) */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Session Recordings Archive
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Class recordings with AI generated summaries and video replay.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-semibold">
                    {completedSessions.length} Videos
                  </span>
                </div>

                <div className="p-2 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {completedSessions.map((session, idx) => (
                    <div
                      key={session.id || idx}
                      className="p-3.5 flex items-center justify-between hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-blue-600 shrink-0">
                          <PlayCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                            {session.title}
                          </h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {new Date(session.scheduledAt || session.startTime).toLocaleDateString()} • Conducted by {session.educatorName || primaryEducator.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setSelectedVideo({
                              title: session.title,
                              url: session.recordingUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
                              date: new Date(session.scheduledAt || session.startTime).toLocaleDateString(),
                              educatorName: session.educatorName || primaryEducator.name,
                            })
                          }
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition shadow-xs"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Watch Recording
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: BILLING ===================== */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Package Summary Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    1-on-1 Personalisation Package
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Prepaid credit plan for personalized 1-on-1 tutoring sessions.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                  Active Subscription
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                  <span className="text-xs text-neutral-500 font-medium">Session Rate</span>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white mt-1">₹1,200</p>
                  <span className="text-[10px] text-neutral-400">per 1 credit / session</span>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                  <span className="text-xs text-neutral-500 font-medium">Package Size</span>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white mt-1">
                    {credits.total} Sessions
                  </p>
                  <span className="text-[10px] text-neutral-400">₹{credits.total * 1200} Total Package</span>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                  <span className="text-xs text-neutral-500 font-medium">Available Balance</span>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    {credits.remaining} Credits
                  </p>
                  <span className="text-[10px] text-neutral-400">Ready to schedule</span>
                </div>
              </div>
            </div>

            {/* Credit Ledger Transactions Table (Screenshot 016) */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Credit Ledger & Transaction Statement
                </h3>
                {userRole !== 'learner' && (
                  <button
                    onClick={() => setIsManageCreditsModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    + Adjust Credits
                  </button>
                )}
              </div>

              {creditHistory.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase font-semibold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Credits</th>
                        <th className="py-2.5 px-3">Balance After</th>
                        <th className="py-2.5 px-3">Reference / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                      {creditHistory.map((item) => {
                        const isAdd = item.changeAmount > 0;
                        return (
                          <tr key={item.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30">
                            <td className="py-3 px-3 text-neutral-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isAdd
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                }`}
                              >
                                {item.transactionType?.replace('_', ' ')}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-3 font-bold ${
                                isAdd ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {isAdd ? `+${item.changeAmount}` : item.changeAmount}
                            </td>
                            <td className="py-3 px-3 text-neutral-900 dark:text-white font-bold">
                              {item.balanceAfter}
                            </td>
                            <td className="py-3 px-3 text-neutral-500 max-w-xs truncate">
                              {item.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: SETTINGS ===================== */}
        {activeTab === 'settings' && userRole !== 'learner' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Course Configuration
              </h2>

              {settingsSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Course settings successfully updated!
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Course Name
                  </label>
                  <input
                    type="text"
                    value={courseNameInput}
                    onChange={(e) => setCourseNameInput(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={courseSubjectInput}
                      onChange={(e) => setCourseSubjectInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Grade
                    </label>
                    <input
                      type="text"
                      value={courseGradeInput}
                      onChange={(e) => setCourseGradeInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Curriculum / Board
                  </label>
                  <input
                    type="text"
                    value={courseBoardInput}
                    onChange={(e) => setCourseBoardInput(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Primary Educator
                  </label>
                  <CustomSelect
                    value={selectedEducatorId}
                    onChange={(val) => setSelectedEducatorId(val as string)}
                    options={
                      educators.length > 0
                        ? educators.map((e) => ({
                            value: e.id,
                            label: `${e.name} (${e.email})`,
                          }))
                        : [{ value: primaryEducator.id, label: primaryEducator.name }]
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Status
                  </label>
                  <CustomSelect
                    value={courseStatusInput}
                    onChange={(val) => setCourseStatusInput(val as string)}
                    options={[
                      { value: 'active', label: 'Active (Ongoing)' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== ALL INTEGRATED MODALS ===================== */}

      {/* 1. Download Session Report Modal (Screenshot 003, 004) */}
      <DownloadSessionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        courseId={courseId}
        courseName={course?.name}
      />

      {/* 2. Manage Credits Modal (Screenshot 018, 019) */}
      <ManageCreditsModal
        isOpen={isManageCreditsModalOpen}
        onClose={() => setIsManageCreditsModalOpen(false)}
        courseId={courseId}
        learnerId={learner?.id}
        onSuccess={fetchData}
      />

      {/* 3. Session Credits Ledger History Modal (Screenshot 016) */}
      <SessionCreditsModal
        isOpen={isCreditsHistoryModalOpen}
        onClose={() => setIsCreditsHistoryModalOpen(false)}
        remainingCredits={credits.remaining}
        consumedCredits={credits.consumed}
        totalCredits={credits.total}
        courseName={course?.name || ''}
        history={creditHistory}
        onOpenManage={() => {
          setIsCreditsHistoryModalOpen(false);
          setIsManageCreditsModalOpen(true);
        }}
      />

      {/* 4. Add Educator Modal (Screenshot 017) */}
      <AddEducatorModal
        isOpen={isAddEducatorModalOpen}
        onClose={() => setIsAddEducatorModalOpen(false)}
        courseId={courseId}
        courseName={course?.name || ''}
        assignedEducators={educators}
        onUpdated={fetchData}
      />

      {/* 5. Add Poll / Quiz Modal (Screenshot 020) */}
      <AddPollQuizModal
        isOpen={isPollQuizModalOpen}
        onClose={() => setIsPollQuizModalOpen(false)}
        courseId={courseId}
        onPollCreated={(newPost) => {
          if (newPost) {
            setTimelinePosts((prev) => [newPost, ...prev]);
          }
          fetchData();
        }}
      />

      {/* 6. Create Chit Chat Modal (Screenshot 021, 022) */}
      <CreateChitChatModal
        isOpen={isChitChatModalOpen}
        onClose={() => setIsChitChatModalOpen(false)}
        courseId={courseId}
        onCreated={(newPost) => {
          if (newPost) {
            setTimelinePosts((prev) => [newPost, ...prev]);
          }
          fetchData();
        }}
      />

      {/* 7. Session Details Modal (Screenshot 013) */}
      <SessionDetailsModal
        isOpen={!!selectedSessionForDetails}
        onClose={() => setSelectedSessionForDetails(null)}
        session={selectedSessionForDetails}
        courseName={course?.name || ''}
        onSessionUpdated={fetchData}
      />

      {/* 8. Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          title={selectedVideo.title}
          videoUrl={selectedVideo.url}
          date={selectedVideo.date}
          educatorName={selectedVideo.educatorName}
        />
      )}
    </div>
  );
}
