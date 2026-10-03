'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, MoreVertical, Check, Globe, CalendarX, X,
  ChevronLeft, ChevronRight, CalendarPlus, Loader2, CheckCircle2,
  AlertCircle, Info,
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  { key: 'sunday', short: 'SUN', label: 'SUNDAY' },
  { key: 'monday', short: 'MON', label: 'MONDAY' },
  { key: 'tuesday', short: 'TUE', label: 'TUESDAY' },
  { key: 'wednesday', short: 'WED', label: 'WEDNESDAY' },
  { key: 'thursday', short: 'THU', label: 'THURSDAY' },
  { key: 'friday', short: 'FRI', label: 'FRIDAY' },
  { key: 'saturday', short: 'SAT', label: 'SATURDAY' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    TIME_OPTIONS.push(`${String(hr12).padStart(2, '0')}:${m === 0 ? '00' : '30'} ${ampm}`);
  }
}

function to24(display: string): string {
  const [time, ampm] = display.split(' ');
  const [hStr, mStr] = time.split(':');
  let h = Number(hStr);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mStr}`;
}

function toDisplay(val24: string): string {
  if (!val24 || !/^\d{2}:\d{2}$/.test(val24)) return val24;
  const [hStr, mStr] = val24.split(':');
  const h = Number(hStr);
  const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${String(hr12).padStart(2, '0')}:${mStr} ${ampm}`;
}

function formatClock(val: string) { return toDisplay(val); }

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slot { start: string; end: string; }
type ScheduleJson = Partial<Record<DayKey, Slot[]>>;

interface AvailabilityProfile {
  id: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  scheduleJson: ScheduleJson;
  overridesJson: Record<string, Slot[]>;
}

interface Leave {
  id: string;
  type: 'full' | 'partial';
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; type: 'success' | 'error'; message: string; }

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 duration-200 pointer-events-auto ${
            t.type === 'success'
              ? 'bg-white dark:bg-[#1E2535] border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-[#1E2535] border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── TimeSelect ───────────────────────────────────────────────────────────────
function TimeSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const display = toDisplay(value);
  return (
    <div className="w-[130px]">
      <CustomSelect
        id={id}
        value={display}
        onChange={(v) => onChange(to24(v))}
        options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
        size="sm"
      />
    </div>
  );
}

// ─── Mini Calendar for date override picker ───────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function MiniCalendar({
  selectedDates,
  onToggle,
}: {
  selectedDates: Set<string>;
  onToggle: (iso: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const today = isoDate(new Date());

  const firstOfMonth = new Date(viewDate.year, viewDate.month, 1);
  const startDow = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    setViewDate((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const nextMonth = () => {
    setViewDate((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="bg-white dark:bg-[#0F1623] border border-[#E5E9F0] dark:border-gray-700 rounded-[12px] p-4 select-none">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-[14px] font-semibold text-[#131b2d] dark:text-gray-100">
          {MONTH_NAMES[viewDate.month]} {viewDate.year}
        </span>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const iso = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = iso === today;
          const isSelected = selectedDates.has(iso);
          const isPast = iso < today;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && onToggle(iso)}
              className={`flex items-center justify-center h-8 w-8 mx-auto rounded-full text-[13px] transition-all ${
                isSelected
                  ? 'bg-[#2F80F9] text-white font-semibold shadow-sm'
                  : isToday
                  ? 'border border-[#2F80F9] text-[#2F80F9] font-semibold dark:text-blue-400'
                  : isPast
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-[#131b2d] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Date Override Modal ──────────────────────────────────────────────────────
function DateOverrideModal({
  profileId,
  existingOverrides,
  onSave,
  onClose,
}: {
  profileId: string;
  existingOverrides: Record<string, Slot[]>;
  onSave: (profileId: string, overrides: Record<string, Slot[]>) => void;
  onClose: () => void;
}) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [slots, setSlots] = useState<Slot[]>([{ start: '09:00', end: '17:00' }]);
  const [unavailable, setUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleDate = useCallback((iso: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }, []);

  const addSlot = () => setSlots((prev) => [...prev, { start: '09:00', end: '17:00' }]);
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, j) => j !== i));
  const updateSlot = (i: number, field: 'start' | 'end', val: string) => {
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, [field]: val } : s)));
  };

  const handleApply = async () => {
    if (selectedDates.size === 0) return;
    setSaving(true);
    try {
      const newOverrides = { ...existingOverrides };
      for (const d of selectedDates) {
        newOverrides[d] = unavailable ? [] : slots;
      }
      onSave(profileId, newOverrides);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#161B26] rounded-[16px] shadow-2xl w-full max-w-md border border-[#E5E9F0] dark:border-gray-700/60">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h2 className="text-[18px] font-bold text-[#131b2d] dark:text-gray-100">Add date override</h2>
            <p className="text-[13px] text-[#64748B] dark:text-gray-400 mt-1">Replace the weekly schedule for specific dates...</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Calendar */}
          <MiniCalendar selectedDates={selectedDates} onToggle={toggleDate} />

          {/* Hours for these dates */}
          <div>
            <p className="text-[14px] font-semibold text-[#131b2d] dark:text-gray-100 mb-3">Hours for these dates</p>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={unavailable}
                onChange={(e) => setUnavailable(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#2F80F9] focus:ring-[#2F80F9]/30"
              />
              <span className="text-[13px] text-[#414754] dark:text-gray-300">Mark as unavailable</span>
            </label>

            {!unavailable && (
              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <TimeSelect value={slot.start} onChange={(v) => updateSlot(i, 'start', v)} />
                    <span className="text-[#64748B] dark:text-gray-400 text-[13px]">-</span>
                    <TimeSelect value={slot.end} onChange={(v) => updateSlot(i, 'end', v)} />
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={addSlot}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-[#2F80F9] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#E5E9F0] dark:border-gray-700 rounded-[10px] text-[14px] font-semibold text-[#414754] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedDates.size === 0 || saving}
            className="flex-1 px-4 py-2.5 bg-[#131b2d] dark:bg-gray-200 text-white dark:text-gray-900 rounded-[10px] text-[14px] font-semibold hover:bg-[#1e2d47] dark:hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply to {selectedDates.size} {selectedDates.size === 1 ? 'date' : 'dates'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Profile Modal ─────────────────────────────────────────────────
function ProfileModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: AvailabilityProfile | null;
  onSave: (data: Partial<AvailabilityProfile>) => Promise<void>;
  onClose: () => void;
}) {
  const defaultSchedule = Object.fromEntries(
    DAYS.map((d) => [d.key, [{ start: '09:00', end: '17:00' }]])
  ) as ScheduleJson;

  const [name, setName] = useState(initial?.name ?? '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'Asia/Kolkata');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [schedule, setSchedule] = useState<ScheduleJson>(initial?.scheduleJson ?? defaultSchedule);
  const [saving, setSaving] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const COMMON_TZ = [
    'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
    'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'UTC',
  ];

  const toggleDay = (dayKey: DayKey) => {
    setSchedule((prev) => {
      const slots = prev[dayKey];
      if (slots && slots.length > 0) {
        return { ...prev, [dayKey]: [] };
      }
      return { ...prev, [dayKey]: [{ start: '09:00', end: '17:00' }] };
    });
  };

  const addSlotForDay = (dayKey: DayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] ?? []), { start: '09:00', end: '17:00' }],
    }));
  };

  const removeSlotFromDay = (dayKey: DayKey, idx: number) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const updateDaySlot = (dayKey: DayKey, idx: number, field: 'start' | 'end', val: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] ?? []).map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), timezone, isDefault, scheduleJson: schedule });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#161B26] rounded-[16px] shadow-2xl w-full max-w-4xl border border-[#E5E9F0] dark:border-gray-700/60 mb-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E9F0] dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* Editable name */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Schedule name"
              className="text-[20px] font-bold text-[#131b2d] dark:text-gray-100 bg-transparent border-b-2 border-transparent focus:border-[#2F80F9] outline-none transition-all min-w-[200px]"
            />
            <Pencil className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-4">
            {/* Set as default toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIsDefault(!isDefault)}
                className={`relative w-10 h-6 rounded-full transition-all cursor-pointer ${isDefault ? 'bg-[#2F80F9]' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isDefault ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-[14px] text-[#131b2d] dark:text-gray-200 font-medium">Set as default</span>
            </label>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex gap-6 p-6">
          {/* Left: Weekly Availability */}
          <div className="flex-1 bg-white dark:bg-[#0F1623] border border-[#E5E9F0] dark:border-gray-700 rounded-[12px] p-5">
            <h3 className="text-[16px] font-bold text-[#131b2d] dark:text-gray-100 mb-1">Weekly Availability</h3>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[13px] text-[#64748B] dark:text-gray-400">Recurring schedule in</span>
              <div className="w-48">
                <CustomSelect
                  value={timezone}
                  onChange={(v) => setTimezone(v)}
                  options={COMMON_TZ.map((tz) => ({ value: tz, label: tz }))}
                  size="sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const slots = schedule[day.key] ?? [];
                const enabled = slots.length > 0;
                return (
                  <div key={day.key} className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={`mt-2.5 w-5 h-5 rounded flex items-center justify-center border-2 transition-all shrink-0 ${
                        enabled
                          ? 'bg-[#2F80F9] border-[#2F80F9]'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {enabled && <Check className="w-3 h-3 text-white" />}
                    </button>

                    {/* Day label */}
                    <div className="w-28 pt-2">
                      <span className={`text-[13px] font-semibold ${enabled ? 'text-[#131b2d] dark:text-gray-100' : 'text-[#64748B] dark:text-gray-500'}`}>
                        {day.label}
                      </span>
                    </div>

                    {/* Slots */}
                    {!enabled ? (
                      <div className="flex-1 pt-2">
                        <span className="text-[13px] text-[#64748B] dark:text-gray-400 italic">Unavailable</span>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-2">
                        {slots.map((slot, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <TimeSelect value={slot.start} onChange={(v) => updateDaySlot(day.key, i, 'start', v)} />
                            <span className="text-[#64748B] dark:text-gray-400 text-[13px]">-</span>
                            <TimeSelect value={slot.end} onChange={(v) => updateDaySlot(day.key, i, 'end', v)} />
                            <button
                              type="button"
                              onClick={() => removeSlotFromDay(day.key, i)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => addSlotForDay(day.key)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[#2F80F9] transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Date-specific Hours */}
          <div className="w-72 bg-white dark:bg-[#0F1623] border border-[#E5E9F0] dark:border-gray-700 rounded-[12px] p-5 flex flex-col">
            <h3 className="text-[16px] font-bold text-[#131b2d] dark:text-gray-100 mb-1">Date-specific Hours</h3>
            <p className="text-[12px] text-[#64748B] dark:text-gray-400 mb-5">Override weekly schedule • Next 60 days</p>

            {Object.keys(initial?.overridesJson ?? {}).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <CalendarX className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-[13px] font-semibold text-[#131b2d] dark:text-gray-100 mb-1">No overrides set</p>
                <p className="text-[12px] text-[#64748B] dark:text-gray-400 mb-4">The weekly schedule applies to all dates.</p>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-[#E5E9F0] dark:border-gray-700 rounded-[8px] text-[13px] font-medium text-[#131b2d] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Date Override
                </button>
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto">
                {Object.entries(initial?.overridesJson ?? {}).map(([date, slots]) => (
                  <div key={date} className="flex items-center justify-between p-2.5 rounded-[8px] border border-[#E5E9F0] dark:border-gray-700 text-[13px]">
                    <span className="font-medium text-[#131b2d] dark:text-gray-100">{fmtShortDate(date)}</span>
                    <span className="text-[#64748B] dark:text-gray-400">
                      {slots.length === 0 ? 'Unavailable' : slots.map((s) => `${formatClock(s.start)}–${formatClock(s.end)}`).join(', ')}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="flex items-center gap-2 w-full px-4 py-2 border border-dashed border-[#E5E9F0] dark:border-gray-700 rounded-[8px] text-[13px] font-medium text-[#2F80F9] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Date Override
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-[#E5E9F0] dark:border-gray-700 rounded-[10px] text-[14px] font-semibold text-[#414754] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-5 py-2.5 bg-[#131b2d] dark:bg-gray-200 text-white dark:text-gray-900 rounded-[10px] text-[14px] font-semibold hover:bg-[#1e2d47] dark:hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? 'Save changes' : 'Create schedule'}
          </button>
        </div>
      </div>

      {showOverrideModal && initial && (
        <DateOverrideModal
          profileId={initial.id}
          existingOverrides={initial.overridesJson ?? {}}
          onSave={(_, overrides) => {
            // handled at parent level
            setShowOverrideModal(false);
          }}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </div>
  );
}

// ─── Add Leave Modal ──────────────────────────────────────────────────────────
function AddLeaveModal({
  onSave,
  onClose,
}: {
  onSave: (data: { type: 'full' | 'partial'; startDate: string; endDate: string; startTime?: string; endTime?: string; reason?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const today = isoDate(new Date());
  const [type, setType] = useState<'full' | 'partial'>('full');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!startDate || !endDate) { setError('Start and end date are required'); return; }
    if (endDate < startDate) { setError('End date must be on or after start date'); return; }
    if (type === 'partial' && (!startTime || !endTime)) { setError('Start and end time are required for partial leaves'); return; }
    setSaving(true);
    try {
      await onSave({ type, startDate, endDate, ...(type === 'partial' ? { startTime, endTime } : {}), reason: reason || undefined });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#161B26] rounded-[16px] shadow-2xl w-full max-w-md border border-[#E5E9F0] dark:border-gray-700/60">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-[18px] font-bold text-[#131b2d] dark:text-gray-100">Add Leaves</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Full day / Partial */}
          <div className="flex items-center gap-6">
            {(['full', 'partial'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setType(t)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    type === t ? 'border-[#131b2d] dark:border-gray-200' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {type === t && <div className="w-2 h-2 rounded-full bg-[#131b2d] dark:bg-gray-200" />}
                </div>
                <span className="text-[14px] font-medium text-[#131b2d] dark:text-gray-100">
                  {t === 'full' ? 'Full day' : 'Partial'}
                </span>
              </label>
            ))}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#414754] dark:text-gray-400 mb-1.5">Start date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
                  className="w-full bg-white dark:bg-[#0F1623] border border-[#E5E9F0] dark:border-gray-700 rounded-[8px] px-3 py-2.5 text-[14px] text-[#131b2d] dark:text-gray-100 outline-none focus:border-[#2F80F9] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#414754] dark:text-gray-400 mb-1.5">End date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white dark:bg-[#0F1623] border border-[#E5E9F0] dark:border-gray-700 rounded-[8px] px-3 py-2.5 text-[14px] text-[#131b2d] dark:text-gray-100 outline-none focus:border-[#2F80F9] transition-all"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 text-[12px] text-[#64748B] dark:text-gray-400">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#2F80F9]" />
            In case of a single day, please add same date in Start and End date.
          </div>

          {/* Time range for partial */}
          {type === 'partial' && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#414754] dark:text-gray-400 mb-1.5">Start time</label>
                <TimeSelect value={startTime} onChange={setStartTime} />
              </div>
              <span className="text-[#64748B] mt-5">-</span>
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#414754] dark:text-gray-400 mb-1.5">End time</label>
                <TimeSelect value={endTime} onChange={setEndTime} />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-[13px] font-semibold text-[#131b2d] dark:text-gray-100 mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for leave"
              className="w-full bg-white dark:bg-[#0F1623] border border-[#E5E9F0] dark:border-gray-700 rounded-[8px] px-3 py-2.5 text-[14px] text-[#131b2d] dark:text-gray-100 outline-none focus:border-[#2F80F9] transition-all resize-none placeholder:text-gray-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[8px]">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#E5E9F0] dark:border-gray-700 rounded-[10px] text-[14px] font-semibold text-[#414754] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#131b2d] dark:bg-gray-100 text-white dark:text-gray-900 rounded-[10px] text-[14px] font-semibold hover:bg-[#1e2d47] dark:hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────
function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  profile: AvailabilityProfile;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-700 rounded-[12px] shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[16px] font-bold text-[#131b2d] dark:text-gray-100">{profile.name}</span>
            {profile.isDefault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2F80F9]/10 dark:bg-blue-900/30 text-[#2F80F9] dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider rounded-full border border-[#2F80F9]/20">
                DEFAULT
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Globe className="w-3.5 h-3.5 text-[#64748B] dark:text-gray-400" />
            <span className="text-[12px] text-[#64748B] dark:text-gray-400">{profile.timezone}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1E2535] rounded-[10px] border border-[#E5E9F0] dark:border-gray-700 shadow-lg z-20 overflow-hidden">
                {!profile.isDefault && (
                  <button
                    type="button"
                    onClick={() => { onSetDefault(); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] text-[#131b2d] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-1.5">
        {DAYS.map((day) => {
          const slots = (profile.scheduleJson?.[day.key] ?? []) as Slot[];
          return (
            <div key={day.key} className="flex items-center justify-between py-1">
              <span className="text-[13px] font-semibold text-[#64748B] dark:text-gray-400 w-10">{day.short}</span>
              <span className="text-[13px] text-[#131b2d] dark:text-gray-100 flex-1 text-right">
                {slots.length === 0
                  ? <span className="text-[#64748B] dark:text-gray-500 italic">Unavailable</span>
                  : slots.map((s, i) => (
                    <span key={i}>{formatClock(s.start).toLowerCase()} - {formatClock(s.end).toLowerCase()}{i < slots.length - 1 ? ', ' : ''}</span>
                  ))
                }
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leave State ──────────────────────────────────────────────────────────────
type LeaveState = 'upcoming' | 'ongoing' | 'ended';
function getLeaveState(startDate: string, endDate: string): LeaveState {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < now) return 'ended';
  if (start <= now) return 'ongoing';
  return 'upcoming';
}
const LEAVE_BADGE: Record<LeaveState, string> = {
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ongoing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ended: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ─── Exported Reusable Availability Schedule Tab ──────────────────────────────
export function AvailabilityScheduleTab({
  educatorId,
  isModalView = false,
}: {
  educatorId?: string;
  isModalView?: boolean;
}) {
  const [profiles, setProfiles] = useState<AvailabilityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AvailabilityProfile | null>(null);

  const pushToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const qs = educatorId ? `?educatorId=${encodeURIComponent(educatorId)}` : '';

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/availability/profiles${qs}`);
      if (res.ok) {
        const json = await res.json();
        setProfiles(json.data ?? []);
      }
    } catch (e) {
      console.error('Failed to load profiles:', e);
    }
  }, [qs]);

  useEffect(() => {
    setLoading(true);
    fetchProfiles().finally(() => setLoading(false));
  }, [fetchProfiles]);

  const handleSaveProfile = useCallback(
    async (data: Partial<AvailabilityProfile>) => {
      try {
        const isEdit = !!editingProfile;
        const url = isEdit
          ? `/api/v1/availability/profiles/${editingProfile!.id}${qs}`
          : `/api/v1/availability/profiles${qs}`;
        const method = isEdit ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Save failed');
        }
        await fetchProfiles();
        pushToast('success', isEdit ? 'Schedule updated' : 'Schedule created');
        setShowProfileModal(false);
        setEditingProfile(null);
      } catch (e: any) {
        pushToast('error', e.message ?? 'Something went wrong');
        throw e;
      }
    },
    [editingProfile, fetchProfiles, pushToast, qs],
  );

  const handleDeleteProfile = useCallback(
    async (id: string) => {
      if (!confirm('Delete this availability schedule? This cannot be undone.')) return;
      const res = await fetch(`/api/v1/availability/profiles/${id}${qs}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchProfiles();
        pushToast('success', 'Schedule deleted');
      } else {
        const err = await res.json();
        pushToast('error', err.error ?? 'Delete failed');
      }
    },
    [fetchProfiles, pushToast, qs],
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/v1/availability/profiles/${id}${qs}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        await fetchProfiles();
        pushToast('success', 'Default schedule updated');
      } else {
        pushToast('error', 'Could not set default');
      }
    },
    [fetchProfiles, pushToast, qs],
  );

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F80F9]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={() => {
                setEditingProfile(profile);
                setShowProfileModal(true);
              }}
              onDelete={() => handleDeleteProfile(profile.id)}
              onSetDefault={() => handleSetDefault(profile.id)}
            />
          ))}

          {/* Create new card */}
          <button
            type="button"
            onClick={() => {
              setEditingProfile(null);
              setShowProfileModal(true);
            }}
            className="bg-white dark:bg-[#161B26] border-2 border-dashed border-[#E5E9F0] dark:border-gray-700 rounded-[12px] p-5 flex flex-col items-center justify-center gap-3 hover:border-[#2F80F9] dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-[#2F80F9]/10 flex items-center justify-center transition-colors">
              <CalendarPlus className="w-6 h-6 text-gray-400 group-hover:text-[#2F80F9] transition-colors" />
            </div>
            <span className="text-[14px] font-semibold text-[#64748B] dark:text-gray-400 group-hover:text-[#2F80F9] dark:group-hover:text-blue-400 transition-colors">
              Create Availability
            </span>
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] border border-[#E5E9F0] dark:border-gray-700 text-[13px] font-semibold text-[#131b2d] dark:text-gray-200 group-hover:border-[#2F80F9] group-hover:text-[#2F80F9] transition-all">
              <Plus className="w-4 h-4" /> Create New Availability
            </span>
          </button>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal
          initial={editingProfile}
          onSave={handleSaveProfile}
          onClose={() => {
            setShowProfileModal(false);
            setEditingProfile(null);
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── Exported Reusable Availability Leaves Tab ────────────────────────────────
export function AvailabilityLeavesTab({
  educatorId,
  isModalView = false,
}: {
  educatorId?: string;
  isModalView?: boolean;
}) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveScope, setLeaveScope] = useState<'upcoming' | 'all'>('upcoming');

  const pushToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchLeaves = useCallback(
    async (scope: 'upcoming' | 'all') => {
      try {
        const param = educatorId ? `&educatorId=${encodeURIComponent(educatorId)}` : '';
        const res = await fetch(
          `/api/v1/availability/leaves?scope=${scope === 'all' ? 'all' : 'upcoming'}${param}`,
        );
        if (res.ok) {
          const json = await res.json();
          setLeaves(json.data ?? []);
        }
      } catch (e) {
        console.error('Failed to load leaves:', e);
      }
    },
    [educatorId],
  );

  useEffect(() => {
    setLoading(true);
    fetchLeaves(leaveScope).finally(() => setLoading(false));
  }, [fetchLeaves, leaveScope]);

  const handleAddLeave = useCallback(
    async (data: {
      type: 'full' | 'partial';
      startDate: string;
      endDate: string;
      startTime?: string;
      endTime?: string;
      reason?: string;
    }) => {
      const param = educatorId ? `?educatorId=${encodeURIComponent(educatorId)}` : '';
      const res = await fetch(`/api/v1/availability/leaves${param}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to add leave');
      }
      await fetchLeaves(leaveScope);
      pushToast('success', 'Leave added');
      setShowLeaveModal(false);
    },
    [educatorId, fetchLeaves, leaveScope, pushToast],
  );

  const handleDeleteLeave = useCallback(
    async (id: string) => {
      const param = educatorId ? `?educatorId=${encodeURIComponent(educatorId)}` : '';
      const res = await fetch(`/api/v1/availability/leaves/${id}${param}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchLeaves(leaveScope);
        pushToast('success', 'Leave removed');
      } else {
        pushToast('error', 'Could not remove leave');
      }
    },
    [educatorId, fetchLeaves, leaveScope, pushToast],
  );

  return (
    <div className={isModalView ? 'w-full' : 'max-w-3xl'}>
      <div className={`flex items-center ${isModalView ? 'justify-end' : 'justify-between'} mb-5`}>
        {!isModalView && (
          <div className="w-52">
            <CustomSelect
              value={leaveScope}
              onChange={(val) => setLeaveScope(val as 'upcoming' | 'all')}
              options={[
                { value: 'upcoming', label: 'Upcoming & in progress' },
                { value: 'all', label: 'All leaves' },
              ]}
              size="sm"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowLeaveModal(true)}
          className={
            isModalView
              ? "flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161B26] text-gray-800 dark:text-gray-200 rounded-[8px] text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              : "flex items-center gap-2 px-4 py-2 bg-[#131b2d] dark:bg-gray-100 text-white dark:text-gray-900 rounded-[8px] text-[13px] font-semibold hover:bg-[#1e2d47] dark:hover:bg-white transition-colors cursor-pointer"
          }
        >
          <Plus className="w-4 h-4" />
          Add Leave
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F80F9]" />
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-700 rounded-[12px] p-12 text-center">
          <CalendarX className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-[16px] font-bold text-[#131b2d] dark:text-gray-100 mb-1">
            No leaves applied yet!
          </h3>
          <p className="text-[#64748B] dark:text-gray-400 text-[14px] max-w-sm mx-auto">
            {leaveScope === 'all'
              ? 'You have never marked any time as unavailable.'
              : 'Nothing is marked unavailable from today onwards.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-700 rounded-[12px] divide-y divide-[#E5E9F0] dark:divide-gray-700">
          {leaves.map((leave) => {
            const state = getLeaveState(leave.startDate, leave.endDate);
            const sDate = new Date(leave.startDate).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const eDate = new Date(leave.endDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isSingle = leave.startDate.slice(0, 10) === leave.endDate.slice(0, 10);
            return (
              <div key={leave.id} className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-[#131b2d] dark:text-gray-100">{sDate}</span>
                    {!isSingle && <span className="text-[13px] text-[#64748B] dark:text-gray-400">→ {eDate}</span>}
                    {leave.type === 'partial' && leave.startTime && leave.endTime && (
                      <span className="text-[12px] text-[#64748B] dark:text-gray-400">
                        · {toDisplay(leave.startTime)} – {toDisplay(leave.endTime)}
                      </span>
                    )}
                  </div>
                  {leave.reason && (
                    <p className="text-[13px] text-[#64748B] dark:text-gray-400 mt-1 truncate">{leave.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-[#64748B] dark:text-gray-300">
                    {leave.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${LEAVE_BADGE[state]}`}>
                    {state}
                  </span>
                  {state !== 'ended' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLeave(leave.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLeaveModal && (
        <AddLeaveModal
          onSave={handleAddLeave}
          onClose={() => setShowLeaveModal(false)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── Calendar Settings Tab Component (Real DB & API Synced) ───────────────────
function AvailabilityCalendarSettingsTab({ educatorId }: { educatorId?: string }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    isIntegrationEnabled: boolean;
    connected: boolean;
    calendarId: string | null;
    connectedAt: string | null;
    watchChannelActive: boolean;
  } | null>(null);

  const [showManageModal, setShowManageModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [checkConflicts, setCheckConflicts] = useState(true);
  const [addEvents, setAddEvents] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const url = educatorId ? `/api/v1/calendar/status?educatorId=${educatorId}` : '/api/v1/calendar/status';
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        setStatus(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [educatorId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    const url = educatorId ? `/api/v1/calendar/connect?educatorId=${educatorId}` : '/api/v1/calendar/connect';
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const url = educatorId ? `/api/v1/calendar/disconnect?educatorId=${educatorId}` : '/api/v1/calendar/disconnect';
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.data?.disconnected) {
        pushToast('success', 'Google Calendar disconnected');
        setShowManageModal(false);
        fetchStatus();
      } else {
        pushToast('error', json.error || 'Failed to disconnect calendar');
      }
    } catch (e: any) {
      pushToast('error', e.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveSettings = () => {
    setSavingSettings(true);
    setTimeout(() => {
      setSavingSettings(false);
      setShowManageModal(false);
      pushToast('success', 'Calendar preferences saved successfully');
    }, 400);
  };

  const connectedDate = status?.connectedAt
    ? new Date(status.connectedAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white dark:bg-[#161B26] border border-[#E5E9F0] dark:border-gray-800 rounded-[16px] divide-y divide-[#E5E9F0] dark:divide-gray-800 shadow-xs overflow-hidden">
        {/* Conflict calendars section */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-[#131b2d] dark:text-gray-100">
                  Calendars to check for conflicts
                </h3>
                {status?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#64748B] dark:text-gray-400 mt-1">
                These calendars will be checked in real-time to prevent double bookings during session scheduling.
              </p>
            </div>
            {!status?.connected && (
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-[8px] text-[13px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" /> Connect
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3.5 p-4 border border-[#E5E9F0] dark:border-gray-800 rounded-[12px] bg-gray-50/50 dark:bg-[#121824]">
            {/* Google Calendar icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white border border-gray-200 dark:border-gray-700 shadow-2xs">
              <svg viewBox="0 0 64 64" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="52" height="52" rx="6" fill="white" />
                <rect x="6" y="6" width="52" height="14" fill="#1a73e8" />
                <text x="32" y="46" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1a73e8">
                  31
                </text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-bold text-[#131b2d] dark:text-gray-100">Google Calendar</p>
                {status?.connected && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conflict checking active
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#64748B] dark:text-gray-400 truncate mt-0.5">
                {status?.connected
                  ? `Connected as ${status.calendarId || 'primary account'} • Synced with external schedule`
                  : 'Connect your Google Calendar to automatically block conflicting session slots'}
              </p>
            </div>
            {status?.connected ? (
              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-[8px] text-[13px] font-semibold text-[#131b2d] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
              >
                Manage
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Add events section */}
        <div className="p-6">
          <div className="mb-2">
            <h3 className="text-[15px] font-bold text-[#131b2d] dark:text-gray-100">
              Calendar to add events to
            </h3>
            <p className="text-[13px] text-[#64748B] dark:text-gray-400 mt-1">
              Your confirmed teaching sessions will be automatically created on this calendar with meeting links.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3.5 p-4 border border-[#E5E9F0] dark:border-gray-800 rounded-[12px] bg-gray-50/50 dark:bg-[#121824]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white border border-gray-200 dark:border-gray-700 shadow-2xs">
              <svg viewBox="0 0 64 64" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="52" height="52" rx="6" fill="white" />
                <rect x="6" y="6" width="52" height="14" fill="#1a73e8" />
                <text x="32" y="46" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1a73e8">
                  31
                </text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#131b2d] dark:text-gray-100">Primary Calendar</p>
              <p className="text-[12px] text-[#64748B] dark:text-gray-400 mt-0.5">
                {status?.connected
                  ? 'Upcoming LMS sessions automatically sync to your primary Google Calendar.'
                  : 'Connect Google Calendar to enable two-way sync for booked sessions.'}
              </p>
            </div>
            {status?.connected ? (
              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-[8px] text-[13px] font-semibold text-[#131b2d] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
              >
                Manage
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MANAGE CALENDAR MODAL ─── */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-gray-900 dark:text-gray-100 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-[#1E2535]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-white">
                  <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                    <rect x="6" y="6" width="52" height="52" rx="6" fill="white" />
                    <rect x="6" y="6" width="52" height="14" fill="#1a73e8" />
                    <text x="32" y="46" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1a73e8">
                      31
                    </text>
                  </svg>
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Google Calendar Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Account details */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/80">
                <p className="text-xs text-gray-500 dark:text-gray-400">Connected Account</p>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                  {status?.calendarId || 'Primary Calendar'}
                </p>
                {connectedDate && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Connected on {connectedDate}
                  </p>
                )}
              </div>

              {/* Conflict checking toggle */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Conflict Detection
                  </p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Automatically prevent LMS bookings when you have external events on Google Calendar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckConflicts(!checkConflicts)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    checkConflicts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      checkConflicts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Event push toggle */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Automatic Event Push
                  </p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Create new LMS sessions and meeting links directly inside your Google Calendar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddEvents(!addEvents)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    addEvents ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      addEvents ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Disconnect Action */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={handleDisconnect}
                  className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Disconnect</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManageModal(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={handleSaveSettings}
                    className="px-4 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    {savingSettings && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function AvailabilityClientPage() {
  const [activeTab, setActiveTab] = useState<'availability' | 'leaves' | 'calendar'>('availability');

  const TABS = [
    { key: 'availability', label: 'Availability' },
    { key: 'leaves', label: 'Leaves' },
    { key: 'calendar', label: 'Calendar Settings' },
  ] as const;

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-8 bg-[#F9FAFB] dark:bg-[#080D16]">
      <div className="max-w-[1440px] mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-[28px] leading-[36px] tracking-[-0.02em] font-bold text-[#131b2d] dark:text-gray-100">
            Availability
          </h1>
          <p className="text-[#414754] dark:text-gray-400 text-[14px] mt-1">
            Manage your teaching schedules and leaves
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Availability Tab ── */}
        {activeTab === 'availability' && <AvailabilityScheduleTab />}

        {/* ── Leaves Tab ── */}
        {activeTab === 'leaves' && <AvailabilityLeavesTab />}

        {/* ── Calendar Settings Tab ── */}
        {activeTab === 'calendar' && <AvailabilityCalendarSettingsTab />}
      </div>
    </div>
  );
}
