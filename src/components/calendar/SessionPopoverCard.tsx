'use client';

import React from 'react';
import { Video, User, Type, X } from 'lucide-react';

export interface CalendarSessionItem {
  id: string;
  title: string;
  topic?: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  zoomMeetingUrl?: string | null;
  zoomMeetingId?: string | null;
  courseName?: string | null;
  educatorName?: string;
  learnerNames?: string[];
  creditsConsumed?: string | number | null;
  aiSummary?: string | null;
  recordingUrl?: string | null;
}

interface SessionPopoverCardProps {
  session: CalendarSessionItem;
  onClose: () => void;
  onViewSession: () => void;
  onEditSession?: () => void;
  userRole?: string;
}

export function SessionPopoverCard({
  session,
  onClose,
  onViewSession,
  onEditSession,
  userRole = 'educator',
}: SessionPopoverCardProps) {
  const startDate = new Date(session.scheduledAt);
  const endDate = new Date(startDate.getTime() + (session.durationMin || 60) * 60 * 1000);

  const timeRange = `${startDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })} - ${endDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;

  const isCompleted = session.status === 'completed';
  const isCancelled = session.status === 'cancelled';
  const isUpcoming = !isCompleted && !isCancelled;
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  const getStatusBadge = () => {
    switch (session.status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
            Cancelled
          </span>
        );
      case 'live':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Live Now
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Upcoming
          </span>
        );
    }
  };

  const learnerDisplay =
    session.learnerNames && session.learnerNames.length > 0
      ? session.learnerNames.join(', ')
      : session.courseName || session.title;

  return (
    <div
      className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-5 w-80 text-gray-900 dark:text-gray-100 z-50 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-gray-950 dark:text-white leading-tight break-words">
            {session.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {session.courseName || session.title}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {getStatusBadge()}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta rows */}
      <div className="space-y-2.5 my-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
          <Video className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <span className="font-semibold">{timeRange}</span>
        </div>

        <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
          <User className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <span className="font-medium">{session.educatorName || 'Faculty Member'}</span>
        </div>

        <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
          <span className="w-4 text-center font-bold text-xs text-gray-500 dark:text-gray-400 shrink-0">Aa</span>
          <span className="font-medium truncate">{learnerDisplay}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onViewSession}
          className={`py-2 px-3 text-xs font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-center active:scale-95 shadow-2xs cursor-pointer ${
            isCompleted || isCancelled || !isAdmin ? 'w-full' : 'flex-1'
          }`}
        >
          View Session
        </button>

        {/* Edit is ONLY available for Admins on upcoming/editable sessions */}
        {isAdmin && isUpcoming && onEditSession && (
          <button
            type="button"
            onClick={onEditSession}
            className="flex-1 py-2 px-3 text-xs font-bold text-white bg-[#1A2234] hover:bg-[#121826] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-all text-center active:scale-95 shadow-2xs cursor-pointer"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
