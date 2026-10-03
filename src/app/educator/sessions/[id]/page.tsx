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
  MessageSquare,
  Loader2,
} from 'lucide-react';
import SessionFeedbackModal from '@/components/educator/modals/SessionFeedbackModal';

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
  attendees: Array<{
    learnerId: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    grade?: string | null;
    board?: string | null;
  }>;
}

interface SessionFeedback {
  id: string;
  topicsCovered?: string | null;
  comments?: string | null;
  homeworkAssigned?: string | null;
  creditsConsumed?: string | null;
  createdAt: string;
}

export default function EducatorSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [sessionData, setSessionData] = useState<SessionDetail | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
            {error || 'Session not found'}
          </h2>
          <Link
            href="/educator/calendar"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Calendar
          </Link>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(sessionData.scheduledAt);
  const isCompleted = sessionData.status === 'completed';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/educator/calendar"
          className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Calendar
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium truncate">
          {sessionData.title}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {sessionData.status}
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {sessionData.durationMin} mins
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sessionData.title}
            </h1>
            {sessionData.topic && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Topic: {sessionData.topic}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {sessionData.zoomMeetingUrl ? (
              <a
                href={sessionData.zoomMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                <Video className="w-4 h-4" />
                Join Class
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ) : (
              <button
                disabled
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg font-medium text-sm flex items-center gap-2 cursor-not-allowed"
              >
                <Video className="w-4 h-4" /> No Zoom Link
              </button>
            )}

            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {feedback ? 'Update Feedback' : 'Submit Feedback'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Date</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {scheduledDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Time</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {scheduledDate.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Credits</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {sessionData.creditsConsumed ?? '1'} credits consumed
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendees Section */}
        <div className="lg:col-span-1 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
            <span>Enrolled Learners</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full font-medium text-gray-500">
              {sessionData.attendees?.length || 0}
            </span>
          </h2>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {sessionData.attendees && sessionData.attendees.length > 0 ? (
              sessionData.attendees.map((att) => (
                <div key={att.learnerId} className="py-3 flex items-center gap-3">
                  {att.avatarUrl ? (
                    <img
                      src={att.avatarUrl}
                      alt={att.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                      {att.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {att.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {att.email}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-xs text-gray-400 text-center">
                No learners assigned to this session.
              </p>
            )}
          </div>
        </div>

        {/* Feedback & Session Log Section */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Educator Feedback & Notes
            </h2>
            {feedback && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 rounded-full">
                Submitted
              </span>
            )}
          </div>

          {feedback ? (
            <div className="space-y-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 border border-gray-200 dark:border-gray-800 text-sm">
              {feedback.topicsCovered && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Topics Covered
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">{feedback.topicsCovered}</p>
                </div>
              )}

              {feedback.homeworkAssigned && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Homework / Exercises
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">{feedback.homeworkAssigned}</p>
                </div>
              )}

              {feedback.comments && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Internal Educator Notes
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">{feedback.comments}</p>
                </div>
              )}

              <div className="pt-2 text-xs text-gray-400">
                Credits deducted:{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {feedback.creditsConsumed ?? '1'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
              <FileText className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No feedback has been submitted for this session yet.
              </p>
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
              >
                Submit Feedback Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      <SessionFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        sessionId={sessionData.id}
        sessionTitle={`Feedback: ${sessionData.title}`}
        defaultCredits={Number(sessionData.creditsConsumed ?? 1)}
        onSuccess={fetchSessionDetails}
      />
    </div>
  );
}
