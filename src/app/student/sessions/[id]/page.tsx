'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  ArrowLeft,
  Users,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
  Loader2,
  Coins,
  BookOpen,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface SessionDetail {
  id: string;
  title: string;
  topic?: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  zoomMeetingUrl?: string | null;
  creditsConsumed?: string | null;
  courseId: string;
  educatorId: string;
  courseName?: string;
  educatorName?: string;
  educatorEmail?: string;
  educatorAvatar?: string | null;
  aiSummary?: string | null;
}

interface SessionFeedback {
  id: string;
  topicsCovered?: string | null;
  comments?: string | null;
  homeworkAssigned?: string | null;
  creditsConsumed?: string | null;
  createdAt: string;
}

export default function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [sessionData, setSessionData] = useState<SessionDetail | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sessRes, fbRes] = await Promise.all([
        fetch(`/api/v1/sessions/${id}`),
        fetch(`/api/v1/sessions/${id}/feedback`),
      ]);

      if (!sessRes.ok) {
        throw new Error('Session not found');
      }

      const sessJson = await sessRes.json();
      setSessionData(sessJson.data);

      if (fbRes.ok) {
        const fbJson = await fbRes.json();
        setFeedback(fbJson.data || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-neutral-400">Loading session workspace...</p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {error || 'Session not found'}
        </h2>
        <div className="flex justify-center gap-3">
          <Link
            href="/student/dashboard"
            className="px-4 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/student/sessions"
            className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl"
          >
            All Sessions
          </Link>
        </div>
      </div>
    );
  }

  const d = new Date(sessionData.scheduledAt);
  const endD = new Date(d.getTime() + (sessionData.durationMin || 60) * 60000);
  const dateFormatted = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeFormatted = `${d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endD.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const isLive = sessionData.status === 'live';
  const isCompleted = sessionData.status === 'completed';
  const isUpcoming = !isLive && !isCompleted && sessionData.status !== 'cancelled';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <Link
          href="/student/sessions"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all sessions
        </Link>
      </div>

      {/* Hero Session Card */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {sessionData.title}
              </h1>
              {isLive ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Now
                </span>
              ) : isCompleted ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  Completed
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Upcoming
                </span>
              )}
            </div>

            {sessionData.courseName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Course:{' '}
                <Link
                  href={`/student/courses/${sessionData.courseId}`}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {sessionData.courseName}
                </Link>
              </p>
            )}
          </div>

          {/* Join Call button if live or upcoming */}
          {(isLive || isUpcoming) && (
            <div>
              {sessionData.zoomMeetingUrl ? (
                <a
                  href={sessionData.zoomMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  <Video className="w-4 h-4" />
                  Join Live Session
                </a>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700">
                  Meeting link will appear before session
                </span>
              )}
            </div>
          )}
        </div>

        {/* Date, Time & Credits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-neutral-800/40 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Date</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{dateFormatted}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-neutral-800/40 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Time ({sessionData.durationMin}m)</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{timeFormatted}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-neutral-800/40 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Credits Deducted</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                {sessionData.creditsConsumed || '1.00'} Credit
              </p>
            </div>
          </div>
        </div>

        {/* Educator Information */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-gray-100 dark:border-neutral-800">
          <UserAvatar
            src={sessionData.educatorAvatar}
            alt={sessionData.educatorName || 'Educator'}
            initials={(sessionData.educatorName || 'ED').slice(0, 2).toUpperCase()}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Session Educator</p>
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              {sessionData.educatorName || 'Assigned Educator'}
            </p>
            {sessionData.educatorEmail && (
              <p className="text-[11px] text-gray-500">{sessionData.educatorEmail}</p>
            )}
          </div>
        </div>

        {/* Topic & Agenda */}
        {sessionData.topic && (
          <div className="space-y-1 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Agenda & Topics
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50/60 dark:bg-neutral-800/30 p-3.5 rounded-xl border border-gray-100 dark:border-neutral-800">
              {sessionData.topic}
            </p>
          </div>
        )}

        {/* Feedback from Educator */}
        {feedback && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Educator Feedback & Homework
            </h3>
            <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2 text-xs">
              {feedback.topicsCovered && (
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">Topics Covered: </span>
                  <span className="text-gray-700 dark:text-gray-300">{feedback.topicsCovered}</span>
                </div>
              )}
              {feedback.comments && (
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">Remarks: </span>
                  <span className="text-gray-700 dark:text-gray-300">{feedback.comments}</span>
                </div>
              )}
              {feedback.homeworkAssigned && (
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">Homework Assigned: </span>
                  <span className="text-gray-700 dark:text-gray-300">{feedback.homeworkAssigned}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Summary if generated */}
        {sessionData.aiSummary && (
          <div className="space-y-1 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
              Class Revision Summary
            </h3>
            <div className="p-4 rounded-xl bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {sessionData.aiSummary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
