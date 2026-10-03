'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  RotateCcw,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Tag as TagIcon,
  X,
  Check,
  Video,
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Modals
import { TagsModal } from '@/components/courses/1on1/TagsModal';
import { AddRecurringSessionsModal, RecurringRule } from '@/components/courses/1on1/AddRecurringSessionsModal';
import { SessionPopover, CalendarSessionItem } from '@/components/courses/1on1/SessionPopover';
import { SessionDetailsModal } from '@/components/courses/1on1/SessionDetailsModal';

interface SlotEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24-hour)
  hasConflict?: boolean;
}

import { getAllTimezones } from 'countries-and-timezones';

// Generate dynamic TIMEZONES list from countries-and-timezones library
const rawTimezones: Record<string, any> = getAllTimezones();
const PRIORITY_TIMEZONE_KEYS = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Singapore',
];

const priorityList = PRIORITY_TIMEZONE_KEYS.filter((key) => rawTimezones[key]).map((key) => ({
  value: key,
  label: `(GMT${rawTimezones[key].utcOffsetStr}) ${key.replace(/_/g, ' ')}`,
}));

const remainingList = Object.values(rawTimezones)
  .filter((tz) => !PRIORITY_TIMEZONE_KEYS.includes(tz.name))
  .sort((a, b) => a.utcOffset - b.utcOffset || a.name.localeCompare(b.name))
  .map((tz) => ({
    value: tz.name,
    label: `(GMT${tz.utcOffsetStr}) ${tz.name.replace(/_/g, ' ')}`,
  }));

const TIMEZONES = [...priorityList, ...remainingList];

// Generate duration options starting from 30 mins up to 12 hours (720 mins) with 15-minute differences
function generateDurationOptions() {
  const options = [];
  for (let min = 30; min <= 720; min += 15) {
    const hours = Math.floor(min / 60);
    const remMin = min % 60;
    let label = '';
    if (hours === 0) {
      label = `${min} mins`;
    } else if (remMin === 0) {
      label = hours === 1 ? '1 hour' : `${hours} hours`;
    } else if (remMin === 30) {
      label = `${hours}.5 hours`;
    } else {
      label = `${hours === 1 ? '1 hour' : `${hours} hours`} ${remMin} mins`;
    }
    options.push({ value: String(min), label });
  }
  return options;
}

function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DURATION_OPTIONS = generateDurationOptions();

export function ScheduleSessionsClient({ courseId }: { courseId: string }) {
  const router = useRouter();

  // Course Data
  const [course, setCourse] = useState<any>(null);
  const [allEducators, setAllEducators] = useState<any[]>([]);
  const [allLearners, setAllLearners] = useState<any[]>([]);
  const [existingSessions, setExistingSessions] = useState<CalendarSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form State
  const [sessionTitle, setSessionTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Physics', 'IGCSE']);
  const [selectedEducatorId, setSelectedEducatorId] = useState<string>('');
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  const [durationMin, setDurationMin] = useState<string>('60');

  // Slots
  const [slots, setSlots] = useState<SlotEntry[]>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return [
      {
        id: 'slot-1',
        date: getLocalDateString(tomorrow),
        time: '16:00',
      },
    ];
  });

  // Calendar Controls
  const [calendarViewRole, setCalendarViewRole] = useState<'educator' | 'learner'>('educator');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Kolkata');
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday as start
    return new Date(d.setDate(diff));
  });

  // Modals state
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [popoverSession, setPopoverSession] = useState<{
    session: CalendarSessionItem;
    position: { top: number; left: number };
  } | null>(null);
  const [viewSessionDetail, setViewSessionDetail] = useState<CalendarSessionItem | null>(null);

  // Load Course and Sessions
  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, eduRes, learnRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}`),
        fetch('/api/v1/educators?perPage=100'),
        fetch('/api/v1/learners?perPage=100'),
      ]);

      let loadedCourse: any = null;
      if (cRes.ok) {
        const cData = await cRes.json();
        loadedCourse = cData.data || cData;
        setCourse(loadedCourse);
        setSessionTitle(`${loadedCourse.name || 'Physics'} 1-on-1 Session`);
      }

      let eduList: any[] = [];
      if (eduRes.ok) {
        const eduData = await eduRes.json();
        eduList = eduData.data || [];
        setAllEducators(eduList);
      }

      let learnList: any[] = [];
      if (learnRes.ok) {
        const learnData = await learnRes.json();
        learnList = learnData.data || [];
        setAllLearners(learnList);
      }

      // Initial educator selection
      if (loadedCourse?.educators && loadedCourse.educators.length > 0) {
        setSelectedEducatorId(loadedCourse.educators[0].id);
      } else if (eduList.length > 0) {
        setSelectedEducatorId(eduList[0].id);
      }

      // Initial learner selection
      if (loadedCourse?.learners && loadedCourse.learners.length > 0) {
        setSelectedLearnerId(loadedCourse.learners[0].id);
      } else if (learnList.length > 0) {
        const match = learnList.find((l: any) => l.name?.toLowerCase().includes('swayam')) || learnList[0];
        setSelectedLearnerId(match.id);
      }
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadData();
  }, [courseId]);

  // Fetch calendar events dynamically based on selected tab and user
  useEffect(() => {
    let isCancelled = false;

    async function fetchCalendarSessions() {
      try {
        let url = '';
        if (calendarViewRole === 'educator') {
          if (!selectedEducatorId) {
            setExistingSessions([]);
            return;
          }
          url = `/api/v1/sessions?educatorId=${selectedEducatorId}&perPage=200`;
        } else {
          if (!selectedLearnerId) {
            setExistingSessions([]);
            return;
          }
          url = `/api/v1/sessions?learnerId=${selectedLearnerId}&perPage=200`;
        }

        const res = await fetch(url);
        if (res.ok && !isCancelled) {
          const sData = await res.json();
          const items = (sData.data || sData.sessions || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            courseId: s.courseId,
            educatorId: s.educatorId,
            educatorName: s.educatorName,
            studentName: s.studentName,
            startTime: s.scheduledAt || s.startTime,
            endTime:
              s.endTime ||
              new Date(new Date(s.scheduledAt || s.startTime).getTime() + (s.durationMin || 60) * 60000).toISOString(),
            status: s.status?.toUpperCase() || 'SCHEDULED',
            meetingUrl: s.zoomMeetingUrl || s.meetingUrl,
            recordingUrl: s.recordingUrl,
            tags: s.tags || [],
            aiSummary: s.aiSummary,
            creditsDeducted: s.creditsConsumed || 1,
          }));
          setExistingSessions(items);
        }
      } catch (err) {
        console.error('Failed to load calendar events:', err);
      }
    }

    fetchCalendarSessions();
    return () => {
      isCancelled = true;
    };
  }, [calendarViewRole, selectedEducatorId, selectedLearnerId]);

  // Conflict Detection: check if any slot overlaps with existing sessions
  const conflictsCount = useMemo(() => {
    let count = 0;
    const durMs = parseInt(durationMin) * 60000;

    const updatedSlots = slots.map((slot) => {
      const slotStart = new Date(`${slot.date}T${slot.time}:00`).getTime();
      const slotEnd = slotStart + durMs;

      const hasOverlap = existingSessions.some((ex) => {
        if (ex.status === 'CANCELLED') return false;
        const exStart = new Date(ex.startTime).getTime();
        const exEnd = new Date(ex.endTime).getTime();
        return slotStart < exEnd && slotEnd > exStart;
      });

      if (hasOverlap) count++;
      return { ...slot, hasConflict: hasOverlap };
    });

    return count;
  }, [slots, durationMin, existingSessions]);

  // Add single slot
  const handleAddSlot = () => {
    const lastSlot = slots[slots.length - 1];
    let nextDate = new Date();
    if (lastSlot) {
      const prev = new Date(`${lastSlot.date}T${lastSlot.time}:00`);
      prev.setDate(prev.getDate() + 2); // 2 days later
      nextDate = prev;
    }
    setSlots([
      ...slots,
      {
        id: `slot-${Date.now()}`,
        date: getLocalDateString(nextDate),
        time: lastSlot ? lastSlot.time : '16:00',
      },
    ]);
  };

  // Remove slot
  const handleRemoveSlot = (id: string) => {
    if (slots.length > 1) {
      setSlots(slots.filter((s) => s.id !== id));
    }
  };

  // Apply Recurring Rule (Screenshots 007, 008)
  const handleApplyRecurring = (rule: RecurringRule) => {
    const newSlots: SlotEntry[] = [];
    const baseTime = slots[0]?.time || '16:00';
    let current = new Date(`${rule.startDate}T${baseTime}:00`);
    const maxCount = rule.endType === 'after_occurrences' ? rule.occurrences || 10 : 30;
    const endBoundary = rule.endType === 'on_date' && rule.endDate ? new Date(rule.endDate) : null;

    let generated = 0;
    while (generated < maxCount && (!endBoundary || current <= endBoundary)) {
      if (rule.frequency === 'Day') {
        newSlots.push({
          id: `rec-${generated}-${Date.now()}`,
          date: getLocalDateString(current),
          time: baseTime,
        });
        generated++;
        current.setDate(current.getDate() + rule.interval);
      } else if (rule.frequency === 'Week') {
        if (rule.daysOfWeek.includes(current.getDay())) {
          newSlots.push({
            id: `rec-${generated}-${Date.now()}`,
            date: getLocalDateString(current),
            time: baseTime,
          });
          generated++;
        }
        current.setDate(current.getDate() + 1);
      } else if (rule.frequency === 'Month') {
        newSlots.push({
          id: `rec-${generated}-${Date.now()}`,
          date: getLocalDateString(current),
          time: baseTime,
        });
        generated++;
        current.setMonth(current.getMonth() + rule.interval);
      }
    }

    if (newSlots.length > 0) {
      setSlots(newSlots);
    }
  };

  // Submit and create all sessions in real database!
  const handleCreateSessions = async () => {
    if (!sessionTitle.trim()) {
      alert('Please enter a session name');
      return;
    }
    if (!selectedEducatorId) {
      alert('Please select an educator');
      return;
    }

    setCreating(true);
    try {
      const learnerId = selectedLearnerId || course?.learners?.[0]?.id;
      const dur = parseInt(durationMin);

      // Auto-assign educator to course if not already assigned
      const isEduAssigned = course?.educators?.some((e: any) => e.id === selectedEducatorId);
      if (!isEduAssigned && courseId) {
        await fetch(`/api/v1/courses/${courseId}/educators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ educatorId: selectedEducatorId }),
        }).catch((err) => console.error('Failed to auto-assign educator:', err));
      }

      // Auto-enroll learner in course if not already enrolled
      const isLearnerEnrolled = course?.learners?.some((l: any) => l.id === learnerId);
      if (!isLearnerEnrolled && learnerId && courseId) {
        await fetch('/api/v1/credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            learnerId,
            amount: 0,
            type: 'credit',
            reason: 'Auto-enroll for 1-on-1 personalized schedule',
          }),
        }).catch((err) => console.error('Failed to auto-enroll learner:', err));
      }

      // Create each session sequentially
      for (const slot of slots) {
        const scheduledAt = new Date(`${slot.date}T${slot.time}:00`).toISOString();
        const res = await fetch('/api/v1/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            educatorId: selectedEducatorId,
            title: sessionTitle,
            scheduledAt,
            durationMin: dur,
            creditsConsumed: 1,
            learnerIds: learnerId ? [learnerId] : [],
            createZoomMeeting: true,
            tags: selectedTags,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create session');
        }
      }

      // Success: redirect back to course workspace
      router.push(`/admin/courses/1-on-1/${courseId}`);
    } catch (err: any) {
      console.error('Failed to create sessions:', err);
      alert(err.message || 'Error creating sessions. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // 7 Days of the week
  const weekDays = useMemo(() => {
    const days = [];
    const curr = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(curr.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStartDate]);

  const navWeek = (direction: number) => {
    const next = new Date(weekStartDate);
    next.setDate(next.getDate() + direction * 7);
    setWeekStartDate(next);
  };

  const setToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day;
    setWeekStartDate(new Date(d.setDate(diff)));
  };

  // Hourly grid rows (08:00 AM to 08:00 PM)
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 to 20

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500">Loading schedule workspace...</p>
      </div>
    );
  }

  const primaryLearner =
    course?.learners?.find((l: any) => l.id === selectedLearnerId) ||
    course?.learners?.[0] ||
    allLearners.find((l: any) => l.id === selectedLearnerId) ||
    allLearners[0] ||
    { name: 'Learner' };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
      {/* Top Header (Screenshots 005, 006) */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/admin/courses/1-on-1/${courseId}`)}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to course"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span
                onClick={() => router.push(`/admin/courses/1-on-1/${courseId}`)}
                className="font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                {course?.name || '1-on-1 Personalisation'}
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">/</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                Schedule Sessions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/admin/courses/1-on-1/${courseId}`)}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSessions}
              disabled={creating}
              className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Scheduling Form + Right Calendar */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===================== LEFT PANEL: FORM (4 cols) ===================== */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
            {/* Session Name & Tag button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Session Name
                </label>
                <button
                  type="button"
                  onClick={() => setIsTagsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  Add Tag
                </button>
              </div>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Physics 1-on-1: Electromagnetic Induction"
                className="w-full px-3.5 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {/* Tag Badges */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        className="hover:opacity-75"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Educator selector (CustomSelect) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Educator
              </label>
              <CustomSelect
                value={selectedEducatorId}
                onChange={(val) => setSelectedEducatorId(val as string)}
                options={
                  allEducators.length > 0
                    ? allEducators.map((e) => ({
                        value: e.id,
                        label: e.name || 'Educator',
                        subLabel: e.email,
                      }))
                    : [{ value: '', label: 'Loading educators...' }]
                }
              />
            </div>

            {/* Learner selector (CustomSelect) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Learner
              </label>
              <CustomSelect
                value={selectedLearnerId}
                onChange={(val) => setSelectedLearnerId(val as string)}
                options={
                  allLearners.length > 0
                    ? allLearners.map((l) => ({
                        value: l.id,
                        label: l.name || 'Learner',
                        subLabel: l.email,
                      }))
                    : (course?.learners || []).map((l: any) => ({
                        value: l.id,
                        label: l.name || 'Learner',
                        subLabel: l.email,
                      }))
                }
              />
            </div>

            {/* Duration selector (CustomSelect) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Duration
              </label>
              <CustomSelect
                value={durationMin}
                onChange={(val) => setDurationMin(val as string)}
                options={DURATION_OPTIONS}
              />
            </div>

            {/* Session Occurrences section (Screenshots 005, 009) */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Session Slots ({slots.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add session
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecurringModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Add recurring
                  </button>
                </div>
              </div>

              {/* Conflict indicator banner if overlaps (Screenshot 009, 010) */}
              {conflictsCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Educator session overlap detected</span>
                  </div>
                  <span className="font-bold px-2 py-0.5 bg-amber-200/60 dark:bg-amber-900 rounded-md">
                    {conflictsCount} Conflict{conflictsCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Slots List */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {slots.map((slot, index) => {
                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border flex items-center gap-2 transition ${
                        slot.hasConflict
                          ? 'border-amber-400 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40'
                      }`}
                    >
                      <span className="text-xs font-bold text-neutral-400 w-5">
                        {index + 1}.
                      </span>

                      {/* Date Picker */}
                      <input
                        type="date"
                        value={slot.date}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlots(slots.map((s) => (s.id === slot.id ? { ...s, date: val } : s)));
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />

                      {/* Time Picker */}
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlots(slots.map((s) => (s.id === slot.id ? { ...s, time: val } : s)));
                        }}
                        className="w-28 px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />

                      {/* Delete slot button */}
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition"
                          title="Remove slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT PANEL: CALENDAR (8 cols) ===================== */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Calendar Top Toolbar (Screenshots 005, 006) */}
          <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* View Toggle Tabs: Educator vs Learner */}
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => setCalendarViewRole('educator')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  calendarViewRole === 'educator'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Educator Schedule
              </button>
              <button
                type="button"
                onClick={() => setCalendarViewRole('learner')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  calendarViewRole === 'learner'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Learner ({primaryLearner.name})
              </button>
            </div>

            {/* Timezone CustomSelect & Week Navigation */}
            <div className="flex items-center gap-3">
              <div className="w-56">
                <CustomSelect
                  value={selectedTimezone}
                  onChange={(val) => setSelectedTimezone(val as string)}
                  options={TIMEZONES}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={setToday}
                  className="px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => navWeek(-1)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 px-1">
                  {weekDays[0].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} -{' '}
                  {weekDays[6].toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => navWeek(1)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Calendar Grid */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[680px]">
            <div className="min-w-[750px]">
              {/* Day Columns Header */}
              <div className="grid grid-cols-8 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
                <div className="p-3 text-[11px] font-bold text-neutral-400 text-center border-r border-neutral-200 dark:border-neutral-800">
                  TIME
                </div>
                {weekDays.map((date, idx) => {
                  const isCurrentToday = new Date().toDateString() === date.toDateString();
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 text-center border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 ${
                        isCurrentToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <span className="block text-[10px] font-bold text-neutral-400 uppercase">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`inline-block text-sm font-extrabold mt-0.5 ${
                          isCurrentToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto'
                            : 'text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hour Rows */}
              <div className="relative">
                {HOURS.map((hour) => {
                  const hourLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

                  return (
                    <div
                      key={hour}
                      className="grid grid-cols-8 border-b border-neutral-100 dark:border-neutral-800/80 min-h-[56px]"
                    >
                      {/* Time Label */}
                      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 text-right pr-3 border-r border-neutral-200 dark:border-neutral-800">
                        {hourLabel}
                      </div>

                      {/* 7 Day cells for this hour */}
                      {weekDays.map((date, colIdx) => {
                        const dateStr = getLocalDateString(date);

                        // Find existing sessions in this hour cell
                        const cellSessions = existingSessions.filter((s) => {
                          const sDate = new Date(s.startTime);
                          const sDateStr = getLocalDateString(sDate);
                          return sDateStr === dateStr && sDate.getHours() === hour;
                        });

                        // Find newly added draft slots in this hour cell
                        const cellDraftSlots = slots.filter((slot) => {
                          const slotHour = parseInt(slot.time.split(':')[0]);
                          return slot.date === dateStr && slotHour === hour;
                        });

                        return (
                          <div
                            key={colIdx}
                            className="p-1 border-r last:border-r-0 border-neutral-100 dark:border-neutral-800/80 relative hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition group"
                          >
                            {/* Existing sessions */}
                            {cellSessions.map((session) => (
                              <div
                                key={session.id}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setPopoverSession({
                                    session,
                                    position: { top: rect.bottom + 8, left: rect.left },
                                  });
                                }}
                                className={`p-1.5 mb-1 rounded-lg text-[11px] font-semibold cursor-pointer truncate shadow-xs transition ${
                                  session.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                }`}
                              >
                                <span className="block truncate">{session.title}</span>
                                <span className="block text-[9px] opacity-80">
                                  {new Date(session.startTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            ))}

                            {/* Draft session blocks being configured */}
                            {cellDraftSlots.map((slot) => (
                              <div
                                key={slot.id}
                                className={`p-1.5 mb-1 rounded-lg text-[11px] font-bold border-2 border-dashed shadow-xs animate-pulse ${
                                  slot.hasConflict
                                    ? 'border-amber-500 bg-amber-100/80 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300'
                                    : 'border-blue-500 bg-blue-100/80 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300'
                                }`}
                              >
                                <span className="block truncate">{sessionTitle || 'New Session'}</span>
                                <span className="block text-[9px]">
                                  {slot.time} ({durationMin}m)
                                </span>
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
        </div>
      </div>

      {/* ===================== POPUPS & MODALS ===================== */}

      {/* 1. Tags Modal (Screenshot 011) */}
      <TagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        selectedTagNames={selectedTags}
        onApply={(tags) => setSelectedTags(tags)}
      />

      {/* 2. Recurring Sessions Modal (Screenshots 007, 008) */}
      <AddRecurringSessionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        initialStartDate={slots[0]?.date}
        onApply={handleApplyRecurring}
      />

      {/* 3. Session Popover (Screenshot 012) */}
      {popoverSession && (
        <SessionPopover
          session={popoverSession.session}
          position={popoverSession.position}
          onClose={() => setPopoverSession(null)}
          onViewSession={(s) => setViewSessionDetail(s)}
          onCancelSession={(sId) => {
            setExistingSessions((prev) =>
              prev.map((s) => (s.id === sId ? { ...s, status: 'CANCELLED' } : s))
            );
          }}
        />
      )}

      {/* 4. Session Details Modal (Screenshot 013) */}
      <SessionDetailsModal
        isOpen={!!viewSessionDetail}
        onClose={() => setViewSessionDetail(null)}
        session={viewSessionDetail}
        courseName={course?.name || ''}
        onSessionUpdated={loadData}
      />
    </div>
  );
}
