'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  Circle,
  Calendar,
  AlertTriangle,
  AlertCircle,
  X,
  Loader2,
  Move,
  Info,
  ExternalLink,
  Check,
  Filter,
  FileText,
  ChevronDown,
  BookOpen,
  Copy,
  Trash2,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CalendarViewSelector, CalendarViewType } from '@/components/calendar/CalendarViewSelector';
import { SessionPopoverCard } from '@/components/calendar/SessionPopoverCard';
import { SessionDetailModal } from '@/components/calendar/SessionDetailModal';
import { ZoomRecordingPlayerModal } from '@/components/calendar/ZoomRecordingPlayerModal';
import {
  CalendarAdvancedFilterModal,
  CalendarFilterState,
  INITIAL_CALENDAR_FILTERS,
} from '@/components/calendar/CalendarAdvancedFilterModal';
import type { CalendarSession } from '@/app/educator/calendar/page';

interface CourseOption {
  id: string;
  name: string;
}

interface LearnerOption {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  sessions: CalendarSession[];
  educatorName: string;
  educatorId?: string;
  isCalendarConnected?: boolean;
  courses?: CourseOption[];
  learners?: LearnerOption[];
}

// Ultra-luxury pastel palettes matching the reference design
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function EducatorCalendarClient({
  sessions: initialSessions,
  educatorName,
  educatorId,
  isCalendarConnected,
  courses = [],
  learners = [],
}: Props) {
  const [sessions, setSessions] = useState<CalendarSession[]>(initialSessions);
  // Default to Month (Compact) as requested by user and shown in screenshot!
  const [viewMode, setViewMode] = useState<CalendarViewType>('Month (Compact)');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarConnected, setCalendarConnected] = useState(Boolean(isCalendarConnected));
  const [disconnecting, setDisconnecting] = useState(false);
  const [devConnecting, setDevConnecting] = useState(false);

  // Filter & dropdown state
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<CalendarFilterState>(INITIAL_CALENDAR_FILTERS);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // Interactive Calendar Modals (matching screenshots)
  const [popoverSession, setPopoverSession] = useState<CalendarSession | null>(null);
  const [detailModalSession, setDetailModalSession] = useState<CalendarSession | null>(null);
  const [recordingModalSession, setRecordingModalSession] = useState<CalendarSession | null>(null);
  const [recordingData, setRecordingData] = useState<{ playUrl?: string; downloadUrl?: string; duration?: number } | null>(null);

  // Session Notes & Detail Drawer / Modal state ("s=note thing")
  const [selectedSession, setSelectedSession] = useState<CalendarSession | null>(null);
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

  // Dynamic courses and learners state with auto-fetch fallback
  const [coursesList, setCoursesList] = useState<CourseOption[]>(courses);
  const [learnersList, setLearnersList] = useState<LearnerOption[]>(learners);

  // Drag and drop state
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // Quick Book Session Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isOAuthHelpOpen, setIsOAuthHelpOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New session form fields
  const [formTitle, setFormTitle] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('10:00');
  const [formDuration, setFormDuration] = useState('60');
  const [formCourseId, setFormCourseId] = useState(courses[0]?.id ?? '');
  const [formLearnerIds, setFormLearnerIds] = useState<string[]>(learners[0] ? [learners[0].id] : []);
  const [formCreateZoom, setFormCreateZoom] = useState(true);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsFilterOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-fetch courses and learners if empty
  useEffect(() => {
    if (courses.length > 0) {
      setCoursesList(courses);
      if (!formCourseId) setFormCourseId(courses[0].id);
    } else {
      fetch('/api/v1/store/courses')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setCoursesList(json.data.map((c: any) => ({ id: c.id, name: c.name })));
            setFormCourseId((prev) => prev || json.data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [courses]);

  useEffect(() => {
    if (learners.length > 0) {
      setLearnersList(learners);
      if (formLearnerIds.length === 0) setFormLearnerIds([learners[0].id]);
    }
  }, [learners]);

  // Synchronized scroll refs
  const timeGutterRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timeGutterRef.current) {
      timeGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Google Calendar Disconnect
  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Two-way sync will be stopped.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/v1/calendar/disconnect', { method: 'POST' });
      if (res.ok) {
        setCalendarConnected(false);
        showToast('Google Calendar disconnected successfully');
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch {
      showToast('Failed to disconnect Google Calendar', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  // Dev mode simulation
  const handleDevConnectCalendar = async () => {
    setDevConnecting(true);
    try {
      const res = await fetch('/api/v1/calendar/connect/simulate', { method: 'POST' });
      if (res.ok) {
        setCalendarConnected(true);
        setIsOAuthHelpOpen(false);
        showToast('Google Calendar connected (Dev Mode Simulation)');
      } else {
        throw new Error('Failed simulation');
      }
    } catch {
      showToast('Could not simulate calendar connect', 'error');
    } finally {
      setDevConnecting(false);
    }
  };

  // Check URL params for OAuth status
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('connected') === 'google') {
      setCalendarConnected(true);
      showToast('Google Calendar 2-Way Sync Connected Successfully!');
      window.history.replaceState({}, '', '/educator/calendar');
    } else if (url.searchParams.get('error')) {
      const err = url.searchParams.get('error');
      showToast(`Calendar sync error: ${err}`, 'error');
      setIsOAuthHelpOpen(true);
    }
  }, []);

  // ─── Monday-based Week & Month calculations ───────────────────────────────
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    d.setDate(d.getDate() - dayOfWeek);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  // Month Grid Calculation (42 cells: 6 weeks x 7 days, starting on Monday!)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
    const start = new Date(firstDayOfMonth);
    start.setDate(start.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM – 7 PM

  const isToday = (d: Date) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (d: Date) => {
    return d.getMonth() === currentDate.getMonth();
  };

  // Current time position indicator (red bar)
  const currentTimePercentage = useMemo(() => {
    const now = new Date();
    const curHour = now.getHours() + now.getMinutes() / 60;
    if (curHour < 7 || curHour > 20) return null;
    return ((curHour - 7) / 13) * 100;
  }, []);

  // Navigation handlers
  const handleNavPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'Day') d.setDate(d.getDate() - 1);
    else if (viewMode.startsWith('Week')) d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNavNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'Day') d.setDate(d.getDate() + 1);
    else if (viewMode.startsWith('Week')) d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleNavToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title
  const headerDateTitle = useMemo(() => {
    if (viewMode === 'Day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (viewMode.startsWith('Week')) {
      const endWeek = new Date(weekDays[6]);
      return `${weekStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${endWeek.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [viewMode, currentDate, weekStart, weekDays]);

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

  // Filtered sessions based on status & advanced filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

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

  // ─── Drag & Drop Handlers ──────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, session: CalendarSession) => {
    e.dataTransfer.setData('application/json', JSON.stringify(session));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSessionId(session.id);
  };

  const handleDragEnd = () => {
    setDraggingSessionId(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotKey) {
      setDragOverSlot(slotKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, slotKey: string) => {
    if (dragOverSlot === slotKey) {
      setDragOverSlot(null);
    }
  };

  const handleDropSlot = async (e: React.DragEvent, targetDay: Date, targetHour: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    setDraggingSessionId(null);

    const dataRaw = e.dataTransfer.getData('application/json');
    if (!dataRaw) return;

    try {
      const draggedSession: CalendarSession = JSON.parse(dataRaw);
      const originalScheduledAt = new Date(draggedSession.scheduledAt);

      const newScheduledDate = new Date(targetDay);
      newScheduledDate.setHours(targetHour, originalScheduledAt.getMinutes(), 0, 0);

      if (newScheduledDate.toISOString() === draggedSession.scheduledAt) return;

      const updatedList = sessions.map((s) =>
        s.id === draggedSession.id ? { ...s, scheduledAt: newScheduledDate.toISOString() } : s,
      );
      setSessions(updatedList);

      showToast(`Rescheduled to ${newScheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTime(newScheduledDate.toISOString())}`);

      await fetch(`/api/v1/sessions/${draggedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduledDate.toISOString() }),
      });
    } catch (err) {
      console.error(err);
      showToast('Failed to reschedule session', 'error');
    }
  };

  const handleDropMonthDay = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragOverSlot(null);
    setDraggingSessionId(null);

    const dataRaw = e.dataTransfer.getData('application/json');
    if (!dataRaw) return;

    try {
      const draggedSession: CalendarSession = JSON.parse(dataRaw);
      const orig = new Date(draggedSession.scheduledAt);
      const newScheduledDate = new Date(targetDay);
      newScheduledDate.setHours(orig.getHours(), orig.getMinutes(), 0, 0);

      if (newScheduledDate.toDateString() === orig.toDateString()) return;

      const updatedList = sessions.map((s) =>
        s.id === draggedSession.id ? { ...s, scheduledAt: newScheduledDate.toISOString() } : s,
      );
      setSessions(updatedList);

      showToast(`Moved to ${newScheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTime(newScheduledDate.toISOString())}`);

      await fetch(`/api/v1/sessions/${draggedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduledDate.toISOString() }),
      });
    } catch {
      showToast('Failed to move session', 'error');
    }
  };

  // ─── Modal Openers ─────────────────────────────────────────────────────────
  const handleOpenBookModal = (date?: Date, hour = 10) => {
    const d = date ?? new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFormDate(`${yyyy}-${mm}-${dd}`);
    setFormTime(`${String(hour).padStart(2, '0')}:00`);
    setFormTitle('');
    setFormTopic('');
    setModalError(null);
    setBookingSuccess(false);
    setIsBookModalOpen(true);
  };

  const handleOpenSessionNotes = (s: CalendarSession) => {
    setSelectedSession(s);
    setNoteInput(s.topic || '');
    setNoteSuccess(false);
  };

  // ─── Session Notes Save Handler ("s=note thing") ─────────────────────────
  const handleSaveNotes = async () => {
    if (!selectedSession) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/v1/sessions/${selectedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: noteInput }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update session notes');
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSession.id ? { ...s, topic: noteInput } : s)),
      );
      setSelectedSession((prev) => (prev ? { ...prev, topic: noteInput } : null));
      setNoteSuccess(true);
      showToast('Session notes saved successfully!');
      setTimeout(() => setNoteSuccess(false), 2000);
    } catch (err: any) {
      showToast(err.message || 'Error saving notes', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // ─── Update Session Status ────────────────────────────────────────────────
  const handleUpdateSessionStatus = async (newStatus: 'scheduled' | 'live' | 'completed' | 'cancelled') => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/v1/sessions/${selectedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSession.id ? { ...s, status: newStatus } : s)),
      );
      setSelectedSession((prev) => (prev ? { ...prev, status: newStatus } : null));
      showToast(`Session marked as ${newStatus}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // ─── Create Session Submit ────────────────────────────────────────────────
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError('Session title is required');
      return;
    }
    if (!formDate || !formTime) {
      setModalError('Date and start time are required');
      return;
    }
    if (!formCourseId) {
      setModalError('Please select a course for this session');
      return;
    }

    setBookingLoading(true);
    setModalError(null);

    try {
      const scheduledDateTime = new Date(`${formDate}T${formTime}:00`);

      const payload = {
        title: formTitle.trim(),
        topic: formTopic.trim() || undefined,
        courseId: formCourseId,
        scheduledAt: scheduledDateTime.toISOString(),
        durationMin: parseInt(formDuration, 10),
        learnerIds: formLearnerIds.filter(Boolean),
        createZoom: formCreateZoom,
      };

      const res = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to book session');

      const selectedCourse = coursesList.find((c) => c.id === formCourseId);
      const newCalSession: CalendarSession = {
        id: json.data?.id || `sess_${Date.now()}`,
        title: formTitle.trim(),
        topic: formTopic.trim() || null,
        scheduledAt: scheduledDateTime.toISOString(),
        durationMin: parseInt(formDuration, 10),
        status: 'scheduled',
        zoomMeetingUrl: json.data?.zoomMeetingUrl || null,
        courseName: selectedCourse?.name || null,
        attendeeCount: formLearnerIds.length,
      };

      setSessions((prev) => [...prev, newCalSession]);
      setBookingSuccess(true);
      setTimeout(() => {
        setIsBookModalOpen(false);
        setBookingSuccess(false);
        showToast('Session scheduled successfully!');
      }, 700);
    } catch (err: any) {
      const msg = err.message || 'Failed to create session';
      setModalError(msg);
      showToast(msg, 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  // Seed sample schedule helper for testing
  const handleSeedSampleSchedule = () => {
    const sampleTitles = [
      'Aarav-IG-G-6-Unbound',
      'Smaran Consultation',
      'Anshika-IG-G10-Unb',
      'Hardi-CBSE-G-11-Math',
      'Kartik-IG-G10-Unit',
      'Rhea-IG-G10-Chem',
      'Vivaan-IG-G-8-French',
      'Prishita HT Doubt',
      'Ila-IG-G10-Chem',
      'Jian Consultation',
      'Rishit-IG-G6-Eng',
    ];

    const newSamples: CalendarSession[] = [];
    const baseDate = new Date(currentDate);

    // Create 15 distributed sample sessions across current month
    for (let dayOffset = 1; dayOffset <= 28; dayOffset += 2) {
      const sampleDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), dayOffset, 9 + (dayOffset % 7), 0);
      const title = sampleTitles[dayOffset % sampleTitles.length];
      newSamples.push({
        id: `demo_${dayOffset}_${Date.now()}`,
        title,
        topic: `Notes: Weekly progress discussion, homework check, and problem solving.`,
        scheduledAt: sampleDate.toISOString(),
        durationMin: 60,
        status: dayOffset === 21 ? 'cancelled' : 'scheduled',
        zoomMeetingUrl: 'https://zoom.us/j/demo123456',
        courseName: 'IGCSE Mathematics & Science',
        attendeeCount: 1,
      });
    }

    setSessions((prev) => [...prev, ...newSamples]);
    showToast(`Added ${newSamples.length} luxury sample sessions to calendar!`);
    setIsFilterOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-[#080D16] text-gray-900 dark:text-gray-100 overflow-hidden select-none font-sans">
      {/* ─── ULTRA-PREMIUM HEADER ─── */}
      <div className="relative z-30 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] shrink-0">
        {/* Left: Month Year + Date Navigators */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 min-w-[130px]">
            {headerDateTitle}
          </h1>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={handleNavToday}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-2xs transition-all active:scale-95"
            >
              Today
            </button>
            <button
              onClick={handleNavPrev}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNavNext}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Google Calendar Synced Badge */}
          {calendarConnected ? (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Google Calendar Synced</span>
            </div>
          ) : (
            <button
              onClick={() => setIsOAuthHelpOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium ml-2 transition-colors"
            >
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>Sync Calendar</span>
            </button>
          )}
        </div>

        {/* Right Controls: View Dropdown + Filter + Add Button */}
        <div className="flex items-center gap-2.5 relative z-30">
          {/* View Dropdown: 6-Mode Selector matching screenshot */}
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

          {/* + Add Button (Sleek dark pill button as in screenshot) */}
          <button
            type="button"
            onClick={() => handleOpenBookModal()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN CALENDAR VIEW AREA ─── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#080D16]">
        {/* ========================================================================= */}
        {/* 1. MONTH (COMPACT) VIEW — THE REFERENCE HERO LAYOUT */}
        {/* ========================================================================= */}
        {viewMode === 'Month (Compact)' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Weekdays Row: Monday to Sunday */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111622] shrink-0">
              {WEEKDAYS.map((dayName) => (
                <div
                  key={dayName}
                  className="py-2.5 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* 42-day Calendar Grid (6 rows x 7 cols) */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-b border-l border-gray-200 dark:border-gray-800 min-h-[640px] bg-gray-200/50 dark:bg-gray-800/40 gap-[1px]">
              {monthDays.map((day, idx) => {
                const daySessions = filteredSessions.filter(
                  (s) => new Date(s.scheduledAt).toDateString() === day.toDateString(),
                );
                const inCurrentMonth = isCurrentMonth(day);
                const today = isToday(day);
                const isOver = dragOverSlot === day.toDateString();

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverSlot(day.toDateString());
                    }}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => handleDropMonthDay(e, day)}
                    className={`p-2 flex flex-col justify-start overflow-hidden transition-all relative min-h-[105px] ${
                      inCurrentMonth
                        ? 'bg-white dark:bg-[#111622]'
                        : 'bg-gray-50/70 dark:bg-[#0d1117] opacity-60'
                    } ${isOver ? 'bg-blue-50/80 dark:bg-blue-900/30 ring-2 ring-blue-400 z-10' : ''}`}
                  >
                    {/* Top Header of Day Cell */}
                    <div className="flex items-center justify-between mb-1.5">
                      {today ? (
                        <span className="w-6 h-6 rounded-full bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-bold text-xs flex items-center justify-center shadow-xs">
                          {day.getDate()}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            inCurrentMonth
                              ? 'text-gray-800 dark:text-gray-200'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      )}

                      {/* Quick Add Button */}
                      <button
                        onClick={() => handleOpenBookModal(day, 10)}
                        className="opacity-0 hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-blue-600 transition-opacity"
                        title="Add session on this day"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Stack of Ultra-Luxury Session Blocks */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                      {daySessions.slice(0, 5).map((s) => {
                        const palette = getSessionPalette(s.title, s.id);
                        const isCancelled = s.status === 'cancelled';

                        return (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, s);
                            }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopoverSession(s);
                            }}
                            className={`group/block flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border truncate transition-all duration-150 hover:shadow-xs hover:scale-[1.01] cursor-pointer select-none ${palette.bg} ${palette.border} ${palette.text} ${
                              isCancelled ? 'line-through opacity-70 text-red-600 dark:text-red-400 decoration-red-500' : ''
                            } ${draggingSessionId === s.id ? 'opacity-40 ring-2 ring-blue-400' : ''}`}
                            title={`${s.title} (${formatTime(s.scheduledAt)}) - Click for details`}
                          >
                            {/* Checkmark or X icon */}
                            {isCancelled ? (
                              <span className="text-[10px] text-red-500 font-bold shrink-0">✕</span>
                            ) : s.status === 'completed' ? (
                              <span className="text-[10px] text-blue-600 font-bold shrink-0">✓</span>
                            ) : (
                              <Check className={`w-2.5 h-2.5 shrink-0 ${palette.iconColor}`} />
                            )}

                            {/* Bold Time */}
                            <span className={`font-semibold shrink-0 text-[10.5px] ${palette.time}`}>
                              {formatTimeShort(s.scheduledAt)}
                            </span>

                            {/* Session Title */}
                            <span className={`truncate font-medium flex-1 ${isCancelled ? 'line-through' : ''}`}>
                              {s.title}
                            </span>

                            {/* Session Note icon indicator if topic/agenda exists */}
                            {s.topic && (
                              <span title="Has Session Notes" className="inline-flex items-center">
                                <FileText className="w-2.5 h-2.5 shrink-0 opacity-60 group-hover/block:opacity-100" />
                              </span>
                            )}
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

        {/* ========================================================================= */}
        {/* 2. WEEK VIEW (AGENDA) */}
        {/* ========================================================================= */}
        {viewMode === 'Week (Agenda)' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Time Gutter */}
            <div
              ref={timeGutterRef}
              className="w-14 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#161B26] overflow-hidden select-none no-scrollbar"
            >
              <div className="h-10 border-b border-gray-200 dark:border-gray-800" />
              {hours.map((h) => (
                <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1 border-b border-transparent">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns Container */}
            <div
              ref={gridContainerRef}
              onScroll={handleGridScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden relative"
            >
              {/* Day Headers (Sticky) */}
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] sticky top-0 z-20 shadow-xs">
                {weekDays.map((day) => {
                  const today = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('Day');
                      }}
                      className={`h-10 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-800 last:border-r-0 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                        today ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 rounded-full ${
                          today ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body */}
              <div className="relative grid grid-cols-7 min-h-[832px]">
                {weekDays.map((day) => {
                  const daySessions = filteredSessions.filter(
                    (s) => new Date(s.scheduledAt).toDateString() === day.toDateString(),
                  );
                  const today = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative border-r border-gray-200 dark:border-gray-800 last:border-r-0 ${
                        today ? 'bg-blue-50/15 dark:bg-blue-950/10' : ''
                      }`}
                    >
                      {/* Hour slots */}
                      {hours.map((h) => {
                        const slotKey = `${day.toISOString().split('T')[0]}-${h}`;
                        const isOver = dragOverSlot === slotKey;

                        return (
                          <div
                            key={h}
                            onDragOver={(e) => handleDragOver(e, slotKey)}
                            onDragLeave={(e) => handleDragLeave(e, slotKey)}
                            onDrop={(e) => handleDropSlot(e, day, h)}
                            onClick={() => handleOpenBookModal(day, h)}
                            className={`h-16 border-b border-gray-100 dark:border-gray-800/60 transition-colors group cursor-pointer relative ${
                              isOver ? 'bg-blue-50 dark:bg-blue-600/20 border-2 border-dashed border-blue-400 z-10' : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                            }`}
                            title={`Click to schedule session at ${h > 12 ? `${h - 12} PM` : `${h} AM`}`}
                          >
                            <span className="opacity-0 group-hover:opacity-60 text-[9px] text-blue-600 dark:text-blue-400 absolute top-1 left-1 font-mono">
                              +
                            </span>
                          </div>
                        );
                      })}

                      {/* Current time horizontal indicator */}
                      {today && currentTimePercentage !== null && (
                        <div
                          style={{ top: `${currentTimePercentage}%` }}
                          className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm -ml-1" />
                          <div className="flex-1 h-[2px] bg-red-500/90 shadow-sm" />
                        </div>
                      )}

                      {/* Session Blocks in Week View */}
                      {daySessions.map((s) => {
                        const palette = getSessionPalette(s.title, s.id);
                        const d = new Date(s.scheduledAt);
                        const startHour = d.getHours() + d.getMinutes() / 60;
                        const topPx = (startHour - 7) * 64;
                        const heightPx = Math.max(30, (s.durationMin / 60) * 64);
                        const isDragging = draggingSessionId === s.id;

                        return (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, s)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopoverSession(s);
                            }}
                            style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                            className={`absolute inset-x-1 rounded-lg border p-1.5 cursor-pointer shadow-xs transition-all z-10 overflow-hidden ${palette.bg} ${palette.border} ${palette.text} ${
                              isDragging ? 'opacity-40 ring-2 ring-blue-400' : 'hover:shadow-md hover:scale-[1.01]'
                            }`}
                            title={`${s.title} (${formatTime(s.scheduledAt)}) - Click for notes & details`}
                          >
                            <div className="flex items-center justify-between gap-1 leading-tight">
                              <div className="flex items-center gap-1 truncate font-bold text-[11px]">
                                <Check className={`w-3 h-3 shrink-0 ${palette.iconColor}`} />
                                <span className="truncate">{s.title}</span>
                              </div>
                              {s.topic && <FileText className="w-2.5 h-2.5 opacity-60 shrink-0" />}
                            </div>

                            {heightPx > 42 && (
                              <div className="flex items-center gap-1 text-[10px] opacity-80 mt-0.5">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span>{formatTimeShort(s.scheduledAt)} ({s.durationMin}m)</span>
                              </div>
                            )}
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

        {/* ========================================================================= */}
        {/* 3. DAY VIEW */}
        {/* ========================================================================= */}
        {viewMode === 'Day' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Time gutter */}
            <div
              ref={timeGutterRef}
              className="w-16 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#161B26] overflow-hidden no-scrollbar select-none"
            >
              <div className="h-10 border-b border-gray-200 dark:border-gray-800" />
              {hours.map((h) => (
                <div key={h} className="h-20 flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Column */}
            <div
              ref={gridContainerRef}
              onScroll={handleGridScroll}
              className="flex-1 overflow-y-auto relative"
            >
              {/* Sticky day header */}
              <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] px-4 flex items-center justify-between sticky top-0 z-20">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {isToday(currentDate) && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-xs font-semibold">
                    Today
                  </span>
                )}
              </div>

              {/* Day Grid */}
              <div className="relative min-h-[1040px]">
                {hours.map((h) => {
                  const slotKey = `day-${h}`;
                  const isOver = dragOverSlot === slotKey;

                  return (
                    <div
                      key={h}
                      onDragOver={(e) => handleDragOver(e, slotKey)}
                      onDragLeave={(e) => handleDragLeave(e, slotKey)}
                      onDrop={(e) => handleDropSlot(e, currentDate, h)}
                      onClick={() => handleOpenBookModal(currentDate, h)}
                      className={`h-20 border-b border-gray-100 dark:border-gray-800/60 px-4 flex items-center justify-between group cursor-pointer transition-colors ${
                        isOver ? 'bg-blue-50 dark:bg-blue-600/20 border-2 border-dashed border-blue-400' : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                      }`}
                    >
                      <span className="text-xs text-gray-400 group-hover:text-blue-600 font-medium">
                        Click to add session at {h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
                      </span>
                    </div>
                  );
                })}

                {/* Day Sessions */}
                {filteredSessions
                  .filter((s) => new Date(s.scheduledAt).toDateString() === currentDate.toDateString())
                  .map((s) => {
                    const palette = getSessionPalette(s.title, s.id);
                    const d = new Date(s.scheduledAt);
                    const startHour = d.getHours() + d.getMinutes() / 60;
                    const topPx = (startHour - 7) * 80;
                    const heightPx = Math.max(54, (s.durationMin / 60) * 80);

                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopoverSession(s);
                        }}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        className={`absolute left-4 right-6 rounded-xl border p-3.5 cursor-pointer shadow-sm z-10 flex flex-col justify-between transition-all ${palette.bg} ${palette.border} ${palette.text} hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Check className={`w-4 h-4 shrink-0 ${palette.iconColor}`} />
                              <span className="font-bold text-sm">{s.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/20 uppercase font-semibold border border-current">
                                {s.status}
                              </span>
                            </div>
                            {s.topic && <p className="text-xs opacity-80 mt-1 line-clamp-1">{s.topic}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium bg-white/60 dark:bg-black/20 px-2 py-1 rounded">
                              {formatTimeShort(s.scheduledAt)} ({s.durationMin}m)
                            </span>
                            {s.zoomMeetingUrl && (
                              <a
                                href={s.zoomMeetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs"
                              >
                                <Video className="w-3.5 h-3.5" /> Join Zoom
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs opacity-80 mt-1">
                          <div className="flex items-center gap-3">
                            {s.courseName && <span>Course: {s.courseName}</span>}
                            <span>{s.attendeeCount} learner{s.attendeeCount !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            Click to edit notes &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* 4. MONTH (DETAILED) VIEW */}
        {/* ========================================================================= */}
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
                              {s.courseName || 'Class'} · {s.attendeeCount} learner{s.attendeeCount !== 1 ? 's' : ''}
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

        {/* ========================================================================= */}
        {/* 5. WEEK (LIST) VIEW */}
        {/* ========================================================================= */}
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
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Course: {s.courseName || 'Unassigned'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{s.attendeeCount} Attendee{s.attendeeCount !== 1 ? 's' : ''}</p>
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

        {/* ========================================================================= */}
        {/* 6. LOCATION VIEW */}
        {/* ========================================================================= */}
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
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.courseName || 'Class'} · {s.attendeeCount} Learners</p>
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
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.courseName || 'In-Person'} · Room 102</p>
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

      {/* ─── QUICK SESSION POPOVER CARD (MATCHES SCREENSHOT 3) ─── */}
      {popoverSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setPopoverSession(null)}
        >
          <SessionPopoverCard
            session={{
              ...popoverSession,
              educatorName: educatorName || 'Educator',
            }}
            onClose={() => setPopoverSession(null)}
            onViewSession={() => {
              setDetailModalSession(popoverSession);
              setPopoverSession(null);
            }}
            onEditSession={() => {
              handleOpenSessionNotes(popoverSession);
              setPopoverSession(null);
            }}
          />
        </div>
      )}

      {/* ─── DETAILED SESSION MODAL (MATCHES SCREENSHOTS 1 & 2) ─── */}
      {detailModalSession && (
        <SessionDetailModal
          isOpen={Boolean(detailModalSession)}
          userRole="educator"
          session={{
            ...detailModalSession,
            educatorName: educatorName || 'Educator',
          }}
          onClose={() => setDetailModalSession(null)}
          onPlayRecording={(sess) => {
            setRecordingModalSession(sess as CalendarSession);
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
              showToast('Session updated successfully');
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {/* ─── ZOOM RECORDING PLAYER MODAL ─── */}
      {recordingModalSession && (
        <ZoomRecordingPlayerModal
          isOpen={Boolean(recordingModalSession)}
          onClose={() => setRecordingModalSession(null)}
          title={recordingModalSession.title}
          videoUrl={recordingData?.playUrl}
          downloadUrl={recordingData?.downloadUrl}
          durationMin={recordingModalSession.durationMin}
          scheduledAt={recordingModalSession.scheduledAt}
          educatorName={educatorName || 'Educator'}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. ULTRA-LUXURY SESSION DETAIL & NOTES MODAL ("s=note thing") */}
      {/* ========================================================================= */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in-50">
          <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl shadow-2xl shadow-black/90 w-full max-w-lg overflow-hidden text-gray-100 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-800/80 flex items-center justify-between bg-gradient-to-r from-[#111726] to-[#0D121D]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full ring-4 ring-purple-500/20 bg-purple-500 shrink-0" />
                <h2 className="font-bold text-base text-white tracking-tight truncate max-w-[320px]">
                  {selectedSession.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Session Meta Bento Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#131926] border border-gray-800/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium">Date & Time</p>
                    <p className="font-semibold text-xs text-gray-100 truncate mt-0.5">
                      {new Date(selectedSession.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTimeShort(selectedSession.scheduledAt)}
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
                      {selectedSession.durationMin} minutes
                    </p>
                  </div>
                </div>

                {selectedSession.courseName && (
                  <div className="col-span-2 p-3.5 rounded-xl bg-[#131926] border border-gray-800/70 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400 font-medium">Course</p>
                      <p className="font-semibold text-xs text-gray-100 truncate mt-0.5">
                        {selectedSession.courseName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── SESSION NOTES & AGENDA SECTION ─── */}
              <div className="pt-1">
                <label className="text-xs font-semibold text-gray-200 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Session Notes & Agenda
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-400 border border-gray-700/50">
                    Auto-saved to course record
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add session topics, questions to cover, homework review notes..."
                  className="w-full px-3.5 py-2.5 bg-[#070A10] border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none transition-all"
                />
                <div className="flex justify-end mt-2">
                  <FeedbackButton
                    onClick={handleSaveNotes}
                    loading={savingNote}
                    success={noteSuccess}
                    loadingText="Saving notes..."
                    successText="Notes Saved ✓"
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Save Notes
                  </FeedbackButton>
                </div>
              </div>

              {/* Zoom Meeting Card with Zoom Brand Logo */}
              {selectedSession.zoomMeetingUrl ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0C1B33] via-[#0E2447] to-[#0A182F] border border-[#2D8CFF]/40 flex items-center justify-between shadow-lg shadow-blue-950/40">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Zoom Logo */}
                    <div className="w-9 h-9 rounded-xl bg-[#2D8CFF] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 5.5A2.5 2.5 0 002 8v8a2.5 2.5 0 002.5 2.5h10A2.5 2.5 0 0017 16V8a2.5 2.5 0 00-2.5-2.5h-10zm13.793 4.293a1 1 0 00-1.293.947v2.52a1 1 0 001.293.947l3.5 1.75A1 1 0 0023 15.118V8.882a1 1 0 00-1.493-.882l-3.5 1.75z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white tracking-tight truncate">
                        Zoom Video Room Ready
                      </p>
                      <p className="text-[10px] text-blue-200/70 font-medium truncate">
                        HD Video & Audio • Secure Meeting
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSession.zoomMeetingUrl!);
                        showToast('Zoom link copied to clipboard!');
                      }}
                      className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Copy Zoom Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={selectedSession.zoomMeetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-[#2D8CFF] to-[#0B66E4] hover:from-[#3B96FF] hover:to-[#1677FF] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Join Zoom</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#131926] border border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span>No Zoom link generated yet.</span>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    selectedSession.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : selectedSession.status === 'cancelled'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  }`}>
                    {selectedSession.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateSessionStatus('completed')}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedSession.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateSessionStatus('cancelled')}
                      className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
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

      {/* ========================================================================= */}
      {/* 5. QUICK BOOK SESSION MODAL */}
      {/* ========================================================================= */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-900 dark:text-gray-100 animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1E2535]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">Schedule New Session</h2>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Session Title <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Calculus Consultation"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Topic / Agenda Notes ("s=note")
                </label>
                <input
                  type="text"
                  placeholder="e.g. Differentiation & Integration practice problems"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <CustomSelect
                    value={formDuration}
                    onChange={setFormDuration}
                    options={[
                      { value: '30', label: '30 minutes' },
                      { value: '45', label: '45 minutes' },
                      { value: '60', label: '60 minutes (1 hour)' },
                      { value: '90', label: '90 minutes (1.5 hours)' },
                      { value: '120', label: '120 minutes (2 hours)' },
                    ]}
                    placeholder="Select duration"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Course</label>
                  <CustomSelect
                    value={formCourseId}
                    onChange={(v) => {
                      setFormCourseId(v);
                      setModalError(null);
                    }}
                    options={[
                      ...coursesList.map((c) => ({ value: c.id, label: c.name })),
                      ...(coursesList.length === 0 ? [{ value: '', label: 'No published courses found', disabled: true }] : []),
                    ]}
                    placeholder="Select course..."
                    size="sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Learner (Attendee)</label>
                <CustomSelect
                  value={formLearnerIds[0] ?? ''}
                  onChange={(v) => {
                    setFormLearnerIds([v]);
                    setModalError(null);
                  }}
                  options={[
                    ...learnersList.map((l) => ({ value: l.id, label: l.name || l.email })),
                    ...(learnersList.length === 0 ? [{ value: '', label: 'No learners found', disabled: true }] : []),
                  ]}
                  placeholder="Select learner..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createZoom"
                  checked={formCreateZoom}
                  onChange={(e) => setFormCreateZoom(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="createZoom" className="text-xs text-gray-600 dark:text-gray-300">
                  Auto-generate Zoom video meeting link
                </label>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-500/70 text-red-700 dark:text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <FeedbackButton
                  type="submit"
                  loading={bookingLoading}
                  success={bookingSuccess}
                  loadingText="Booking Session..."
                  successText="Booked Successfully ✓"
                  className="px-4 py-2 text-xs font-semibold"
                >
                  Confirm Booking
                </FeedbackButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. GOOGLE CALENDAR SETUP MODAL */}
      {/* ========================================================================= */}
      {isOAuthHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-900 dark:text-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1E2535]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">Google Calendar Connect Setup</h2>
              </div>
              <button onClick={() => setIsOAuthHelpOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80">
                <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Google OAuth Redirect URI:</p>
                <p>
                  Google OAuth strictly requires that the exact redirect URI is registered in your Google Cloud Console.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">To enable real Google Calendar sync:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-600 dark:text-gray-300">
                  <li>
                    Go to{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console &rarr; Credentials <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>Click your OAuth 2.0 Client ID</li>
                  <li>
                    Under <strong className="text-gray-900 dark:text-white">Authorized redirect URIs</strong>, add:
                    <div className="mt-1 font-mono text-[11px] p-2 bg-gray-100 dark:bg-black/60 rounded border border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-300 select-all">
                      http://localhost:3000/api/v1/calendar/callback
                    </div>
                  </li>
                  <li>Click Save. Syncing will work immediately!</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                <p className="text-gray-500 dark:text-gray-400 font-medium">Want to test without Google Cloud Console right now?</p>
                <button
                  type="button"
                  onClick={handleDevConnectCalendar}
                  disabled={devConnecting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {devConnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simulate Connected Calendar (Dev Mode)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 ${
            toastMessage.type === 'error'
              ? 'bg-white dark:bg-red-950/95 border-red-500 text-red-700 dark:text-red-100'
              : 'bg-white dark:bg-emerald-950/95 border-emerald-500 text-emerald-700 dark:text-emerald-100'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Advanced Filter Modal matching screenshots */}
      <CalendarAdvancedFilterModal
        isOpen={isAdvancedFilterOpen}
        onClose={() => setIsAdvancedFilterOpen(false)}
        activeFilters={advancedFilters}
        onApplyFilters={setAdvancedFilters}
      />
    </div>
  );
}
