'use client';

import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface RecurringRule {
  frequency: 'Day' | 'Week' | 'Month';
  interval: number;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string;
  endType: 'never' | 'on_date' | 'after_occurrences';
  endDate?: string;
  occurrences?: number;
}

interface AddRecurringSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartDate?: string;
  onApply: (rule: RecurringRule) => void;
}

const DAYS = [
  { label: 'S', day: 0, title: 'Sunday' },
  { label: 'M', day: 1, title: 'Monday' },
  { label: 'T', day: 2, title: 'Tuesday' },
  { label: 'W', day: 3, title: 'Wednesday' },
  { label: 'T', day: 4, title: 'Thursday' },
  { label: 'F', day: 5, title: 'Friday' },
  { label: 'S', day: 6, title: 'Saturday' },
];

export function AddRecurringSessionsModal({
  isOpen,
  onClose,
  initialStartDate,
  onApply,
}: AddRecurringSessionsModalProps) {
  const [interval, setInterval] = useState<number>(1);
  const [frequency, setFrequency] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // default Mon, Wed, Fri
  const [startDate, setStartDate] = useState<string>(
    initialStartDate || new Date().toISOString().split('T')[0]
  );
  const [endType, setEndType] = useState<'never' | 'on_date' | 'after_occurrences'>('after_occurrences');
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [occurrences, setOccurrences] = useState<number>(10);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleDone = () => {
    onApply({
      frequency,
      interval,
      daysOfWeek: selectedDays,
      startDate,
      endType,
      endDate: endType === 'on_date' ? endDate : undefined,
      occurrences: endType === 'after_occurrences' ? occurrences : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Recurring Sessions
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Repeats every */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Repeats every
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={99}
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 text-sm text-center border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="w-36">
                <CustomSelect
                  value={frequency}
                  onChange={(val) => setFrequency(val as 'Day' | 'Week' | 'Month')}
                  options={[
                    { value: 'Day', label: 'Day(s)' },
                    { value: 'Week', label: 'Week(s)' },
                    { value: 'Month', label: 'Month(s)' },
                  ]}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Repeats on (Week) */}
          {frequency === 'Week' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Repeats on
              </label>
              <div className="flex items-center gap-2">
                {DAYS.map((d, index) => {
                  const isSelected = selectedDays.includes(d.day);
                  return (
                    <button
                      key={index}
                      type="button"
                      title={d.title}
                      onClick={() => toggleDay(d.day)}
                      className={`w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Starts on */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Starts on
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ends */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Ends
            </label>
            
            <div className="space-y-2.5">
              {/* Option 1: Never */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'never'}
                  onChange={() => setEndType('never')}
                  className="w-4 h-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Never</span>
              </label>

              {/* Option 2: On date */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'on_date'}
                  onChange={() => setEndType('on_date')}
                  className="w-4 h-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 min-w-10">On</span>
                <input
                  type="date"
                  disabled={endType !== 'on_date'}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    endType !== 'on_date'
                      ? 'bg-neutral-100 dark:bg-neutral-800/50 opacity-50 cursor-not-allowed'
                      : 'bg-white dark:bg-neutral-800'
                  }`}
                />
              </label>

              {/* Option 3: After occurrences */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'after_occurrences'}
                  onChange={() => setEndType('after_occurrences')}
                  className="w-4 h-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 min-w-10">After</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  disabled={endType !== 'after_occurrences'}
                  value={occurrences}
                  onChange={(e) => setOccurrences(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-20 px-3 py-1.5 text-sm text-center border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    endType !== 'after_occurrences'
                      ? 'bg-neutral-100 dark:bg-neutral-800/50 opacity-50 cursor-not-allowed'
                      : 'bg-white dark:bg-neutral-800'
                  }`}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">occurrences</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
