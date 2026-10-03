'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, BookOpen, Users, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  shortCode?: string | null;
  type: string;
  status: string;
  board?: string | null;
  grade?: string | null;
  enrollmentCount: number;
}

export default function GroupCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ type: 'group' });
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/v1/courses?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setCourses(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load group courses:', err);
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(loadCourses, searchQuery ? 250 : 0);
    return () => clearTimeout(t);
  }, [searchQuery]);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Group Cohort Courses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage group learning tracks and cohort schedules.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/courses/create" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Group Course
          </Link>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search group courses..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : courses.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              No group courses found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create a group cohort program to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">Course Name</th>
                  <th className="py-4 px-6">Board & Grade</th>
                  <th className="py-4 px-6">Enrolled Learners</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100">
                      <div>{course.name}</div>
                      {course.shortCode && <div className="text-xs text-gray-400">{course.shortCode}</div>}
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                      {course.board ? `${course.board} • ` : ''}{course.grade || '—'}
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-4 h-4 text-gray-400" />
                        {course.enrollmentCount}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          course.status === 'published'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {course.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/educator/courses/${course.id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Workspace →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
