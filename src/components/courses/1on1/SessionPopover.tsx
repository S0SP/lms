'use client';

import React from 'react';
import { X, Clock, Calendar, User, Video, Edit, Eye, Trash2 } from 'lucide-react';

export interface CalendarSessionItem {
  id: string;
  title: string;
  courseId: string;
  courseName?: string;
  educatorId?: string;
  educatorName?: string;
  studentId?: string;
  studentName?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS';
  meetingUrl?: string;
  recordingUrl?: string;
  tags?: string[];
  aiSummary?: string;
  creditsDeducted?: number;
}

interface SessionPopoverProps {
  session: CalendarSessionItem | null;
  position?: { top: number; left: number };
  onClose: () => void;
  onViewSession: (session: CalendarSessionItem) => void;
  onEditSession?: (session: CalendarSessionItem) => void;
  onCancelSession?: (sessionId: string) => void;
}

export function SessionPopover({
  session,
  position,
  onClose,
  onViewSession,
  onEditSession,
  onCancelSession,
}: SessionPopoverProps) {
  if (!session) return null;

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = `${startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })} - ${endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

  const isCompleted = session.status === 'COMPLETED';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center sm:block sm:inset-auto bg-black/40 sm:bg-transparent"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={
          position && window.innerWidth >= 640
            ? {
                position: 'fixed',
                top: Math.min(position.top, window.innerHeight - 320),
                left: Math.min(position.left, window.innerWidth - 340),
              }
            : undefined
        }
        className="w-[320px] bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden p-4 text-white animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {session.status}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {session.title || '1-on-1 Session'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details list */}
        <div className="py-3 space-y-2 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{timeStr}</span>
          </div>
          {session.educatorName && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Educator: <strong className="text-white">{session.educatorName}</strong></span>
            </div>
          )}
          {session.studentName && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Learner: <strong className="text-white">{session.studentName}</strong></span>
            </div>
          )}
        </div>

        {/* Buttons / Actions */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewSession(session);
            }}
            className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            View Session
          </button>

          {onEditSession && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditSession(session);
              }}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition"
              title="Edit session"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}

          {onCancelSession && session.status !== 'CANCELLED' && !isCompleted && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to cancel this session?')) {
                  onCancelSession(session.id);
                  onClose();
                }
              }}
              className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 rounded-lg transition"
              title="Cancel session"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
