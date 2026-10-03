'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  X,
  Search,
  ChevronDown,
  Check,
  Globe,
  Loader2,
  Award,
} from 'lucide-react';

const STANDARD_TIMEZONES: TimezoneItem[] = [
  { id: 'Asia/Kolkata', name: 'Asia/Kolkata (GMT +05:30)' },
  { id: 'America/New_York', name: 'America/New_York (GMT -05:00)' },
  { id: 'Europe/London', name: 'Europe/London (GMT +00:00)' },
  { id: 'Asia/Dubai', name: 'Asia/Dubai (GMT +04:00)' },
  { id: 'Asia/Singapore', name: 'Asia/Singapore (GMT +08:00)' },
  { id: 'UTC', name: 'UTC (Coordinated Universal Time)' },
];

export interface CalendarFilterState {
  selectedCourses: string[]; // Course IDs or Names
  selectedEducators: string[]; // Educator IDs or Emails
  selectedLearners: string[]; // Learner IDs or Names
  selectedLocations: string[];
  selectedEducatorTags: string[];
  selectedSessionTags: string[];
  selectedCourseTags: string[];
  selectedTimezone: string;
}

export const INITIAL_CALENDAR_FILTERS: CalendarFilterState = {
  selectedCourses: [],
  selectedEducators: [],
  selectedLearners: [],
  selectedLocations: [],
  selectedEducatorTags: [],
  selectedSessionTags: [],
  selectedCourseTags: [],
  selectedTimezone: 'Asia/Kolkata (GMT +05:30)',
};

interface CourseItem {
  id: string;
  name: string;
  shortCode?: string | null;
  description?: string | null;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface LocationItem {
  id: string;
  name: string;
}

interface TimezoneItem {
  id: string;
  name: string;
}

interface CalendarAdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: CalendarFilterState;
  onApplyFilters: (filters: CalendarFilterState) => void;
}

export function CalendarAdvancedFilterModal({
  isOpen,
  onClose,
  activeFilters,
  onApplyFilters,
}: CalendarAdvancedFilterModalProps) {
  // Working local form state
  const [filters, setFilters] = useState<CalendarFilterState>(activeFilters);

  // Data loaded 100% dynamically from backend database API
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [educators, setEducators] = useState<UserItem[]>([]);
  const [learners, setLearners] = useState<UserItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([
    { id: 'zoom', name: 'Zoom Online (Cloud)' },
  ]);
  const [educatorTags, setEducatorTags] = useState<string[]>([]);
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [courseTags, setCourseTags] = useState<string[]>([]);
  const [timezones, setTimezones] = useState<TimezoneItem[]>(STANDARD_TIMEZONES);
  const [loading, setLoading] = useState(false);

  // Accordion / expanded sections
  const [expandedSection, setExpandedSection] = useState<
    'course' | 'educator' | 'learner' | 'location' | 'educatorTags' | 'sessionTags' | 'courseTags' | 'timezone' | null
  >(null);

  // Search terms inside open dropdowns
  const [courseSearch, setCourseSearch] = useState('');
  const [educatorSearch, setEducatorSearch] = useState('');
  const [learnerSearch, setLearnerSearch] = useState('');

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setFilters(activeFilters);
      setExpandedSection(null);
    }
  }, [isOpen, activeFilters]);

  // Load filter options dynamically from backend DB API
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    fetch('/api/v1/calendar/filters')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCourses(json.data.courses || []);
          setEducators(json.data.educators || []);
          setLearners(json.data.learners || []);
          setLocations(json.data.locations || []);
          setEducatorTags(json.data.educatorTags || []);
          setSessionTags(json.data.sessionTags || []);
          setCourseTags(json.data.courseTags || []);
          setTimezones(json.data.timezones || []);
        }
      })
      .catch((err) => console.error('Failed to load filter options:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSection = (section: typeof expandedSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Toggle multi-select values
  const toggleArrayItem = (key: keyof CalendarFilterState, item: string) => {
    setFilters((prev) => {
      const currentList = prev[key] as string[];
      const exists = currentList.includes(item);
      const updated = exists ? currentList.filter((i) => i !== item) : [...currentList, item];
      return { ...prev, [key]: updated };
    });
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_CALENDAR_FILTERS);
    onApplyFilters(INITIAL_CALENDAR_FILTERS);
    onClose();
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  // Filtered lists for search inputs
  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    (c.shortCode && c.shortCode.toLowerCase().includes(courseSearch.toLowerCase()))
  );

  const filteredEducators = educators.filter((e) =>
    e.name.toLowerCase().includes(educatorSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(educatorSearch.toLowerCase())
  );

  const filteredLearners = learners.filter((l) =>
    l.name.toLowerCase().includes(learnerSearch.toLowerCase()) ||
    l.email.toLowerCase().includes(learnerSearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-gray-900 dark:text-gray-100 max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white">
              Filters
            </h2>
            {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)] no-scrollbar text-xs">
          {/* 1. COURSE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Course
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('course')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedCourses.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedCourses.length > 0
                    ? `${filters.selectedCourses.length} course${filters.selectedCourses.length > 1 ? 's' : ''} selected`
                    : 'Select course'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'course' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'course' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 animate-in fade-in-50">
                  {/* Search box matching screenshot 4 */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Select courses"
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {/* Course rows list with avatar matching screenshot 4 */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 no-scrollbar">
                    {filteredCourses.map((c) => {
                      const isSelected = filters.selectedCourses.includes(c.id) || filters.selectedCourses.includes(c.name);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleArrayItem('selectedCourses', c.id)}
                          className={`p-2 rounded-xl flex items-center gap-3 cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-white dark:hover:bg-gray-800 border border-transparent'
                          }`}
                        >
                          {/* Mascot icon matching screenshot 4 */}
                          <div className="w-9 h-9 flex items-center justify-center shrink-0">
                            <Image
                              src="/logos/logo_icon.png"
                              alt={c.name}
                              width={36}
                              height={36}
                              className="w-9 h-9 object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-950 dark:text-white truncate text-xs">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {c.shortCode || c.name}
                            </p>
                          </div>

                          {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                      );
                    })}
                    {filteredCourses.length === 0 && (
                      <p className="text-xs text-gray-400 italic py-2 text-center">No courses found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. EDUCATOR */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Educator
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('educator')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedEducators.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedEducators.length > 0
                    ? `${filters.selectedEducators.length} educator${filters.selectedEducators.length > 1 ? 's' : ''} selected`
                    : 'Select educators'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'educator' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'educator' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 animate-in fade-in-50">
                  {/* Search box matching screenshot 2 */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={educatorSearch}
                      onChange={(e) => setEducatorSearch(e.target.value)}
                      placeholder="Select educators"
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {/* Educator checkboxes matching screenshot 2 */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 no-scrollbar">
                    {filteredEducators.map((edu) => {
                      const isSelected = filters.selectedEducators.includes(edu.id) || filters.selectedEducators.includes(edu.email);
                      return (
                        <label
                          key={edu.id}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleArrayItem('selectedEducators', edu.id)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-950 dark:text-white text-xs truncate">
                              {edu.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {edu.email}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                    {filteredEducators.length === 0 && (
                      <p className="text-xs text-gray-400 italic py-2 text-center">No educators found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. LEARNER */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Learner
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('learner')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedLearners.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedLearners.length > 0
                    ? `${filters.selectedLearners.length} learner${filters.selectedLearners.length > 1 ? 's' : ''} selected`
                    : 'Select learners'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'learner' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'learner' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 animate-in fade-in-50">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={learnerSearch}
                      onChange={(e) => setLearnerSearch(e.target.value)}
                      placeholder="Select learners"
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
                    {filteredLearners.map((lrn) => {
                      const isSelected = filters.selectedLearners.includes(lrn.id) || filters.selectedLearners.includes(lrn.name);
                      return (
                        <label
                          key={lrn.id}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleArrayItem('selectedLearners', lrn.id)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-950 dark:text-white text-xs truncate">
                              {lrn.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {lrn.email}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. LOCATIONS */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Locations
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('location')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedLocations.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedLocations.length > 0
                    ? `${filters.selectedLocations.length} location${filters.selectedLocations.length > 1 ? 's' : ''} selected`
                    : 'Select Locations'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'location' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'location' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 space-y-1">
                  {locations.map((loc) => {
                    const isSelected = filters.selectedLocations.includes(loc.id);
                    return (
                      <label
                        key={loc.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleArrayItem('selectedLocations', loc.id)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="font-medium text-gray-900 dark:text-white text-xs">{loc.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 5. EDUCATOR TAGS */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Educator Tags
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('educatorTags')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedEducatorTags.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedEducatorTags.length > 0
                    ? `${filters.selectedEducatorTags.length} tag${filters.selectedEducatorTags.length > 1 ? 's' : ''} selected`
                    : 'Select Educator Tags...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'educatorTags' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'educatorTags' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 flex flex-wrap gap-1.5">
                  {educatorTags.map((tag) => {
                    const isSelected = filters.selectedEducatorTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleArrayItem('selectedEducatorTags', tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 6. SESSION TAGS */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Session Tags
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('sessionTags')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedSessionTags.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedSessionTags.length > 0
                    ? `${filters.selectedSessionTags.length} tag${filters.selectedSessionTags.length > 1 ? 's' : ''} selected`
                    : 'Select Session Tags...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'sessionTags' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'sessionTags' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 flex flex-wrap gap-1.5">
                  {sessionTags.map((tag) => {
                    const isSelected = filters.selectedSessionTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleArrayItem('selectedSessionTags', tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 7. COURSE TAGS */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Course Tags
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('courseTags')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <span className={filters.selectedCourseTags.length > 0 ? 'font-bold text-blue-600 dark:text-blue-400 truncate' : 'text-gray-400'}>
                  {filters.selectedCourseTags.length > 0
                    ? `${filters.selectedCourseTags.length} tag${filters.selectedCourseTags.length > 1 ? 's' : ''} selected`
                    : 'Select Course Tags...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'courseTags' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'courseTags' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 flex flex-wrap gap-1.5">
                  {courseTags.map((tag) => {
                    const isSelected = filters.selectedCourseTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleArrayItem('selectedCourseTags', tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 8. TIMEZONE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Timezone
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('timezone')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-semibold text-gray-900 dark:text-white truncate">
                    {filters.selectedTimezone}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'timezone' ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === 'timezone' && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/40 space-y-1">
                  {timezones.map((tz) => {
                    const isSelected = filters.selectedTimezone === tz.name;
                    return (
                      <button
                        key={tz.id}
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, selectedTimezone: tz.name }));
                          setExpandedSection(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-bold'
                            : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{tz.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons - Exactly matches Screenshot 3 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-white dark:bg-[#161B26]">
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-center active:scale-95 shadow-2xs"
          >
            Clear Filters
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#1A2234] hover:bg-[#121826] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-all text-center active:scale-95 shadow-md"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
