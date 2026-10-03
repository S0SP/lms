'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Sun,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';

export type CalendarViewType =
  | 'Month (Compact)'
  | 'Month (Detailed)'
  | 'Week (List)'
  | 'Week (Agenda)'
  | 'Day'
  | 'Location';

interface CalendarViewSelectorProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
}

const VIEW_OPTIONS: { id: CalendarViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'Month (Compact)', label: 'Month (Compact)', icon: Calendar },
  { id: 'Month (Detailed)', label: 'Month (Detailed)', icon: Calendar },
  { id: 'Week (List)', label: 'Week (List)', icon: CalendarRange },
  { id: 'Week (Agenda)', label: 'Week (Agenda)', icon: CalendarDays },
  { id: 'Day', label: 'Day', icon: Sun },
  { id: 'Location', label: 'Location', icon: Globe },
];

export function CalendarViewSelector({ currentView, onViewChange }: CalendarViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = VIEW_OPTIONS.find((v) => v.id === currentView) || VIEW_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#111622] border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-800 transition active:scale-95"
      >
        <ActiveIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <span>{currentView}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in-95">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = opt.id === currentView;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onViewChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
