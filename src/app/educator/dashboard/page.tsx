'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Clock,
  ArrowRight,
  Video,
  FileCheck,
  BookOpen,
  Loader2,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';

interface DashboardData {
  educatorName: string;
  todaySessionsCount: number;
  activeLearnersCount: number;
  pendingFeedbackCount: number;
  upcomingSessions: Array<{
    id: string;
    title: string;
    topic?: string | null;
    scheduledAt: string;
    durationMin: number;
    status: string;
    zoomMeetingUrl?: string | null;
    courseName: string;
    courseType: string;
  }>;
}

export default function EducatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/v1/educator/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error('Failed to load educator dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Welcome back{data?.educatorName ? `, ${data.educatorName}` : ''}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here&apos;s an overview of your schedule and active courses today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/educator/calendar"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
          >
            <Calendar className="w-4 h-4" /> View Calendar
          </Link>
          <Link
            href="/educator/courses"
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> My Courses
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Today&apos;s Sessions
            </p>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-3">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              data?.todaySessionsCount ?? 0
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">Scheduled for delivery today</p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Active Learners
            </p>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-3">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              data?.activeLearnersCount ?? 0
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">Enrolled across your courses</p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Pending Feedback
            </p>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-3">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              data?.pendingFeedbackCount ?? 0
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">Completed classes needing notes</p>
        </div>
      </div>

      {/* Upcoming Sessions List */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Upcoming Schedule
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Your next classes and live meeting links
            </p>
          </div>
          <Link
            href="/educator/calendar"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            All Sessions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            </div>
          ) : !data?.upcomingSessions?.length ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No upcoming sessions scheduled right now.
            </div>
          ) : (
            data.upcomingSessions.map((s) => {
              const dt = new Date(s.scheduledAt);
              return (
                <div
                  key={s.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold">
                        {dt.toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold leading-none">
                        {dt.getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {s.courseName}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {s.durationMin} mins
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {s.title}
                      </h3>
                      {s.topic && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {s.topic}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {s.zoomMeetingUrl && (
                      <a
                        href={s.zoomMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join
                      </a>
                    )}
                    <Link
                      href={`/educator/sessions/${s.id}`}
                      className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-xs transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
