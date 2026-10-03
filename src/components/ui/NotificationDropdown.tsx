'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, BookOpen, Calendar, AlertTriangle, UserPlus, CreditCard, BarChart2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  type: string;
  payloadJson: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

// ── Icon resolver — maps notification type → icon + color ────────────────────
function resolveIcon(type: string) {
  if (type.includes('enrollment') || type.includes('new_student')) return { Icon: UserPlus, color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' };
  if (type.includes('session') && type.includes('complete')) return { Icon: CheckCircle2, color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' };
  if (type.includes('session')) return { Icon: Calendar, color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' };
  if (type.includes('credit') || type.includes('payment')) return { Icon: CreditCard, color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' };
  if (type.includes('report') || type.includes('analytics')) return { Icon: BarChart2, color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' };
  if (type.includes('alert') || type.includes('conflict') || type.includes('warning')) return { Icon: AlertTriangle, color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' };
  return { Icon: BookOpen, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function humaniseType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPayloadMessage(n: NotificationItem): string {
  const p = n.payloadJson ?? {};
  // Try common payload fields
  if (typeof p.message === 'string' && p.message) return p.message;
  if (typeof p.description === 'string' && p.description) return p.description;
  if (typeof p.body === 'string' && p.body) return p.body;
  // Fallback by type
  if (n.type.includes('session_reminder')) return 'Your upcoming session is starting soon.';
  if (n.type.includes('session_complete')) return 'Session concluded. Recording will be available shortly.';
  if (n.type.includes('enrollment')) return 'A new student has enrolled in your course.';
  if (n.type.includes('credit_low')) return 'Account credit balance is running low.';
  return humaniseType(n.type);
}

// ── Empty state matching the reference design ─────────────────────────────────
function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      {/* Inbox tray icon — exact match to reference */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        className="mb-3 opacity-60"
        aria-hidden="true"
      >
        {/* Shimmer lines */}
        <line x1="10" y1="28" x2="22" y2="28" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="28" x2="54" y2="28" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="34" x2="22" y2="34" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="34" x2="50" y2="34" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        {/* Sunbeam rays */}
        <line x1="32" y1="8" x2="32" y2="14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="12" x2="23" y2="17" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="44" y1="12" x2="41" y2="17" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        {/* Inbox tray body */}
        <rect x="14" y="24" width="36" height="28" rx="3" stroke="#475569" strokeWidth="2" fill="white" className="dark:fill-[#1E2535]" />
        {/* Tray pocket / cut-out */}
        <path d="M14 40 L22 40 C22 43 25 46 32 46 C39 46 42 43 42 40 L50 40" stroke="#475569" strokeWidth="2" fill="none" />
        {/* Paper inside */}
        <rect x="22" y="30" width="20" height="2" rx="1" fill="#94A3B8" />
        <rect x="24" y="34" width="16" height="2" rx="1" fill="#CBD5E1" />
      </svg>
      <p className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">No notifications</p>
      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1 text-center max-w-[180px]">
        You&apos;re all caught up! Check back later.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface NotificationDropdownProps {
  /** Accent color for the bell dot and role badge (tailwind class) */
  accentClass?: string;
  /** Role-specific view all link */
  viewAllHref?: string;
}

export function NotificationDropdown({
  accentClass = 'bg-red-500',
  viewAllHref,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/notifications?limit=20');
      if (res.ok) {
        const json = await res.json();
        setItems(json.data?.items ?? []);
        setUnreadCount(json.data?.unreadCount ?? 0);
      }
    } catch {
      // silent — don't break the header
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = useCallback(() => {
    setOpen((prev) => !prev);
    if (!open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/v1/notifications', { method: 'PATCH' });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-9 h-9 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative shrink-0"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 min-w-[8px] h-2 ${accentClass} rounded-full border-2 border-white dark:border-[#0A0A0A] flex items-center justify-center`}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-[#161B26]">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <EmptyNotifications />
            ) : (
              items.map((n) => {
                const { Icon, color } = resolveIcon(n.type);
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className={`p-4 border-b border-gray-100 dark:border-gray-800/50 flex gap-3 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                      isUnread ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5 truncate">
                        {humaniseType(n.type)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {getPayloadMessage(n)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                    {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {viewAllHref && items.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161B26]">
              <a
                href={viewAllHref}
                className="block w-full py-2 text-sm font-medium text-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
