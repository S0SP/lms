'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Users, Clock, ArrowRight, Loader2, Plus, Search } from 'lucide-react';

interface CourseItem {
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

export default function EducatorCoursesList() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const url = searchQuery
          ? `/api/v1/courses?q=${encodeURIComponent(searchQuery)}`
          : '/api/v1/courses';
        const res = await fetch(url);
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

    const t = setTimeout(loadCourses, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [searchQuery]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Assigned Courses
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage curriculum, timeline, and assessments for your assigned programs.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your courses..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm bg-white dark:bg-[#161B26] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {searchQuery ? 'No courses match your search' : 'No courses assigned yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'When the academy assigns you to 1-on-1 or group courses, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/educator/courses/${course.id}`}
              className="group bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex flex-col h-full relative"
            >
              {/* Status indicator */}
              <div
                className={`absolute top-0 left-0 w-full h-1 ${
                  course.status === 'published' ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      course.type === 'one_on_one'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}
                  >
                    {course.type.replace('_', ' ')}
                  </span>
                </div>

                {course.shortCode && (
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {course.shortCode}
                  </h3>
                )}
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {course.name}
                </h2>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {course.board && <span>{course.board}</span>}
                  {course.grade && <span>• {course.grade}</span>}
                </div>

                <div className="space-y-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-4 h-4 text-gray-400" />
                      {course.enrollmentCount} Active Learner{course.enrollmentCount !== 1 ? 's' : ''}
                    </span>
                    <span className="capitalize font-semibold text-gray-700 dark:text-gray-300">
                      {course.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#080D16] flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Open Workspace
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
