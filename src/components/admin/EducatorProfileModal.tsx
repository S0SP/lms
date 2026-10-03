'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Eye,
  Edit2,
  Mail,
  Phone,
  Key,
  Plus,
  MoreVertical,
  Calendar as CalendarIcon,
  Clock,
  Users,
  PlayCircle,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  Check,
  CalendarX,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  AvailabilityScheduleTab,
  AvailabilityLeavesTab,
} from '@/components/educator/AvailabilityClient';
import { CustomSelect } from '@/components/ui/CustomSelect';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface EducatorDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  numericId: string;
  subjectBadge: string;
  tagline: string | null;
  about: string | null;
  youtubeUrl: string | null;
  coverPhotoUrl: string | null;
  tags: string[];
  reviews: Array<{
    id: string;
    studentName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
  payoutDefaultRate: string;
  payoutCurrency: string;
  payoutDetails: {
    beneficiaryName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    currency?: string;
  };
  bookingPreferences: {
    minNotice?: string;
    bufferTime?: string;
    restrictAdjacent?: boolean;
    limitFuture?: string;
  };
  calendarConnected: boolean;
  coursesAssigned: number;
  allSessionsCount: number;
  upcomingSessionsCount: number;
  pastSessionsCount: number;
  formattedDuration: string;
  sessionMonthlyStats: Array<{
    month: string;
    sessions: number;
    duration: string;
  }>;
  payoutSummary: {
    allSessions: number;
    allPayouts: number;
    inReview: number;
    approved: number;
    currency: string;
  };
  payoutMonthlyStats: Array<{
    month: string;
    paid: number;
    inReview: number;
    currency: string;
  }>;
}

export interface CourseRow {
  id: string;
  name: string;
  typeBadge: string;
  subtitle: string;
  learners: string;
  adminName: string;
  payoutPerCredit: string;
  rawPayoutRate: string;
  currency: string;
  assignedAt: string;
}

export interface SessionItem {
  id: string;
  courseId: string;
  courseName?: string;
  title: string;
  topic?: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  zoomMeetingUrl?: string | null;
  attendeesCount?: number;
  learnersText?: string;
}

export interface CommunicationItem {
  id: string;
  subject: string;
  context: string;
  timestamp: string;
  status: 'Delivered' | 'Sent' | 'Failed';
  channel: 'email' | 'whatsapp' | 'sms';
}

interface EducatorProfileModalProps {
  isOpen: boolean;
  educatorId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

type TabType =
  | 'overview'
  | 'registration'
  | 'courses'
  | 'sessions'
  | 'payouts'
  | 'calendar'
  | 'availability'
  | 'leaves'
  | 'preferences'
  | 'communications';

export function EducatorProfileModal({
  isOpen,
  educatorId,
  onClose,
  onUpdated,
}: EducatorProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [educator, setEducator] = useState<EducatorDetails | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Sub-modal dialogs
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditPayoutCourseOpen, setIsEditPayoutCourseOpen] = useState(false);
  const [selectedCourseForPayout, setSelectedCourseForPayout] = useState<CourseRow | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isPayoutDetailsOpen, setIsPayoutDetailsOpen] = useState(false);
  const [isPublicProfilePreviewOpen, setIsPublicProfilePreviewOpen] = useState(false);

  // Sessions sub-tab
  const [sessionSubTab, setSessionSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessionDateFilter, setSessionDateFilter] = useState<'last30' | 'next30' | 'all'>('next30');
  const [payoutDateFilter, setPayoutDateFilter] = useState<'this-month' | 'last-month' | 'all'>('this-month');

  // Calendar week state
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load educator data
  const loadEducatorData = useCallback(async () => {
    if (!educatorId) return;
    try {
      setLoading(true);
      const [resEdu, resCourses, resSessions, resComms] = await Promise.all([
        fetch(`/api/v1/educators/${educatorId}`),
        fetch(`/api/v1/educators/${educatorId}/courses`),
        fetch(`/api/v1/sessions?educatorId=${educatorId}&perPage=200`),
        fetch(`/api/v1/educators/${educatorId}/communications`),
      ]);

      if (resEdu.ok) {
        const json = await resEdu.json();
        setEducator(json.data);
      }
      if (resCourses.ok) {
        const json = await resCourses.json();
        setCourses(json.data || []);
      }
      if (resSessions.ok) {
        const json = await resSessions.json();
        setSessions(json.data || []);
      }
      if (resComms.ok) {
        const json = await resComms.json();
        setCommunications(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch educator details:', err);
      showToast('error', 'Failed to load educator data');
    } finally {
      setLoading(false);
    }
  }, [educatorId, showToast]);

  useEffect(() => {
    if (isOpen && educatorId) {
      loadEducatorData();
    } else {
      setEducator(null);
      setActiveTab('overview');
    }
  }, [isOpen, educatorId, loadEducatorData]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      const sched = new Date(s.scheduledAt);
      if (sessionSubTab === 'upcoming') {
        return sched >= now && s.status !== 'cancelled';
      } else {
        return sched < now || s.status === 'completed';
      }
    });
  }, [sessions, sessionSubTab]);

  // Grouped sessions by Month & Year
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: SessionItem[] } = {};
    filteredSessions.forEach((s) => {
      const d = new Date(s.scheduledAt);
      const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filteredSessions]);

  // Calendar dates calculation for current week offset
  const weekDays = useMemo(() => {
    const now = new Date();
    // Monday of current week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff + currentWeekOffset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekOffset]);

  const weekRangeText = useMemo(() => {
    if (weekDays.length === 0) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    const sMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const eMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (sMonth === eMonth) {
      return `${sMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${sMonth} ${start.getDate()} - ${eMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }, [weekDays]);

  // Save Preferences
  const handleUpdatePreferences = async (newPrefs: Partial<EducatorDetails['bookingPreferences']>) => {
    if (!educatorId || !educator) return;
    try {
      const merged = { ...educator.bookingPreferences, ...newPrefs };
      const res = await fetch(`/api/v1/educators/${educatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingPreferences: merged }),
      });
      if (res.ok) {
        setEducator({ ...educator, bookingPreferences: merged });
        showToast('success', 'Preferences updated');
      } else {
        showToast('error', 'Failed to update preferences');
      }
    } catch {
      showToast('error', 'Error updating preferences');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#111622] w-full max-w-[1240px] h-[92vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── TOAST NOTIFICATION ─── */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-in slide-in-from-top-2 duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ─── HEADER ─── */}
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Avatar & Educator Info */}
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <div className="w-14 h-14 rounded-full bg-[#0D1526] text-white flex items-center justify-center text-2xl font-bold uppercase shadow-sm shrink-0 border border-gray-200 dark:border-gray-700 overflow-hidden">
                {educator?.avatarUrl ? (
                  <img
                    src={educator.avatarUrl}
                    alt={educator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  educator?.name?.[0]?.toUpperCase() || 'E'
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {educator?.name || 'Educator Profile'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60">
                    {educator?.subjectBadge || 'Maths'}
                  </span>
                </div>

                {/* Sub row with ID, Phone, Email */}
                <div className="flex items-center gap-3.5 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-gray-400" />
                    <span>{educator?.numericId || '7207'}</span>
                  </span>

                  {educator?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{educator.phone}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{educator?.email}</span>
                  </span>
                </div>

                {/* + Add / Edit Payout Details */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setIsPayoutDetailsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-gray-500" />
                    <span>
                      {educator?.payoutDetails?.accountNumber
                        ? 'Edit Payout Details'
                        : '+ Add Payout Details'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Actions (View Public Profile, Edit, Close) */}
            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsPublicProfilePreviewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-gray-500" />
                <span>View Public Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ─── TABS BAR ─── */}
          <div className="flex items-center gap-6 mt-6 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-800 -mb-4">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'registration', label: 'Registration' },
                { id: 'courses', label: 'Courses' },
                { id: 'sessions', label: 'Sessions' },
                { id: 'payouts', label: 'Payouts' },
                { id: 'calendar', label: 'Calendar' },
                { id: 'availability', label: 'Availability' },
                { id: 'leaves', label: 'Leaves' },
                { id: 'preferences', label: 'Preferences' },
                { id: 'communications', label: 'Communications' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-3 text-xs font-semibold tracking-tight whitespace-nowrap transition-colors relative cursor-pointer ${
                  activeTab === t.id
                    ? 'text-gray-900 dark:text-white font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
                {activeTab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── BODY (SCROLLABLE) ─── */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#0B101A]">
          {loading && !educator ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* ─────────────────────────────────────────────────────────────
                  TAB 1: OVERVIEW
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top 3 Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Courses Assigned
                      </p>
                      <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {courses.length}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        All Sessions
                      </p>
                      <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {sessions.length}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Duration
                      </p>
                      <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {educator?.formattedDuration || '0m'}
                      </p>
                    </div>
                  </div>

                  {/* 2 Middle Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sessions Bar Chart */}
                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-2xs">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Sessions
                      </h3>
                      <div className="h-44 flex items-end justify-between gap-4 px-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                        {educator?.sessionMonthlyStats?.map((m) => {
                          const heightPct = Math.min(100, Math.max(10, m.sessions * 28));
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                              <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                                {m.sessions > 0 ? m.sessions : ''}
                              </span>
                              <div
                                style={{ height: `${m.sessions > 0 ? heightPct : 6}%` }}
                                className={`w-full max-w-[48px] rounded-t-sm transition-all ${
                                  m.sessions > 0
                                    ? 'bg-[#22d3ee] dark:bg-cyan-500'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}
                              />
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                {m.month}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payouts Bar Chart */}
                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          Payouts ({educator?.payoutCurrency || 'INR'})
                        </h3>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                            <span>Paid</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                            <span>In Review</span>
                          </span>
                        </div>
                      </div>

                      <div className="h-44 flex items-end justify-between gap-4 px-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                        {educator?.payoutMonthlyStats?.map((m) => {
                          const total = m.paid + m.inReview;
                          const heightPct = Math.min(100, Math.max(8, (total / 1000) * 20));
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                                {total > 0 ? `₹${total}` : ''}
                              </span>
                              <div
                                style={{ height: `${total > 0 ? heightPct : 6}%` }}
                                className={`w-full max-w-[48px] rounded-t-sm transition-all flex flex-col justify-end overflow-hidden ${
                                  total > 0 ? 'bg-violet-600' : 'bg-gray-100 dark:bg-gray-800'
                                }`}
                              >
                                {m.paid > 0 && (
                                  <div
                                    style={{
                                      height: `${(m.paid / (m.paid + m.inReview || 1)) * 100}%`,
                                    }}
                                    className="w-full bg-blue-300"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                {m.month}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 2 Bottom Tables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Table: Month | Sessions | Duration */}
                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-[#161B26]">
                            <th className="py-3 px-5 font-semibold">Month</th>
                            <th className="py-3 px-5 font-semibold">Sessions</th>
                            <th className="py-3 px-5 font-semibold">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                          {educator?.sessionMonthlyStats?.map((row) => (
                            <tr key={row.month} className="text-gray-800 dark:text-gray-200">
                              <td className="py-3 px-5 font-medium">{row.month}</td>
                              <td className="py-3 px-5">{row.sessions}</td>
                              <td className="py-3 px-5 text-gray-500 dark:text-gray-400">
                                {row.duration}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Right Table: Month | Approved | In Review */}
                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-[#161B26]">
                            <th className="py-3 px-5 font-semibold">Month</th>
                            <th className="py-3 px-5 font-semibold">Approved</th>
                            <th className="py-3 px-5 font-semibold">In Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                          {educator?.payoutMonthlyStats?.map((row) => (
                            <tr key={row.month} className="text-gray-800 dark:text-gray-200">
                              <td className="py-3 px-5 font-medium">{row.month}</td>
                              <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                {row.currency} {row.paid}
                              </td>
                              <td className="py-3 px-5 text-gray-500 dark:text-gray-400">
                                {row.currency} {row.inReview}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 2: REGISTRATION
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'registration' && (
                <div className="space-y-6">
                  {/* Public Profile Card matching Image 3 */}
                  <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-2xs">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          Public Profile
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Manage educator public profile details, highlights, and reviews
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditProfileOpen(true)}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                        title="Edit Public Profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    {educator?.tagline || educator?.about || educator?.coverPhotoUrl ? (
                      <div className="pt-5 space-y-5">
                        {/* Cover preview */}
                        {educator.coverPhotoUrl ? (
                          <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img
                              src={educator.coverPhotoUrl}
                              alt="Cover"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 opacity-90" />
                        )}

                        {/* Tagline */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Tagline
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                            {educator.tagline || 'No tagline added'}
                          </p>
                        </div>

                        {/* Tags */}
                        {educator.tags && educator.tags.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                              Highlight Tags
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {educator.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* About */}
                        {educator.about && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              About
                            </p>
                            <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                              {educator.about}
                            </p>
                          </div>
                        )}

                        {/* YouTube */}
                        {educator.youtubeUrl && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              YouTube Video
                            </p>
                            <a
                              href={educator.youtubeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              <span>{educator.youtubeUrl}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Reviews */}
                        {educator.reviews && educator.reviews.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Reviews ({educator.reviews.length})
                            </p>
                            <div className="space-y-2">
                              {educator.reviews.map((r) => (
                                <div
                                  key={r.id}
                                  className="p-3 bg-gray-50 dark:bg-[#161B26] rounded-lg border border-gray-100 dark:border-gray-800"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                                      {r.studentName}
                                    </span>
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                      {Array.from({ length: r.rating }).map((_, i) => (
                                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                    {r.comment}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-xs text-gray-400">No public profile added yet</p>
                        <button
                          type="button"
                          onClick={() => setIsEditProfileOpen(true)}
                          className="mt-3 px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 transition-all cursor-pointer"
                        >
                          Create Profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 3: COURSES
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'courses' && (
                <div className="space-y-4">
                  {/* Top: + Add Course button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddCourseOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add course</span>
                    </button>
                  </div>

                  {/* Courses Table matching Image 4 */}
                  <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-[#161B26]">
                          <th className="py-3 px-6 font-semibold">Course</th>
                          <th className="py-3 px-6 font-semibold">Learners</th>
                          <th className="py-3 px-6 font-semibold">Admins</th>
                          <th className="py-3 px-6 font-semibold">Payout per credit</th>
                          <th className="py-3 px-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-800 dark:text-gray-200">
                        {courses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-400">
                              No courses assigned yet to this educator.
                            </td>
                          </tr>
                        ) : (
                          courses.map((course) => (
                            <tr
                              key={course.id}
                              className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="py-3.5 px-6">
                                <div className="space-y-1">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {course.typeBadge}
                                  </span>
                                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                                    {course.name}
                                  </p>
                                  {course.subtitle && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {course.subtitle}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-6 font-medium text-gray-700 dark:text-gray-300">
                                {course.learners}
                              </td>

                              <td className="py-3.5 px-6 font-medium text-gray-700 dark:text-gray-300">
                                {course.adminName}
                              </td>

                              <td className="py-3.5 px-6 font-semibold text-gray-900 dark:text-gray-100">
                                {course.payoutPerCredit}
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCourseForPayout(course);
                                      setIsEditPayoutCourseOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-colors cursor-pointer"
                                  >
                                    Edit Payout
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 4: SESSIONS
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  {/* Top Bar: Sub-tabs (Upcoming | Past) & Filter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSessionSubTab('upcoming')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          sessionSubTab === 'upcoming'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs border border-gray-300 dark:border-gray-700'
                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                        }`}
                      >
                        Upcoming{' '}
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700">
                          {educator?.upcomingSessionsCount ?? 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionSubTab('past')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          sessionSubTab === 'past'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs border border-gray-300 dark:border-gray-700'
                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                        }`}
                      >
                        Past{' '}
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700">
                          {educator?.pastSessionsCount ?? 0}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition"
                      >
                        <Filter className="w-3.5 h-3.5 text-gray-500" />
                        <span>Filter</span>
                      </button>

                      <div className="w-36">
                        <CustomSelect
                          value={sessionDateFilter}
                          onChange={(val) => setSessionDateFilter(val as any)}
                          options={[
                            { value: 'next30', label: 'Next 30 days' },
                            { value: 'last30', label: 'Last 30 days' },
                            { value: 'all', label: 'All time' },
                          ]}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sessions Grouped List */}
                  <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-2xs">
                    {Object.keys(groupedSessions).length === 0 ? (
                      <div className="py-16 text-center text-gray-400 text-xs">
                        No {sessionSubTab} sessions found for this educator.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {Object.entries(groupedSessions).map(([monthTitle, items]) => (
                          <div key={monthTitle}>
                            {/* Month Header Banner */}
                            <div className="py-2.5 px-6 bg-gray-50/70 dark:bg-[#161B26] text-xs font-bold text-gray-700 dark:text-gray-300">
                              {monthTitle}
                            </div>

                            <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                              {items.map((sess) => {
                                const sDate = new Date(sess.scheduledAt);
                                const monthAbbr = sDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                });
                                const dayNum = sDate.getDate();
                                const timeStr = sDate.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  weekday: 'short',
                                });

                                return (
                                  <div
                                    key={sess.id}
                                    className="p-4 px-6 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                  >
                                    {/* Left: Date box + Info */}
                                    <div className="flex items-center gap-4 min-w-0">
                                      {/* Date Box */}
                                      <div className="w-11 h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                          {monthAbbr}
                                        </span>
                                        <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                                          {dayNum}
                                        </span>
                                      </div>

                                      {/* Details */}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                                            {sess.courseName || sess.title}
                                          </p>
                                          <PlayCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        </div>

                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                                          <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                            <PlayCircle className="w-3 h-3 text-blue-500" />
                                            {sess.topic || 'Live Session'}
                                          </span>

                                          <span className="inline-flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            {timeStr}
                                          </span>

                                          <span>• {sess.durationMin}m</span>

                                          <span className="inline-flex items-center gap-1">
                                            <Users className="w-3 h-3 text-gray-400" />
                                            {sess.attendeesCount || 0}
                                          </span>
                                        </div>

                                        <div className="mt-1.5">
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                              sess.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                            }`}
                                          >
                                            {sess.status === 'completed' ? 'Completed' : 'Upcoming'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {sessionSubTab === 'upcoming' && sess.zoomMeetingUrl && (
                                        <a
                                          href={sess.zoomMeetingUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-semibold shadow-2xs flex items-center gap-1"
                                        >
                                          <span>Start</span>
                                        </a>
                                      )}
                                      <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 5: PAYOUTS
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'payouts' && (
                <div className="space-y-6">
                  {/* Top Right: Filter & Date range */}
                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition"
                    >
                      <Filter className="w-3.5 h-3.5 text-gray-500" />
                      <span>Filter</span>
                    </button>
                    <div className="w-36">
                      <CustomSelect
                        value={payoutDateFilter}
                        onChange={(val) => setPayoutDateFilter(val as any)}
                        options={[
                          { value: 'this-month', label: 'This month' },
                          { value: 'last-month', label: 'Last month' },
                          { value: 'all', label: 'All time' },
                        ]}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* 4 Stat Summary Cards matching Image 7 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        All Sessions
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {educator?.payoutSummary.allSessions ?? 0}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        All Payouts
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {educator?.payoutSummary.allPayouts ?? 0} (
                        {educator?.payoutSummary.currency}
                        {educator?.payoutSummary.allPayouts ?? 0})
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Payouts in Review
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {educator?.payoutSummary.inReview ?? 0} (
                        {educator?.payoutSummary.currency}
                        {educator?.payoutSummary.inReview ?? 0})
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-2xs">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Payouts Approved
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                        {educator?.payoutSummary.approved ?? 0} (
                        {educator?.payoutSummary.currency}
                        {educator?.payoutSummary.approved ?? 0})
                      </p>
                    </div>
                  </div>

                  {/* Empty state matching Image 7 */}
                  <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-16 text-center shadow-2xs">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      No data available
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                      There is no data available to display based on the applied filter, try
                      changing the filters
                    </p>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 6: CALENDAR
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'calendar' && (
                <div className="space-y-4">
                  {/* Calendar Top Controls matching Image 9 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>

                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-2">
                        {weekRangeText}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentWeekOffset(0)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition"
                    >
                      Today
                    </button>
                  </div>

                  {/* Weekly Calendar Grid */}
                  <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-2xs">
                    {/* Header Columns for 7 Days */}
                    <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161B26] text-center text-xs font-semibold">
                      <div className="py-3 border-r border-gray-100 dark:border-gray-800 text-gray-400"></div>
                      {weekDays.map((d, idx) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = d.getDate();

                        return (
                          <div
                            key={idx}
                            className={`py-3 border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${
                              isToday ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <span
                              className={
                                isToday
                                  ? 'px-2 py-0.5 rounded-md bg-[#131b2d] text-white dark:bg-blue-600 font-bold'
                                  : 'text-gray-700 dark:text-gray-300'
                              }
                            >
                              {dayName} {dayNum}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Hourly Rows (9 AM to 6 PM) */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {[
                        '9:00 am',
                        '10:00 am',
                        '11:00 am',
                        '12:00 pm',
                        '1:00 pm',
                        '2:00 pm',
                        '3:00 pm',
                        '4:00 pm',
                        '5:00 pm',
                        '6:00 pm',
                      ].map((hourLabel, hIdx) => {
                        const currentHour24 = hIdx + 9;
                        return (
                          <div key={hourLabel} className="grid grid-cols-8 min-h-[58px]">
                            {/* Time Column */}
                            <div className="py-2 px-3 border-r border-gray-100 dark:border-gray-800 text-[11px] font-medium text-gray-400 text-right">
                              {hourLabel}
                            </div>

                            {/* 7 Days Columns */}
                            {weekDays.map((dayDate, dIdx) => {
                              // Find sessions falling into this day and hour
                              const daySessions = sessions.filter((s) => {
                                const sDate = new Date(s.scheduledAt);
                                return (
                                  sDate.getFullYear() === dayDate.getFullYear() &&
                                  sDate.getMonth() === dayDate.getMonth() &&
                                  sDate.getDate() === dayDate.getDate() &&
                                  sDate.getHours() === currentHour24
                                );
                              });

                              return (
                                <div
                                  key={dIdx}
                                  className="p-1 border-r border-gray-100 dark:border-gray-800 last:border-r-0 relative hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors"
                                >
                                  {daySessions.map((s) => (
                                    <div
                                      key={s.id}
                                      className="p-2 rounded-md bg-blue-100/90 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-700/60 text-blue-950 dark:text-blue-100 text-[11px] leading-tight shadow-2xs"
                                    >
                                      <p className="font-bold truncate">
                                        {s.learnersText || 'Learner'}
                                      </p>
                                      <p className="truncate text-[10px] text-blue-800 dark:text-blue-200">
                                        {s.courseName || s.title}
                                      </p>
                                      <p className="text-[9px] text-blue-600 dark:text-blue-300 mt-0.5">
                                        {new Date(s.scheduledAt).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 7: AVAILABILITY (100% DRY, Reusing AvailabilityScheduleTab)
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'availability' && educator && (
                <div className="w-full">
                  <AvailabilityScheduleTab educatorId={educator.id} isModalView={true} />
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 8: LEAVES (100% DRY, Reusing AvailabilityLeavesTab)
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'leaves' && educator && (
                <div className="w-full">
                  <AvailabilityLeavesTab educatorId={educator.id} isModalView={true} />
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 9: PREFERENCES matching Image 13
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'preferences' && educator && (
                <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-8 space-y-8 shadow-2xs">
                  {/* Setting 1: Minimum Notice */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Minimum Notice for Session Booking
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Only show availability that starts at least this much time from now
                      </p>
                    </div>

                    <div className="w-full sm:w-56">
                      <CustomSelect
                        value={educator.bookingPreferences?.minNotice || '1 hour'}
                        onChange={(val) => handleUpdatePreferences({ minNotice: val })}
                        options={[
                          { value: '15 mins', label: '15 mins' },
                          { value: '30 mins', label: '30 mins' },
                          { value: '1 hour', label: '1 hour' },
                          { value: '2 hours', label: '2 hours' },
                          { value: '4 hours', label: '4 hours' },
                          { value: '24 hours', label: '24 hours' },
                          { value: '48 hours', label: '48 hours' },
                        ]}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Setting 2: Buffer Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Buffer Time Between Session Bookings
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Blocks time before and after each session to prevent back-to-back bookings
                      </p>
                    </div>

                    <div className="w-full sm:w-56">
                      <CustomSelect
                        value={educator.bookingPreferences?.bufferTime || '0 mins'}
                        onChange={(val) => handleUpdatePreferences({ bufferTime: val })}
                        options={[
                          { value: '0 mins', label: '0 mins' },
                          { value: '5 mins', label: '5 mins' },
                          { value: '10 mins', label: '10 mins' },
                          { value: '15 mins', label: '15 mins' },
                          { value: '30 mins', label: '30 mins' },
                          { value: '45 mins', label: '45 mins' },
                          { value: '60 mins', label: '60 mins' },
                        ]}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Setting 3: Restrict Bookings to Adjacent Slots */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Restrict Bookings to Adjacent Slots
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        When enabled, learners can only book time slots immediately before or after
                        an already booked session.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={educator.bookingPreferences?.restrictAdjacent ?? false}
                        onChange={(e) =>
                          handleUpdatePreferences({ restrictAdjacent: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Setting 4: Limit future bookings */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Limit future bookings
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Limit how far in the future sessions can be booked by learners
                      </p>
                    </div>

                    <div className="w-full sm:w-56">
                      <CustomSelect
                        value={educator.bookingPreferences?.limitFuture || '30 days'}
                        onChange={(val) => handleUpdatePreferences({ limitFuture: val })}
                        options={[
                          { value: '7 days', label: '7 days' },
                          { value: '14 days', label: '14 days' },
                          { value: '30 days', label: '30 days' },
                          { value: '60 days', label: '60 days' },
                          { value: '90 days', label: '90 days' },
                          { value: '180 days', label: '180 days' },
                        ]}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 10: COMMUNICATIONS matching Image 14
              ───────────────────────────────────────────────────────────── */}
              {activeTab === 'communications' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-2xs">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Communication Messages
                    </h3>

                    {communications.length === 0 ? (
                      <div className="py-16 text-center text-gray-400 text-xs">
                        No communication messages captured yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {communications.map((msg) => (
                          <div
                            key={msg.id}
                            className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Mail icon */}
                              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 flex items-center justify-center shrink-0">
                                <span className="font-extrabold text-sm text-red-600 dark:text-red-400 font-sans">
                                  M
                                </span>
                              </div>

                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                                  {msg.subject}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                  {msg.context}
                                </p>
                              </div>
                            </div>

                            {/* Timestamp & Status Badge */}
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {msg.timestamp}
                              </p>
                              <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                  {msg.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── MODAL: EDIT PUBLIC PROFILE matching Image 3 & 4 ─── */}
      {isEditProfileOpen && educator && (
        <EditPublicProfileModal
          educator={educator}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={() => {
            setIsEditProfileOpen(false);
            loadEducatorData();
            showToast('success', 'Profile updated');
            onUpdated?.();
          }}
        />
      )}

      {/* ─── MODAL: EDIT PAYOUT FOR COURSE matching Image 5 & 6 ─── */}
      {isEditPayoutCourseOpen && selectedCourseForPayout && educator && (
        <EditCoursePayoutModal
          educator={educator}
          course={selectedCourseForPayout}
          onClose={() => {
            setIsEditPayoutCourseOpen(false);
            setSelectedCourseForPayout(null);
          }}
          onSaved={() => {
            setIsEditPayoutCourseOpen(false);
            setSelectedCourseForPayout(null);
            loadEducatorData();
            showToast('success', 'Course payout updated');
            onUpdated?.();
          }}
        />
      )}

      {/* ─── MODAL: ADD COURSE ─── */}
      {isAddCourseOpen && educator && (
        <AddCourseToEducatorModal
          educatorId={educator.id}
          onClose={() => setIsAddCourseOpen(false)}
          onSaved={() => {
            setIsAddCourseOpen(false);
            loadEducatorData();
            showToast('success', 'Course assigned');
            onUpdated?.();
          }}
        />
      )}

      {/* ─── MODAL: PAYOUT DETAILS ─── */}
      {isPayoutDetailsOpen && educator && (
        <EditPayoutDetailsModal
          educator={educator}
          onClose={() => setIsPayoutDetailsOpen(false)}
          onSaved={() => {
            setIsPayoutDetailsOpen(false);
            loadEducatorData();
            showToast('success', 'Payout details saved');
            onUpdated?.();
          }}
        />
      )}

      {/* ─── MODAL: VIEW PUBLIC PROFILE PREVIEW ─── */}
      {isPublicProfilePreviewOpen && educator && (
        <ViewPublicProfileModal
          educator={educator}
          onClose={() => setIsPublicProfilePreviewOpen(false)}
        />
      )}
    </div>
  );
}

// ─── SUBMODAL: EDIT PUBLIC PROFILE ────────────────────────────────────────────
function EditPublicProfileModal({
  educator,
  onClose,
  onSaved,
}: {
  educator: EducatorDetails;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tagline, setTagline] = useState(educator.tagline || '');
  const [tag1, setTag1] = useState(educator.tags?.[0] || 'Rating: 4.5');
  const [tag2, setTag2] = useState(educator.tags?.[1] || '1200+ Hours Taught');
  const [tag3, setTag3] = useState(educator.tags?.[2] || '150+ Students Taught');
  const [youtubeUrl, setYoutubeUrl] = useState(educator.youtubeUrl || '');
  const [about, setAbout] = useState(educator.about || '');
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState(educator.reviews || []);

  const handleAddReview = () => {
    setReviews([
      ...reviews,
      {
        id: `rev-${Date.now()}`,
        studentName: 'New Student',
        rating: 5,
        comment: 'Excellent teaching and very clear explanations.',
        date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/educators/${educator.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline,
          tags: [tag1, tag2, tag3].filter(Boolean),
          youtubeUrl,
          about,
          reviews,
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        alert('Failed to save profile');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Edit Public Profile
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Cover Photo */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Cover Photo
            </label>
            <div className="w-full h-24 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 shadow-inner" />
          </div>

          {/* Tagline */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder="Enter your Tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{tagline.length}/100</p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-700 dark:text-gray-300">Tags</label>
            <input
              type="text"
              value={tag1}
              onChange={(e) => setTag1(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={tag2}
              onChange={(e) => setTag2(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={tag3}
              onChange={(e) => setTag3(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
            />
          </div>

          {/* Youtube Video */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Youtube Video
            </label>
            <input
              type="text"
              placeholder="Enter YouTube Video URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
            />
          </div>

          {/* About */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              About
            </label>
            <textarea
              rows={4}
              maxLength={5000}
              placeholder="Describe yourself"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{about.length}/5000</p>
          </div>

          {/* Reviews section */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Reviews
            </label>
            <button
              type="button"
              onClick={handleAddReview}
              className="w-full py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              + Add Review
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold hover:bg-black dark:hover:bg-white transition flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMODAL: EDIT COURSE PAYOUT matching Image 5 & 6 ────────────────────────
function EditCoursePayoutModal({
  educator,
  course,
  onClose,
  onSaved,
}: {
  educator: EducatorDetails;
  course: CourseRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [payoutRate, setPayoutRate] = useState(course.rawPayoutRate || '500');
  const [currency, setCurrency] = useState(course.currency || 'INR');
  const [applyTo, setApplyTo] = useState<'future' | 'all'>('future');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/educators/${educator.id}/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutRate, applyTo }),
      });
      if (res.ok) {
        onSaved();
      } else {
        alert('Failed to save course payout');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating course payout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Edit Payout for Course
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* Educator Avatar & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0D1526] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {educator.name?.[0]?.toUpperCase() || 'E'}
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{educator.name}</p>
              <p className="text-gray-500 text-[11px] truncate max-w-xs">{course.name}</p>
            </div>
          </div>

          {/* Payout Amount per Session Credit */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Payout Amount per Session Credit
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0F1623] px-3 py-1">
                <span className="text-gray-500 mr-2 font-medium">₹</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={payoutRate}
                  onChange={(e) => setPayoutRate(e.target.value)}
                  className="flex-1 py-1 text-gray-900 dark:text-gray-100 outline-none bg-transparent text-sm"
                />
              </div>
              <div className="w-24 shrink-0">
                <CustomSelect
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  options={[
                    { value: 'INR', label: 'INR' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                  ]}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Apply Payout to Sessions */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Apply Payout to Sessions
            </label>
            <CustomSelect
              value={applyTo}
              onChange={(val) => setApplyTo(val as any)}
              options={[
                { value: 'future', label: 'Only Future Sessions' },
                { value: 'all', label: 'All Past & Future Sessions' },
              ]}
              size="sm"
            />
          </div>

          {/* Info callout matching Image 6 */}
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <span className="font-bold">ⓘ</span>
            <span>Educator will be paid ₹{payoutRate || '0'} for each session credit consumed</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-[#131b2d] text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold hover:bg-black dark:hover:bg-white transition flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMODAL: ASSIGN COURSE ──────────────────────────────────────────────────
function AddCourseToEducatorModal({
  educatorId,
  onClose,
  onSaved,
}: {
  educatorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [coursesList, setCoursesList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [payoutRate, setPayoutRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    async function loadAllCourses() {
      try {
        const res = await fetch('/api/v1/courses?perPage=100');
        if (res.ok) {
          const json = await res.json();
          setCoursesList(json.data || []);
          if (json.data?.length > 0) setSelectedCourseId(json.data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCourses(false);
      }
    }
    loadAllCourses();
  }, []);

  const handleAssign = async () => {
    if (!selectedCourseId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/educators/${educatorId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          payoutRateOverride: payoutRate || undefined,
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to assign course');
      }
    } catch (e) {
      console.error(e);
      alert('Error assigning course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Assign Course to Educator
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {loadingCourses ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : coursesList.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No courses available to assign.</p>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Course
                </label>
                <CustomSelect
                  value={selectedCourseId}
                  onChange={(val) => setSelectedCourseId(val)}
                  options={coursesList.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Select a course..."
                  size="sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Payout Rate Override (Optional, per session credit)
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0F1623]">
                  <span className="px-3 text-gray-500">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={payoutRate}
                    onChange={(e) => setPayoutRate(e.target.value)}
                    className="flex-1 py-2 px-1 text-gray-900 dark:text-gray-100 outline-none bg-transparent"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || coursesList.length === 0}
            onClick={handleAssign}
            className="flex-1 py-2 rounded-lg bg-[#131b2d] text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold hover:bg-black dark:hover:bg-white transition flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Assign Course
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMODAL: PAYOUT DETAILS ─────────────────────────────────────────────────
function EditPayoutDetailsModal({
  educator,
  onClose,
  onSaved,
}: {
  educator: EducatorDetails;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [beneficiaryName, setBeneficiaryName] = useState(
    educator.payoutDetails?.beneficiaryName || educator.name || '',
  );
  const [bankName, setBankName] = useState(educator.payoutDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(
    educator.payoutDetails?.accountNumber || '',
  );
  const [ifscCode, setIfscCode] = useState(educator.payoutDetails?.ifscCode || '');
  const [upiId, setUpiId] = useState(educator.payoutDetails?.upiId || '');
  const [defaultRate, setDefaultRate] = useState(educator.payoutDefaultRate || '0');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/educators/${educator.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutDefaultRate: defaultRate,
          payoutDetails: {
            beneficiaryName,
            bankName,
            accountNumber,
            ifscCode,
            upiId,
            currency: educator.payoutCurrency || 'INR',
          },
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        alert('Failed to save payout details');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving payout details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Educator Payout Details
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Beneficiary Name
            </label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Bank Name
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank, ICICI Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              IFSC / Swift Code
            </label>
            <input
              type="text"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none uppercase"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              UPI ID (Optional)
            </label>
            <input
              type="text"
              placeholder="name@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0F1623] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Default Payout Rate per Credit
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0F1623]">
              <span className="px-3 text-gray-500">₹</span>
              <input
                type="number"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                className="flex-1 py-2 px-1 text-gray-900 dark:text-gray-100 outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-[#131b2d] text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold hover:bg-black dark:hover:bg-white transition flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Payout Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMODAL: VIEW PUBLIC PROFILE PREVIEW ────────────────────────────────────
function ViewPublicProfileModal({
  educator,
  onClose,
}: {
  educator: EducatorDetails;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Public Profile Preview
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Cover & Avatar Header */}
          <div className="relative mb-8">
            <div className="w-full h-28 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 shadow-xs" />
            <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-full border-4 border-white dark:border-[#161B26] bg-[#0D1526] text-white flex items-center justify-center text-xl font-bold uppercase shadow-md overflow-hidden">
              {educator.avatarUrl ? (
                <img
                  src={educator.avatarUrl}
                  alt={educator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                educator.name?.[0]?.toUpperCase() || 'E'
              )}
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {educator.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                {educator.subjectBadge}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-medium">
              {educator.tagline || 'Specialist Educator'}
            </p>
          </div>

          {/* Tags */}
          {educator.tags && educator.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {educator.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* About */}
          {educator.about && (
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-1">
                About the Educator
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {educator.about}
              </p>
            </div>
          )}

          {/* Reviews */}
          {educator.reviews && educator.reviews.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-2">
                Learner Reviews
              </h4>
              <div className="space-y-2">
                {educator.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-gray-50 dark:bg-[#111622] rounded-lg border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                        {r.studentName}
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-semibold hover:bg-black dark:hover:bg-white transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
