'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, BookOpen, Users, Book, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  shortCode?: string | null;
  type: string;
  status: string;
  thumbnailUrl?: string | null;
  board?: string | null;
  grade?: string | null;
  enrollmentCount: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/v1/courses?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setCourses(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(loadCourses, searchQuery ? 250 : 0);
    return () => clearTimeout(t);
  }, [statusFilter, searchQuery]);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Courses</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage academic curricula, group cohorts, and 1-on-1 programs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/courses/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'all', label: 'All Courses' },
          { id: 'published', label: 'Published' },
          { id: 'draft', label: 'Drafts' },
          { id: 'archived', label: 'Archived' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              statusFilter === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course name, board, or grade..." 
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {searchQuery ? 'No courses found' : 'No courses created yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {searchQuery ? 'Try changing your search terms or filter.' : 'Get started by creating your first educational curriculum.'}
          </p>
          {!searchQuery && (
            <Link
              href="/admin/courses/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create Course
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/educator/courses/${course.id}`}
              className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                    {course.type.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      course.status === 'published'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {course.status}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1 truncate group-hover:text-blue-600 transition-colors">
                  {course.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {course.board ? `${course.board} • ` : ''}{course.grade || 'All Grades'}
                </p>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#080D16] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{course.enrollmentCount} active student{course.enrollmentCount !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Workspace →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
