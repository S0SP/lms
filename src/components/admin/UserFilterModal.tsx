'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronDown, Check } from 'lucide-react';

export interface FilterCourseOption {
  id: string;
  name: string;
}

export interface FilterTagOption {
  id: string;
  name: string;
  color?: string;
}

interface UserFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: FilterCourseOption[];
  tags: FilterTagOption[];
  activeCourses: string[];
  activeTags: string[];
  onApply: (selectedCourses: string[], selectedTags: string[]) => void;
  onClear: () => void;
}

export function UserFilterModal({
  isOpen,
  onClose,
  courses,
  tags,
  activeCourses,
  activeTags,
  onApply,
  onClear,
}: UserFilterModalProps) {
  // Local selections
  const [selectedCourses, setSelectedCourses] = useState<string[]>(activeCourses);
  const [selectedTags, setSelectedTags] = useState<string[]>(activeTags);

  // Dropdown open states
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Search queries inside dropdowns
  const [courseSearch, setCourseSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCourses(activeCourses);
      setSelectedTags(activeTags);
      setIsCourseDropdownOpen(false);
      setIsTagDropdownOpen(false);
      setCourseSearch('');
      setTagSearch('');
    }
  }, [isOpen, activeCourses, activeTags]);

  // Click outside listener for dropdown menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCourseDropdownOpen(false);
      }
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filtered lists based on search
  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Toggle single course
  const toggleCourse = (courseName: string) => {
    if (selectedCourses.includes(courseName)) {
      setSelectedCourses(selectedCourses.filter((c) => c !== courseName));
    } else {
      setSelectedCourses([...selectedCourses, courseName]);
    }
  };

  // Select all courses
  const allFilteredCoursesSelected =
    filteredCourses.length > 0 &&
    filteredCourses.every((c) => selectedCourses.includes(c.name));

  const toggleSelectAllCourses = () => {
    if (allFilteredCoursesSelected) {
      const namesToRemove = new Set(filteredCourses.map((c) => c.name));
      setSelectedCourses(selectedCourses.filter((c) => !namesToRemove.has(c)));
    } else {
      const newSelected = new Set([...selectedCourses, ...filteredCourses.map((c) => c.name)]);
      setSelectedCourses(Array.from(newSelected));
    }
  };

  // Toggle single tag
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  // Select all tags
  const allFilteredTagsSelected =
    filteredTags.length > 0 &&
    filteredTags.every((t) => selectedTags.includes(t.name));

  const toggleSelectAllTags = () => {
    if (allFilteredTagsSelected) {
      const namesToRemove = new Set(filteredTags.map((t) => t.name));
      setSelectedTags(selectedTags.filter((t) => !namesToRemove.has(t)));
    } else {
      const newSelected = new Set([...selectedTags, ...filteredTags.map((t) => t.name)]);
      setSelectedTags(Array.from(newSelected));
    }
  };

  const handleApply = () => {
    onApply(selectedCourses, selectedTags);
    onClose();
  };

  const handleClear = () => {
    setSelectedCourses([]);
    setSelectedTags([]);
    onClear();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111622] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-visible relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800/80">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filter</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 1. Course Field (Matches Screenshot 1) */}
          <div className="space-y-2 relative" ref={courseDropdownRef}>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
              Course
            </label>

            {/* Dropdown Trigger */}
            <div
              onClick={() => {
                setIsCourseDropdownOpen(!isCourseDropdownOpen);
                setIsTagDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm cursor-pointer shadow-2xs hover:border-gray-400 dark:hover:border-gray-600 transition"
            >
              <span className="truncate text-gray-700 dark:text-gray-300">
                {selectedCourses.length === 0
                  ? 'Course'
                  : selectedCourses.length === 1
                  ? selectedCourses[0]
                  : `${selectedCourses.length} courses selected`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isCourseDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* Dropdown Menu (Screenshot 1) */}
            {isCourseDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search Input */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Select All */}
                <div
                  onClick={toggleSelectAllCourses}
                  className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-xs font-semibold text-gray-800 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={allFilteredCoursesSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />
                  <span>Select All</span>
                </div>

                {/* Course List with checkboxes */}
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
                  {filteredCourses.length === 0 ? (
                    <div className="p-4 text-xs text-center text-gray-400">
                      No courses found
                    </div>
                  ) : (
                    filteredCourses.map((c) => {
                      const isChecked = selectedCourses.includes(c.name);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleCourse(c.name)}
                          className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-xs text-gray-800 dark:text-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Tags Field (Matches Screenshot 2) */}
          <div className="space-y-2 relative" ref={tagDropdownRef}>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
              Tags
            </label>

            {/* Dropdown Trigger */}
            <div
              onClick={() => {
                setIsTagDropdownOpen(!isTagDropdownOpen);
                setIsCourseDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm cursor-pointer shadow-2xs hover:border-gray-400 dark:hover:border-gray-600 transition"
            >
              <span className="truncate text-gray-700 dark:text-gray-300">
                {selectedTags.length === 0
                  ? 'Select Tags...'
                  : selectedTags.length === 1
                  ? selectedTags[0]
                  : `${selectedTags.length} tags selected`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isTagDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* Dropdown Menu */}
            {isTagDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search Input */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Select All */}
                <div
                  onClick={toggleSelectAllTags}
                  className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-xs font-semibold text-gray-800 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={allFilteredTagsSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />
                  <span>Select All</span>
                </div>

                {/* Tag List with checkboxes */}
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
                  {filteredTags.length === 0 ? (
                    <div className="p-4 text-xs text-center text-gray-400">
                      No tags found
                    </div>
                  ) : (
                    filteredTags.map((t) => {
                      const isChecked = selectedTags.includes(t.name);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTag(t.name)}
                          className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-xs text-gray-800 dark:text-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          />
                          <div className="flex items-center gap-2">
                            {t.color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                            )}
                            <span className="truncate">{t.name}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions (Screenshot 2) */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-gray-50/60 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 py-2.5 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-2xs"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 bg-[#1E2538] hover:bg-[#151B2A] text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
