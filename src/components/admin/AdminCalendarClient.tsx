'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Check,
  X,
  Calendar,
  Clock,
  BookOpen,
  Video,
  FileText,
  Copy,
  Users,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { CalendarViewSelector, CalendarViewType } from '@/components/calendar/CalendarViewSelector';
import { SessionPopoverCard } from '@/components/calendar/SessionPopoverCard';
import { SessionDetailModal } from '@/components/calendar/SessionDetailModal';
import { ZoomRecordingPlayerModal } from '@/components/calendar/ZoomRecordingPlayerModal';
import {
  CalendarAdvancedFilterModal,
  CalendarFilterState,
  INITIAL_CALENDAR_FILTERS,
} from '@/components/calendar/CalendarAdvancedFilterModal';

export type AdminCalendarSession = {
  id: string;
  title: string;
  topic?: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  zoomMeetingUrl?: string | null;
  zoomMeetingId?: string | null;
  courseName: string | null;
  educatorName: string;
  learnerNames: string[];
  creditsConsumed?: string | number | null;
};

interface Props {
  sessions: AdminCalendarSession[];
}

const LUXURY_PALETTES = [
  {
    bg: 'bg-[#FEF9C3] dark:bg-amber-950/40',
    border: 'border-[#FDE047] dark:border-amber-800/60',
    text: 'text-[#854D0E] dark:text-amber-200',
    time: 'text-[#A16207] dark:text-amber-300',
    iconColor: 'text-[#CA8A04]',
    solidBg: 'bg-[#CA8A04]',
  },
  {
    bg: 'bg-[#DCFCE7] dark:bg-emerald-950/40',
    border: 'border-[#86EFAC] dark:border-emerald-800/60',
    text: 'text-[#166534] dark:text-emerald-200',
    time: 'text-[#15803D] dark:text-emerald-300',
    iconColor: 'text-[#16A34A]',
    solidBg: 'bg-[#16A34A]',
  },
  {
    bg: 'bg-[#FFE4E6] dark:bg-rose-950/40',
    border: 'border-[#FECDD3] dark:border-rose-800/60',
    text: 'text-[#9F1239] dark:text-rose-200',
    time: 'text-[#BE123C] dark:text-rose-300',
    iconColor: 'text-[#E11D48]',
    solidBg: 'bg-[#E11D48]',
  },
  {
    bg: 'bg-[#F3E8FF] dark:bg-purple-950/40',
    border: 'border-[#E9D5FF] dark:border-purple-800/60',
    text: 'text-[#6B21A8] dark:text-purple-200',
    time: 'text-[#7E22CE] dark:text-purple-300',
    iconColor: 'text-[#9333EA]',
    solidBg: 'bg-[#9333EA]',
  },
  {
    bg: 'bg-[#E0F2FE] dark:bg-sky-950/40',
    border: 'border-[#BAE6FD] dark:border-sky-800/60',
    text: 'text-[#0369A1] dark:text-sky-200',
    time: 'text-[#0284C7] dark:text-sky-300',
    iconColor: 'text-[#0284C7]',
    solidBg: 'bg-[#0284C7]',
  },
  {
    bg: 'bg-[#FFEDD5] dark:bg-orange-950/40',
    border: 'border-[#FED7AA] dark:border-orange-800/60',
    text: 'text-[#C2410C] dark:text-orange-200',
    time: 'text-[#EA580C] dark:text-orange-300',
    iconColor: 'text-[#EA580C]',
    solidBg: 'bg-[#EA580C]',
  },
];

function getSessionPalette(title: string, id: string) {
  let hash = 0;
  const str = title + id;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return LUXURY_PALETTES[Math.abs(hash) % LUXURY_PALETTES.length];
}

function formatTimeShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

export function AdminCalendarClient({ sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState<AdminCalendarSession[]>(initialSessions);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewType>('Month (Compact)');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Popover Card & Detail Modal States
  const [popoverSession, setPopoverSession] = useState<AdminCalendarSession | null>(null);
  const [detailModalSession, setDetailModalSession] = useState<AdminCalendarSession | null>(null);
  const [recordingModalSession, setRecordingModalSession] = useState<AdminCalendarSession | null>(null);
  const [recordingData, setRecordingData] = useState<{ playUrl?: string; downloadUrl?: string; duration?: number } | null>(null);

  // Session Notes & Edit Drawer
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<AdminCalendarSession | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Fetch Zoom cloud recording stream when recording modal is opened
  useEffect(() => {
    if (!recordingModalSession) {
      setRecordingData(null);
      return;
    }

    let isMounted = true;
    fetch(`/api/v1/sessions/${recordingModalSession.id}/recording`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setRecordingData(json.data);
        }
      })
      .catch(() => {
        // Fallback default stream
        if (isMounted) {
          setRecordingData({
            playUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            duration: recordingModalSession.durationMin || 60,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recordingModalSession]);

  // Monday-based month grid (42 days: 6 rows x 7 cols)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const start = new Date(firstDay);
    start.setDate(start.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Current week days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = (curr.getDay() + 6) % 7;
    const start = new Date(curr);
    start.setDate(curr.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const isToday = (d: Date) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (d: Date) => {
    return d.getMonth() === currentDate.getMonth();
  };

  const [advancedFilters, setAdvancedFilters] = useState<CalendarFilterState>(INITIAL_CALENDAR_FILTERS);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.selectedCourses.length > 0) count += advancedFilters.selectedCourses.length;
    if (advancedFilters.selectedEducators.length > 0) count += advancedFilters.selectedEducators.length;
    if (advancedFilters.selectedLearners.length > 0) count += advancedFilters.selectedLearners.length;
    if (advancedFilters.selectedLocations.length > 0) count += advancedFilters.selectedLocations.length;
    if (advancedFilters.selectedEducatorTags.length > 0) count += advancedFilters.selectedEducatorTags.length;
    if (advancedFilters.selectedSessionTags.length > 0) count += advancedFilters.selectedSessionTags.length;
    if (advancedFilters.selectedCourseTags.length > 0) count += advancedFilters.selectedCourseTags.length;
    return count;
  }, [advancedFilters]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      // 2. Course Filter
      if (
        advancedFilters.selectedCourses.length > 0 &&
        !advancedFilters.selectedCourses.some((c) =>
          (s.courseName && s.courseName.toLowerCase().includes(c.toLowerCase())) ||
          s.title.toLowerCase().includes(c.toLowerCase()) ||
          s.id === c
        )
      ) {
        return false;
      }

      // 3. Educator Filter
      if (
        advancedFilters.selectedEducators.length > 0 &&
        !advancedFilters.selectedEducators.some((edu) =>
          s.educatorName.toLowerCase().includes(edu.toLowerCase()) ||
          (edu.includes('@') && s.educatorName.toLowerCase().includes(edu.split('@')[0].toLowerCase()))
        )
      ) {
        return false;
      }

      // 4. Learner Filter
      if (
        advancedFilters.selectedLearners.length > 0 &&
        !advancedFilters.selectedLearners.some((lrn) =>
          s.learnerNames.some((n) => n.toLowerCase().includes(lrn.toLowerCase())) ||
          s.title.toLowerCase().includes(lrn.toLowerCase())
        )
      ) {
        return false;
      }

      // 5. Locations Filter
      if (
        advancedFilters.selectedLocations.length > 0 &&
        advancedFilters.selectedLocations.includes('zoom') &&
        !s.zoomMeetingUrl
      ) {
        return false;
      }

      return true;
    });
  }, [sessions, statusFilter, advancedFilters]);

  const handleOpenEdit = (s: AdminCalendarSession) => {
    setSelectedSessionForEdit(s);
    setNoteInput(s.topic || '');
    setNoteSuccess(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedSessionForEdit) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/v1/sessions/${selectedSessionForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: noteInput }),
      });
      if (!res.ok) throw new Error('Failed to update notes');
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSessionForEdit.id ? { ...s, topic: noteInput } : s)),
      );
      setSelectedSessionForEdit((prev) => (prev ? { ...prev, topic: noteInput } : null));
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Error saving notes');
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedSessionForEdit) return;
    try {
      const res = await fetch(`/api/v1/sessions/${selectedSessionForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSessionForEdit.id ? { ...s, status: newStatus } : s)),
      );
      setSelectedSessionForEdit((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const factor = direction === 'next' ? 1 : -1;
    if (viewMode.startsWith('Month') || viewMode === 'Location') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + factor, 1));
    } else if (viewMode.startsWith('Week')) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + factor * 7);
      setCurrentDate(nextDate);
    } else {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + factor);
      setCurrentDate(nextDate);
    }
  };

  const headerTitle = useMemo(() => {
    if (viewMode.startsWith('Month') || viewMode === 'Location') {
      return currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    if (viewMode.startsWith('Week')) {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [viewMode, currentDate, weekDays]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-[#080D16]">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#111622] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs mb-4 shrink-0 relative z-30">
        {/* Left: Date Title & Navigators */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
            {headerTitle}
          </h2>

          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => handleNavigate('prev')}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNavigate('next')}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Working View Selector + Filter + Add Session */}
        <div className="flex items-center gap-3 flex-wrap relative z-30">
          {/* Active 6-Mode View Selector matching screenshot */}
          <CalendarViewSelector currentView={viewMode} onViewChange={setViewMode} />

          {/* Advanced Filter Button matching screenshot */}
          <button
            type="button"
            onClick={() => setIsAdvancedFilterOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95 ${
              activeFilterCount > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400 font-bold'
                : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white flex items-center justify-center -mr-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Link
            href="/admin/calendar/add"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* ─── CALENDAR VIEWS AREA ─── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#111622] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden min-h-0">
        {/* VIEW 1: MONTH (COMPACT) — Hero design matching screenshot */}
        {viewMode === 'Month (Compact)' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Weekday headers: Monday to Sunday */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] shrink-0">
              {WEEKDAYS.map((dayName) => (
                <div key={dayName} className="py-2.5 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {dayName}
                </div>
              ))}
            </div>

            {/* 42 cells grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-b border-l border-gray-200 dark:border-gray-800 min-h-[600px] bg-gray-200/50 dark:bg-gray-800/40 gap-[1px] overflow-y-auto">
              {monthDays.map((day, idx) => {
                const daySessions = filteredSessions.filter(
                  (s) => new Date(s.scheduledAt).toDateString() === day.toDateString(),
                );
                const inCurrentMonth = isCurrentMonth(day);
                const today = isToday(day);

                return (
                  <div
                    key={idx}
                    className={`p-2 flex flex-col justify-start overflow-hidden transition-all relative min-h-[105px] ${
                      inCurrentMonth ? 'bg-white dark:bg-[#111622]' : 'bg-gray-50/70 dark:bg-[#0d1117] opacity-60'
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between mb-1.5">
                      {today ? (
                        <span className="w-6 h-6 rounded-full bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-bold text-xs flex items-center justify-center shadow-xs">
                          {day.getDate()}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            inCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      )}
                    </div>

                    {/* Session Blocks Stack */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                      {daySessions.slice(0, 5).map((s) => {
                        const palette = getSessionPalette(s.title, s.id);
                        const isCancelled = s.status === 'cancelled';
                        const isCompleted = s.status === 'completed';
                        const displayTitle = s.learnerNames.length > 0 ? `${s.title} (${s.learnerNames[0]})` : s.title;

                        return (
                          <div
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopoverSession(s);
                            }}
                            className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border truncate transition-all hover:shadow-xs hover:scale-[1.01] cursor-pointer select-none ${palette.bg} ${palette.border} ${palette.text} ${
                              isCancelled ? 'line-through opacity-70 text-red-600 dark:text-red-400 decoration-red-500' : ''
                            }`}
                            title={`${displayTitle} - ${s.educatorName} (${formatTimeShort(s.scheduledAt)}) - Click for preview`}
                          >
                            {isCancelled ? (
                              <span className="text-[10px] text-red-500 font-bold shrink-0">✕</span>
                            ) : isCompleted ? (
                              <span className="text-[10px] text-blue-600 font-bold shrink-0">✓</span>
                            ) : (
                              <Check className={`w-2.5 h-2.5 shrink-0 ${palette.iconColor}`} />
                            )}
                            <span className={`font-semibold shrink-0 text-[10.5px] ${palette.time}`}>
                              {formatTimeShort(s.scheduledAt)}
                            </span>
                            <span className={`truncate font-medium flex-1 ${isCancelled ? 'line-through' : ''}`}>
                              {displayTitle}
                            </span>
                            {s.topic && <FileText className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                          </div>
                        );
                      })}

                      {daySessions.length > 5 && (
                        <button
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode('Day');
                          }}
                          className="text-[10px] text-gray-500 hover:text-blue-600 font-semibold text-left pl-1 transition-colors mt-0.5"
                        >
                          See More ({daySessions.length - 5})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: MONTH (DETAILED) — Rich session cards with educator, learner & status badge */}
        {viewMode === 'Month (Detailed)' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] shrink-0">
              {WEEKDAYS.map((dayName) => (
                <div key={dayName} className="py-2.5 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-b border-l border-gray-200 dark:border-gray-800 min-h-[600px] bg-gray-200/50 dark:bg-gray-800/40 gap-[1px] overflow-y-auto">
              {monthDays.map((day, idx) => {
                const daySessions = filteredSessions.filter(
                  (s) => new Date(s.scheduledAt).toDateString() === day.toDateString(),
                );
                const inCurrentMonth = isCurrentMonth(day);
                const today = isToday(day);

                return (
                  <div
                    key={idx}
                    className={`p-2 flex flex-col justify-start overflow-hidden transition-all relative min-h-[120px] ${
                      inCurrentMonth ? 'bg-white dark:bg-[#111622]' : 'bg-gray-50/70 dark:bg-[#0d1117] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {today ? (
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {day.getDate()}
                        </span>
                      ) : (
                        <span className={`text-xs font-semibold ${inCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                          {day.getDate()}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{daySessions.length > 0 ? `${daySessions.length} sessions` : ''}</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
                      {daySessions.map((s) => {
                        const palette = getSessionPalette(s.title, s.id);
                        const isCancelled = s.status === 'cancelled';
                        const isCompleted = s.status === 'completed';

                        return (
                          <div
                            key={s.id}
                            onClick={() => setPopoverSession(s)}
                            className={`p-1.5 rounded-lg border text-left text-xs cursor-pointer hover:shadow-xs transition-all ${palette.bg} ${palette.border} ${
                              isCancelled ? 'line-through opacity-70 text-red-600 dark:text-red-400' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-bold text-[10px] ${palette.time}`}>
                                {isCompleted ? '✓ ' : ''}{formatTimeShort(s.scheduledAt)}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold bg-white/60 dark:bg-black/30">
                                {s.status}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white truncate text-[11px] mt-0.5">
                              {s.title}
                            </p>
                            <p className="text-[10px] text-gray-600 dark:text-gray-300 truncate">
                              {s.educatorName} · {s.learnerNames[0] || '1 Learner'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: WEEK (LIST) — Chronological 7-day comprehensive list */}
        {viewMode === 'Week (List)' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {weekDays.map((day) => {
              const daySessions = filteredSessions.filter(
                (s) => new Date(s.scheduledAt).toDateString() === day.toDateString(),
              );
              const today = isToday(day);

              return (
                <div key={day.toISOString()} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-[#161B26]">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${today ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{daySessions.length} Sessions</span>
                  </div>

                  {daySessions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No sessions scheduled for this day.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {daySessions.map((s) => {
                        const palette = getSessionPalette(s.title, s.id);
                        const isCancelled = s.status === 'cancelled';
                        return (
                          <div
                            key={s.id}
                            onClick={() => setPopoverSession(s)}
                            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer hover:shadow-md transition-all ${palette.bg} ${palette.border} ${isCancelled ? 'line-through opacity-70' : ''}`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-xs font-bold ${palette.time}`}>
                                  {formatTimeShort(s.scheduledAt)} ({s.durationMin}m)
                                </span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 shadow-2xs">
                                  {s.status}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{s.title}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Educator: {s.educatorName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Learners: {s.learnerNames.join(', ') || 'None assigned'}</p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
                              <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">View details →</span>
                              {s.zoomMeetingUrl && <Video className="w-3.5 h-3.5 text-emerald-600" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 4: WEEK (AGENDA) — 7 Day Columns with Time Grid */}
        {viewMode === 'Week (Agenda)' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Hour gutter */}
            <div className="w-16 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#161B26] overflow-hidden select-none">
              <div className="h-10 border-b border-gray-200 dark:border-gray-800" />
              {HOURS.map((h) => (
                <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] font-medium text-gray-500">
                    {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Columns */}
            <div className="flex-1 overflow-y-auto relative">
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] sticky top-0 z-20">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="h-10 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{day.getDate()}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 min-h-[896px]">
                {weekDays.map((day) => {
                  const daySessions = filteredSessions.filter(
                    (s) => new Date(s.scheduledAt).toDateString() === day.toDateString(),
                  );
                  return (
                    <div key={day.toISOString()} className="border-r border-gray-200 dark:border-gray-800 last:border-r-0 relative">
                      {HOURS.map((h) => (
                        <div key={h} className="h-16 border-b border-gray-100 dark:border-gray-800/60" />
                      ))}

                      {daySessions.map((s) => {
                        const sDate = new Date(s.scheduledAt);
                        const hour = sDate.getHours() + sDate.getMinutes() / 60;
                        const top = Math.max(0, (hour - 8) * 64);
                        const height = Math.max(28, (s.durationMin / 60) * 64);
                        const palette = getSessionPalette(s.title, s.id);
                        const isCancelled = s.status === 'cancelled';

                        return (
                          <div
                            key={s.id}
                            onClick={() => setPopoverSession(s)}
                            style={{ top: `${top}px`, height: `${height}px` }}
                            className={`absolute left-1 right-1 p-1 rounded-md border text-[11px] overflow-hidden cursor-pointer hover:shadow-md transition-all z-10 ${palette.bg} ${palette.border} ${isCancelled ? 'line-through opacity-70 text-red-600' : palette.text}`}
                          >
                            <span className="font-bold block truncate">{formatTimeShort(s.scheduledAt)} {s.title}</span>
                            <span className="text-[10px] block truncate opacity-80">{s.educatorName}</span>
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

        {/* VIEW 5: DAY VIEW — Dedicated single-day schedule */}
        {viewMode === 'Day' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-20 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#161B26]">
              {HOURS.map((h) => (
                <div key={h} className="h-20 flex items-start justify-end pr-3 pt-1 text-xs font-semibold text-gray-500">
                  {h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto relative p-4">
              <div className="min-h-[1120px] relative">
                {HOURS.map((h) => (
                  <div key={h} className="h-20 border-b border-gray-200 dark:border-gray-800/80" />
                ))}

                {filteredSessions
                  .filter((s) => new Date(s.scheduledAt).toDateString() === currentDate.toDateString())
                  .map((s) => {
                    const sDate = new Date(s.scheduledAt);
                    const hour = sDate.getHours() + sDate.getMinutes() / 60;
                    const top = Math.max(0, (hour - 8) * 80);
                    const height = Math.max(48, (s.durationMin / 60) * 80);
                    const palette = getSessionPalette(s.title, s.id);
                    const isCancelled = s.status === 'cancelled';

                    return (
                      <div
                        key={s.id}
                        onClick={() => setPopoverSession(s)}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={`absolute left-4 right-4 p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:shadow-lg transition-all z-10 ${palette.bg} ${palette.border} ${isCancelled ? 'line-through opacity-70' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${palette.solidBg}`} />
                          <div>
                            <h4 className="font-bold text-sm text-gray-950 dark:text-white">{s.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {formatTimeShort(s.scheduledAt)} ({s.durationMin} mins) · Educator: {s.educatorName} · Learners: {s.learnerNames.join(', ') || 'None'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-md bg-white dark:bg-gray-900 border">
                            {s.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopoverSession(s);
                            }}
                            className="px-3 py-1 bg-white dark:bg-gray-800 text-xs font-bold rounded-lg border hover:bg-gray-50"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: LOCATION — Grouped by delivery channel & zoom status */}
        {viewMode === 'Location' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zoom Online Sessions */}
              <div className="border border-blue-200 dark:border-blue-900/40 rounded-2xl p-5 bg-blue-50/20 dark:bg-[#111827]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-blue-200 dark:border-blue-900/60 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Zoom Cloud Video Rooms</h3>
                    <p className="text-xs text-gray-500">Virtual 1-on-1 and group classrooms</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredSessions.filter((s) => s.zoomMeetingUrl).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setPopoverSession(s)}
                      className="p-3 bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-xs transition"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-blue-600 dark:text-blue-400">{formatTimeShort(s.scheduledAt)}</span>
                        <span className="capitalize text-gray-500">{s.status}</span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white">{s.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.educatorName} · {s.learnerNames[0] || '1 Learner'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Classrooms / Centers */}
              <div className="border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 bg-emerald-50/20 dark:bg-[#0c1e19]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-200 dark:border-emerald-900/60 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Campus & Center Classrooms</h3>
                    <p className="text-xs text-gray-500">In-person instructional workshops</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredSessions.filter((s) => !s.zoomMeetingUrl).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setPopoverSession(s)}
                      className="p-3 bg-white dark:bg-[#132822] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-xs transition"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-emerald-600 dark:text-emerald-400">{formatTimeShort(s.scheduledAt)}</span>
                        <span className="capitalize text-gray-500">{s.status}</span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white">{s.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.educatorName} · Room 102</p>
                    </div>
                  ))}
                  {filteredSessions.filter((s) => !s.zoomMeetingUrl).length === 0 && (
                    <p className="text-xs text-gray-400 italic py-4 text-center">All active sessions are hosted online via Zoom.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 1. QUICK SESSION POPOVER CARD (MATCHES SCREENSHOT 3) ─── */}
      {popoverSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setPopoverSession(null)}
        >
          <SessionPopoverCard
            session={popoverSession}
            onClose={() => setPopoverSession(null)}
            onViewSession={() => {
              setDetailModalSession(popoverSession);
              setPopoverSession(null);
            }}
            onEditSession={() => {
              handleOpenEdit(popoverSession);
              setPopoverSession(null);
            }}
          />
        </div>
      )}

      {/* ─── 2. DETAILED SESSION MODAL (MATCHES SCREENSHOTS 1 & 2) ─── */}
      {detailModalSession && (
        <SessionDetailModal
          isOpen={Boolean(detailModalSession)}
          userRole="admin"
          session={detailModalSession}
          onClose={() => setDetailModalSession(null)}
          onPlayRecording={(sess) => {
            setRecordingModalSession(sess as AdminCalendarSession);
          }}
          onUpdateSession={async (sessionId, updates) => {
            try {
              await fetch(`/api/v1/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });
              setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)),
              );
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {/* ─── 3. ZOOM RECORDING PLAYER MODAL ─── */}
      {recordingModalSession && (
        <ZoomRecordingPlayerModal
          isOpen={Boolean(recordingModalSession)}
          onClose={() => setRecordingModalSession(null)}
          title={recordingModalSession.title}
          videoUrl={recordingData?.playUrl}
          downloadUrl={recordingData?.downloadUrl}
          durationMin={recordingModalSession.durationMin}
          scheduledAt={recordingModalSession.scheduledAt}
          educatorName={recordingModalSession.educatorName}
        />
      )}

      {/* ─── 4. EDIT & NOTES MODAL ─── */}
      {selectedSessionForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl shadow-2xl shadow-black/90 w-full max-w-lg overflow-hidden text-gray-100 animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-800/80 flex items-center justify-between bg-gradient-to-r from-[#111726] to-[#0D121D]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full ring-4 ring-purple-500/20 bg-purple-500 shrink-0" />
                <h2 className="font-bold text-base text-white tracking-tight truncate max-w-[320px]">
                  {selectedSessionForEdit.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSessionForEdit(null)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#131926] border border-gray-800/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium">Date & Time</p>
                    <p className="font-semibold text-xs text-gray-100 truncate mt-0.5">
                      {new Date(selectedSessionForEdit.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTimeShort(selectedSessionForEdit.scheduledAt)}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131926] border border-gray-800/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium">Duration</p>
                    <p className="font-semibold text-xs text-gray-100 truncate mt-0.5">
                      {selectedSessionForEdit.durationMin} minutes
                    </p>
                  </div>
                </div>

                <div className="col-span-2 p-3.5 rounded-xl bg-[#131926] border border-gray-800/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400 font-medium">Course & Educator</p>
                    <p className="font-semibold text-xs text-gray-100 truncate mt-0.5">
                      {selectedSessionForEdit.courseName || 'Unassigned Course'} &bull; {selectedSessionForEdit.educatorName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes & Agenda */}
              <div className="pt-1">
                <label className="text-xs font-semibold text-gray-200 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Session Notes & Agenda
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-400 border border-gray-700/50">
                    Database Synced
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Notes, lesson objectives, or student review..."
                  className="w-full px-3.5 py-2.5 bg-[#070A10] border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-hidden focus:border-blue-500 resize-none leading-relaxed transition-all"
                />
                <div className="flex justify-end mt-2">
                  <FeedbackButton
                    onClick={handleSaveNotes}
                    loading={savingNote}
                    success={noteSuccess}
                    loadingText="Saving..."
                    successText="Notes Saved ✓"
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Save Notes
                  </FeedbackButton>
                </div>
              </div>

              {/* Zoom Meeting with Zoom Logo */}
              {selectedSessionForEdit.zoomMeetingUrl ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0C1B33] via-[#0E2447] to-[#0A182F] border border-[#2D8CFF]/40 flex items-center justify-between shadow-lg shadow-blue-950/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#2D8CFF] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 5.5A2.5 2.5 0 002 8v8a2.5 2.5 0 002.5 2.5h10A2.5 2.5 0 0017 16V8a2.5 2.5 0 00-2.5-2.5h-10zm13.793 4.293a1 1 0 00-1.293.947v2.52a1 1 0 001.293.947l3.5 1.75A1 1 0 0023 15.118V8.882a1 1 0 00-1.493-.882l-3.5 1.75z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white tracking-tight truncate">
                        Zoom Video Meeting
                      </p>
                      <p className="text-[10px] text-blue-200/70 font-medium truncate">
                        HD Video & Audio • Secure Meeting
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSessionForEdit.zoomMeetingUrl!);
                        alert('Zoom link copied!');
                      }}
                      className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      title="Copy Zoom Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={selectedSessionForEdit.zoomMeetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-[#2D8CFF] to-[#0B66E4] hover:from-[#3B96FF] hover:to-[#1677FF] text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/25 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      Join Zoom
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#131926] border border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span>No Zoom link generated yet.</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    selectedSessionForEdit.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : selectedSessionForEdit.status === 'cancelled'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  }`}>
                    {selectedSessionForEdit.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSessionForEdit.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedSessionForEdit.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus('cancelled')}
                      className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition cursor-pointer"
                    >
                      Cancel Session
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. ADVANCED FILTERS MODAL (MATCHES SCREENSHOTS 1-4) ─── */}
      <CalendarAdvancedFilterModal
        isOpen={isAdvancedFilterOpen}
        onClose={() => setIsAdvancedFilterOpen(false)}
        activeFilters={advancedFilters}
        onApplyFilters={setAdvancedFilters}
      />
    </div>
  );
}
