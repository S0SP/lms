'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Library,
  Users,
  Calendar as CalendarIcon,
  Video,
  Clock,
  RotateCcw,
  CheckCircle2,
  Filter,
  MoreVertical,
  Edit2,
  XCircle,
  Trash2,
  Download,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  BookOpen,
  X,
  UserCheck,
  FileText,
} from 'lucide-react';
import { CustomSelect, SelectOption } from '@/components/ui/CustomSelect';
import { SessionDetailModal } from '@/components/calendar/SessionDetailModal';
import { CalendarSessionItem } from '@/components/calendar/SessionPopoverCard';

interface AnalyticsData {
  overview: {
    totalCourses: number;
    totalLearners: number;
    totalEducators: number;
    todayStats: {
      scheduled: number;
      live: number;
      runningLate: number;
      completed: number;
    };
    chartData: {
      learners: { date: string; count: number }[];
      sessions: { date: string; count: number }[];
    };
  };
  sessions: any[];
  courses: any[];
  educators: any[];
  learners: any[];
  logs: any[];
}

export function AnalyticsWorkspaceClient() {
  const router = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'courses' | 'educators' | 'learners' | 'logs'>('overview');

  // Overview Tab State
  const [chartMetric, setChartMetric] = useState<'learners' | 'sessions'>('learners');

  // Sessions Tab State
  const [sessionSubTab, setSessionSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [seeConflicts, setSeeConflicts] = useState(false);
  const [upcomingTimeRange, setUpcomingTimeRange] = useState('next_90_days');
  const [pastTimeRange, setPastTimeRange] = useState('last_90_days');
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);

  // Courses Tab State
  const [courseSearch, setCourseSearch] = useState('');
  const [courseTimeRange, setCourseTimeRange] = useState('this_week');

  // Educators Tab State
  const [educatorSearch, setEducatorSearch] = useState('');
  const [educatorTimeRange, setEducatorTimeRange] = useState('this_week');

  // Learners Tab State
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnerTimeRange, setLearnerTimeRange] = useState('this_week');
  const [learnerPage, setLearnerPage] = useState(1);

  // Logs Tab State
  const [logCategory, setLogCategory] = useState<'all' | 'user' | 'course' | 'session' | 'content' | 'billing' | 'credit' | 'settings'>('all');
  const [logTimeRange, setLogTimeRange] = useState('last_7_days');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterLearner, setFilterLearner] = useState('all');
  const [filterEducator, setFilterEducator] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  // Selected Session for Calendar Modal
  const [selectedSession, setSelectedSession] = useState<CalendarSessionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data Loading & State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/analytics/data');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    const handleDocClick = () => setActiveMenuSessionId(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Filter Upcoming & Past Sessions
  const now = new Date();
  const upcomingSessions = useMemo(() => {
    if (!data?.sessions) return [];
    return data.sessions.filter((s) => {
      const sessDate = new Date(s.scheduledAt);
      return sessDate >= now || s.status === 'scheduled' || s.status === 'cancelled';
    });
  }, [data?.sessions]);

  const pastSessions = useMemo(() => {
    if (!data?.sessions) return [];
    return data.sessions.filter((s) => {
      const sessDate = new Date(s.scheduledAt);
      return sessDate < now || s.status === 'completed';
    });
  }, [data?.sessions]);

  // Filter Courses by search
  const filteredCourses = useMemo(() => {
    if (!data?.courses) return [];
    if (!courseSearch.trim()) return data.courses;
    const q = courseSearch.toLowerCase();
    return data.courses.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.shortCode && c.shortCode.toLowerCase().includes(q))
    );
  }, [data?.courses, courseSearch]);

  // Filter Educators
  const filteredEducators = useMemo(() => {
    const list = data?.educators && data.educators.length > 0 ? data.educators : [
      { id: '1', name: 'Abir Sir', coursesCount: 9, sessionsCount: 19, durationMin: 778, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '2', name: 'Ankarao Paritala', coursesCount: 1, sessionsCount: 1, durationMin: 13, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '3', name: 'Divyanshu Raj', coursesCount: 3, sessionsCount: 2, durationMin: 57, chitChats: 1, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '4', name: 'Dr. Sudeshna Chakraborty', coursesCount: 1, sessionsCount: 2, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '5', name: "Harpreet Ma'am", coursesCount: 3, sessionsCount: 2, durationMin: 62, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '6', name: 'Japjee Soin', coursesCount: 4, sessionsCount: 0, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '7', name: 'K. Sujatha', coursesCount: 4, sessionsCount: 4, durationMin: 264, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
      { id: '8', name: 'Ms. Khushi', coursesCount: 2, sessionsCount: 0, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0, resources: 0 },
    ];
    if (!educatorSearch.trim()) return list;
    const q = educatorSearch.toLowerCase();
    return list.filter((e) => e.name.toLowerCase().includes(q));
  }, [data?.educators, educatorSearch]);

  // Filter Learners
  const filteredLearners = useMemo(() => {
    const list = data?.learners && data.learners.length > 0 ? data.learners : [
      { id: '1', name: 'Demo', coursesCount: 0, sessionsCount: 0, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '2', name: 'Aarav', coursesCount: 1, sessionsCount: 0, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '3', name: 'Hardi', coursesCount: 1, sessionsCount: 4, durationMin: 330, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '4', name: 'Anshika', coursesCount: 1, sessionsCount: 1, durationMin: 56, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '5', name: 'Advithi', coursesCount: 1, sessionsCount: 1, durationMin: 58, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '6', name: 'Arnav Asati', coursesCount: 1, sessionsCount: 0, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '7', name: 'Kartik', coursesCount: 1, sessionsCount: 3, durationMin: 168, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
      { id: '8', name: 'Khushi', coursesCount: 0, sessionsCount: 0, durationMin: 0, chitChats: 0, tests: 0, polls: 0, assessments: 0 },
    ];
    if (!learnerSearch.trim()) return list;
    const q = learnerSearch.toLowerCase();
    return list.filter((l) => l.name.toLowerCase().includes(q));
  }, [data?.learners, learnerSearch]);

  // Filter Logs
  const filteredLogs = useMemo(() => {
    let logs = data?.logs && data.logs.length > 0 ? data.logs : [
      {
        id: '1',
        userName: 'UnboundYou',
        userRole: 'Owner',
        eventType: 'Other',
        action: 'RecordingCompletedEvent',
        details: 'Course: Prishita HT, Prishita-IG-G10-Phy-UnboundYou',
        createdAt: 'Sat, 03 Oct 05:17 PM',
      },
      {
        id: '2',
        userName: 'Ms. Khushi',
        userRole: 'Admin',
        eventType: 'Session',
        action: 'Session created',
        details: 'Course: Prishita HT, Prishita-IG-G10-Phy-UnboundYou 31 Oct, 04:00 PM-05:00 PM',
        createdAt: 'Sat, 03 Oct 05:07 PM',
      },
      {
        id: '3',
        userName: 'Ms. Khushi',
        userRole: 'Admin',
        eventType: 'Session',
        action: 'Session created',
        details: 'Course: Prishita HT, Prishita-IG-G10-Phy-UnboundYou 24 Oct, 04:00 PM-05:00 PM',
        createdAt: 'Sat, 03 Oct 05:07 PM',
      },
      {
        id: '4',
        userName: 'Ms. Khushi',
        userRole: 'Admin',
        eventType: 'Session',
        action: 'Session created',
        details: 'Course: Prishita HT, Prishita-IG-G10-Phy-UnboundYou 17 Oct, 04:00 PM-05:00 PM',
        createdAt: 'Sat, 03 Oct 05:07 PM',
      },
      {
        id: '5',
        userName: 'Ms. Khushi',
        userRole: 'Admin',
        eventType: 'Session',
        action: 'Session created',
        details: 'Course: Prishita HT, Prishita-IG-G10-Phy-UnboundYou 10 Oct, 04:00 PM-05:00 PM',
        createdAt: 'Sat, 03 Oct 05:07 PM',
      },
      {
        id: '6',
        userName: 'Ms. Khushi',
        userRole: 'Admin',
        eventType: 'Session',
        action: 'Session created',
        details: 'Course: Vivaan-IG-G-8-French/Math-UnboundYou(1:1), French-Math',
        createdAt: 'Sat, 03 Oct 05:05 PM',
      },
    ];

    if (logCategory !== 'all') {
      logs = logs.filter((l) => l.eventType.toLowerCase() === logCategory.toLowerCase());
    }

    if (filterAction !== 'all') {
      logs = logs.filter((l) => l.action.toLowerCase() === filterAction.toLowerCase());
    }

    return logs;
  }, [data?.logs, logCategory, filterAction]);

  // Session Handlers
  const handleCancelSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        await fetchAnalyticsData();
      }
    } catch (err) {
      console.error('Failed to cancel session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAnalyticsData();
        if (selectedSession?.id === sessionId) {
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleOpenSessionModal = (s: any) => {
    const formattedItem: CalendarSessionItem = {
      id: s.id,
      title: s.title || s.courseName || 'Class Session',
      topic: s.topic || s.title || 'Personalized Coaching Session',
      courseName: s.courseName || 'UnboundYou Personalized Course',
      educatorName: s.educatorName || 'Abir Sir',
      status: s.status || 'scheduled',
      scheduledAt: s.scheduledAt,
      durationMin: s.durationMin || 60,
      zoomMeetingUrl: s.meetingUrl || 'https://zoom.us/j/demo',
      recordingUrl: s.recordingUrl,
      aiSummary: s.aiSummary || 'The session focused on physics concepts related to momentum, energy transfer, and motion. Abir and Prishita discussed questions involving decelerating...',
      creditsConsumed: s.creditsConsumed || '1.0',
    };

    setSelectedSession(formattedItem);
    setIsModalOpen(true);
  };

  // Time Range Options for CustomSelect
  const upcomingTimeOptions: SelectOption[] = [
    { value: 'next_30_days', label: 'Next 30 days' },
    { value: 'next_60_days', label: 'Next 60 days' },
    { value: 'next_90_days', label: 'Next 90 days' },
    { value: 'next_180_days', label: 'Next 180 days' },
  ];

  const pastTimeOptions: SelectOption[] = [
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_60_days', label: 'Last 60 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'all_time', label: 'All time' },
  ];

  const genericTimeOptions: SelectOption[] = [
    { value: 'this_week', label: 'This week' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'all_time', label: 'All time' },
  ];

  const logTimeOptions: SelectOption[] = [
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'all_time', label: 'All time' },
  ];

  // Filter Modal Options
  const learnerSelectOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    ...filteredLearners.map((l) => ({ value: l.id, label: l.name })),
  ];

  const educatorSelectOptions: SelectOption[] = [
    { value: 'all', label: 'All' },
    ...filteredEducators.map((e) => ({ value: e.id, label: e.name })),
  ];

  const courseSelectOptions: SelectOption[] = [
    { value: 'all', label: 'All Courses' },
    ...(data?.courses || []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const actionSelectOptions: SelectOption[] = [
    { value: 'all', label: 'All Actions' },
    { value: 'session created', label: 'Session created' },
    { value: 'session cancelled', label: 'Session cancelled' },
    { value: 'recordingcompletedevent', label: 'RecordingCompletedEvent' },
    { value: 'user invited', label: 'User invited' },
    { value: 'course updated', label: 'Course updated' },
  ];

  // Formatter utilities
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dateStr;
    }
  };

  // Generate smooth SVG path for spline area chart
  const renderAreaChart = () => {
    const rawPoints =
      chartMetric === 'learners'
        ? data?.overview.chartData.learners || []
        : data?.overview.chartData.sessions || [];

    const points =
      rawPoints.length > 0
        ? rawPoints
        : [
            { date: '13 Jul', count: 1 },
            { date: '20 Jul', count: 0 },
            { date: '27 Jul', count: 1 },
            { date: '03 Aug', count: 1 },
            { date: '10 Aug', count: 1 },
            { date: '17 Aug', count: 0 },
            { date: '24 Aug', count: 0 },
            { date: '31 Aug', count: 2 },
            { date: '07 Sep', count: 1 },
            { date: '14 Sep', count: 3 },
            { date: '21 Sep', count: 2 },
            { date: '28 Sep', count: 1 },
          ];

    const maxVal = Math.max(4, ...points.map((p) => p.count));
    const width = 760;
    const height = 240;
    const paddingLeft = 40;
    const paddingBottom = 40;
    const paddingTop = 20;
    const paddingRight = 20;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const coords = points.map((p, idx) => {
      const x = paddingLeft + (idx / (points.length - 1)) * chartW;
      const y = paddingTop + chartH - (p.count / maxVal) * chartH;
      return { x, y, label: p.date, value: p.count };
    });

    let dLine = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dLine += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const dArea = `${dLine} L ${coords[coords.length - 1].x} ${paddingTop + chartH} L ${coords[0].x} ${
      paddingTop + chartH
    } Z`;

    const yTicks = [0, 1, 2, 3, 4];

    return (
      <div className="w-full relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[280px]">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748B" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((val) => {
            const y = paddingTop + chartH - (val / 4) * chartH;
            return (
              <g key={val}>
                <text
                  x={paddingLeft - 15}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-gray-400 font-medium select-none"
                >
                  {val}
                </text>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="0"
                  className="dark:stroke-gray-800"
                />
              </g>
            );
          })}

          <path d={dArea} fill="url(#areaGradient)" />
          <path d={dLine} fill="none" stroke="#1E293B" strokeWidth="2.5" className="dark:stroke-gray-200" />

          {coords.map((c, i) => (
            <text
              key={i}
              x={c.x}
              y={height - 10}
              textAnchor="middle"
              className="text-[11px] fill-gray-500 font-medium select-none"
            >
              {c.label}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full min-h-screen">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#131b2d] dark:text-gray-100">
          Analytics
        </h1>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto text-sm font-semibold">
        {(['overview', 'sessions', 'courses', 'educators', 'learners', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'text-gray-900 dark:text-white font-bold'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading analytics workspace...</p>
        </div>
      ) : (
        <>
          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 flex items-center gap-5 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {data?.overview.totalCourses ?? 23}
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Course</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 flex items-center gap-5 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {data?.overview.totalLearners ?? 30}
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Learner</div>
                  </div>
                </div>
              </div>

              {/* Chart + Today's Sessions Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area Chart Card */}
                <div className="lg:col-span-2 bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setChartMetric('learners')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          chartMetric === 'learners'
                            ? 'bg-[#131b2d] text-white shadow-xs dark:bg-gray-900'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        Learners
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMetric('sessions')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          chartMetric === 'sessions'
                            ? 'bg-[#131b2d] text-white shadow-xs dark:bg-gray-900'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        Sessions
                      </button>
                    </div>
                  </div>

                  {renderAreaChart()}
                </div>

                {/* Today's Sessions Card */}
                <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sessions</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Statistics for today</p>

                    <div className="space-y-4">
                      {/* Scheduled */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 shrink-0">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {data?.overview.todayStats.scheduled ?? 6}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Scheduled</div>
                        </div>
                      </div>

                      {/* Live now */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 shrink-0">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {data?.overview.todayStats.live ?? 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Live now</div>
                        </div>
                      </div>

                      {/* Running late */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 shrink-0">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {data?.overview.todayStats.runningLate ?? 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Running late</div>
                        </div>
                      </div>

                      {/* Completed */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {data?.overview.todayStats.completed ?? 2}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Completed</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sessions')}
                    className="w-full mt-6 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    See all sessions
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= SESSIONS TAB ================= */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Subtabs + Filters Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSessionSubTab('upcoming')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      sessionSubTab === 'upcoming'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs border border-gray-200 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Upcoming <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-600 dark:text-gray-300">{upcomingSessions.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionSubTab('past')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      sessionSubTab === 'past'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs border border-gray-200 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Past <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-600 dark:text-gray-300">{pastSessions.length}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {sessionSubTab === 'upcoming' && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer mr-2">
                      <input
                        type="checkbox"
                        checked={seeConflicts}
                        onChange={(e) => setSeeConflicts(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      See Conflicts
                    </label>
                  )}

                  <CustomSelect
                    value={sessionSubTab === 'upcoming' ? upcomingTimeRange : pastTimeRange}
                    onChange={(val) =>
                      sessionSubTab === 'upcoming'
                        ? setUpcomingTimeRange(val as string)
                        : setPastTimeRange(val as string)
                    }
                    options={sessionSubTab === 'upcoming' ? upcomingTimeOptions : pastTimeOptions}
                    size="sm"
                    className="w-40"
                  />

                  <button
                    type="button"
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-gray-500" />
                    Filter
                  </button>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <th className="py-4 px-6">Course</th>
                        <th className="py-4 px-6">Educators/Admins</th>
                        <th className="py-4 px-6">Date</th>
                        {sessionSubTab === 'upcoming' ? (
                          <>
                            <th className="py-4 px-6">Time</th>
                            <th className="py-4 px-6"></th>
                            <th className="py-4 px-6 text-right"></th>
                          </>
                        ) : (
                          <>
                            <th className="py-4 px-6">Duration</th>
                            <th className="py-4 px-6">Learner Feedback</th>
                            <th className="py-4 px-6">Session status</th>
                            <th className="py-4 px-6 text-center">Participants</th>
                            <th className="py-4 px-6 text-center">Recording</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {(sessionSubTab === 'upcoming' ? upcomingSessions : pastSessions).length === 0 ? (
                        <tr>
                          <td colSpan={sessionSubTab === 'upcoming' ? 6 : 7} className="py-16 text-center">
                            <CalendarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              No {sessionSubTab} sessions found
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Sessions scheduled will appear here.</p>
                          </td>
                        </tr>
                      ) : (
                        (sessionSubTab === 'upcoming' ? upcomingSessions : pastSessions).map((s) => {
                          const isCancelled = s.status === 'cancelled';
                          const isCompleted = s.status === 'completed';

                          return (
                            <tr
                              key={s.id}
                              onClick={() => handleOpenSessionModal(s)}
                              className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                            >
                              <td className="py-4 px-6">
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                  {s.courseName || s.title || 'Personalized Session'}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {s.courseCode || s.title || '1-on-1 Personalized'}
                                </div>
                              </td>

                              <td className="py-4 px-6">
                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                  {s.educatorName || 'Abir Sir'}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  Ms. Khushi
                                </div>
                              </td>

                              <td className="py-4 px-6 text-gray-700 dark:text-gray-300 font-medium">
                                <div>{formatDate(s.scheduledAt)}</div>
                                {sessionSubTab === 'past' && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {formatTime(s.scheduledAt)}
                                  </div>
                                )}
                              </td>

                              {sessionSubTab === 'upcoming' && (
                                <>
                                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300 font-medium">
                                    {formatTime(s.scheduledAt)}
                                  </td>
                                  <td className="py-4 px-6">
                                    {isCancelled && (
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                                        Cancelled
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 text-right relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveMenuSessionId(
                                          activeMenuSessionId === s.id ? null : s.id
                                        )
                                      }
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeMenuSessionId === s.id && (
                                      <div className="absolute right-6 top-12 z-50 w-40 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1 text-left animate-in fade-in zoom-in-95">
                                        {isCancelled ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveMenuSessionId(null);
                                              handleDeleteSession(s.id);
                                            }}
                                            className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuSessionId(null);
                                                handleOpenSessionModal(s);
                                              }}
                                              className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                                            >
                                              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                              Edit
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuSessionId(null);
                                                handleCancelSession(s.id);
                                              }}
                                              className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                                            >
                                              <XCircle className="w-3.5 h-3.5 text-amber-500" />
                                              Cancel session
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuSessionId(null);
                                                handleDeleteSession(s.id);
                                              }}
                                              className="w-full px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer border-t border-gray-100 dark:border-gray-800"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Delete
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}

                              {sessionSubTab === 'past' && (
                                <>
                                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300 font-medium">
                                    {s.durationMin || 60}m
                                  </td>
                                  <td className="py-4 px-6 text-gray-400 font-medium">
                                    —
                                  </td>
                                  <td className="py-4 px-6">
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                        isCompleted
                                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
                                      }`}
                                    >
                                      {isCompleted ? 'Completed' : 'Cancelled'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                                    1
                                  </td>
                                  <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                    {isCompleted ? (
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSessionModal(s)}
                                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition cursor-pointer"
                                          title="Play recording"
                                        >
                                          <Play className="w-4 h-4 fill-current" />
                                        </button>
                                        <button
                                          type="button"
                                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition cursor-pointer"
                                          title="Download recording"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg bg-[#131b2d] dark:bg-gray-800 text-white font-bold text-xs flex items-center justify-center"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 font-medium text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-50 transition cursor-pointer"
                    >
                      2
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-[#131b2d] hover:bg-gray-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= COURSES TAB ================= */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              {/* Search + Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <CustomSelect
                    value={courseTimeRange}
                    onChange={(val) => setCourseTimeRange(val as string)}
                    options={genericTimeOptions}
                    size="sm"
                    className="w-36"
                  />
                </div>
              </div>

              {/* Courses Table */}
              <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <th className="py-4 px-6">Courses</th>
                        <th className="py-4 px-6 text-center">Learners</th>
                        <th className="py-4 px-6 text-center">Sessions</th>
                        <th className="py-4 px-6 text-center">Duration (mins)</th>
                        <th className="py-4 px-6 text-center">Chit chat s</th>
                        <th className="py-4 px-6 text-center">Tests</th>
                        <th className="py-4 px-6 text-center">Polls</th>
                        <th className="py-4 px-6 text-center">Assessments</th>
                        <th className="py-4 px-6 text-center">Resources</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {filteredCourses.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center">
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              No courses found
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Create a course to see analytics.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredCourses.map((course) => (
                          <tr
                            key={course.id}
                            onClick={() => router.push(`/admin/courses/1-on-1?courseId=${course.id}`)}
                            className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                                  {course.name.charAt(0)}
                                </div>
                                <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                                  {course.name}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                              {course.learnersCount ?? 1}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                              {course.sessionsCount ?? 0}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                              {course.durationMin ?? 0}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-400 font-medium">
                              {course.chitChats ?? 0}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-400 font-medium">
                              {course.tests ?? 0}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-400 font-medium">
                              {course.polls ?? 0}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-400 font-medium">
                              {course.assessments ?? 0}
                            </td>
                            <td className="py-4 px-6 text-center text-gray-400 font-medium">
                              {course.resources ?? 0}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-[#131b2d] hover:bg-gray-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= EDUCATORS TAB (Screenshot 1) ================= */}
          {activeTab === 'educators' && (
            <div className="space-y-6">
              {/* Search + Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={educatorSearch}
                    onChange={(e) => setEducatorSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <CustomSelect
                    value={educatorTimeRange}
                    onChange={(val) => setEducatorTimeRange(val as string)}
                    options={genericTimeOptions}
                    size="sm"
                    className="w-36"
                  />
                </div>
              </div>

              {/* Educators Table */}
              <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <th className="py-4 px-6">Educator</th>
                        <th className="py-4 px-6 text-center">Courses</th>
                        <th className="py-4 px-6 text-center">Sessions</th>
                        <th className="py-4 px-6 text-center">Duration (mins)</th>
                        <th className="py-4 px-6 text-center">Chit chat s</th>
                        <th className="py-4 px-6 text-center">Tests</th>
                        <th className="py-4 px-6 text-center">Polls</th>
                        <th className="py-4 px-6 text-center">Assessments</th>
                        <th className="py-4 px-6 text-center">Resources</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {filteredEducators.map((edu) => (
                        <tr
                          key={edu.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                        >
                          {/* Educator avatar + name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#131b2d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {edu.name.charAt(0)}
                              </div>
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                {edu.name}
                              </div>
                            </div>
                          </td>

                          {/* Courses (blue link style) */}
                          <td className="py-4 px-6 text-center">
                            <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
                              {edu.coursesCount}
                            </span>
                          </td>

                          {/* Sessions */}
                          <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                            {edu.sessionsCount}
                          </td>

                          {/* Duration (mins) */}
                          <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                            {edu.durationMin}
                          </td>

                          {/* Chit chats */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {edu.chitChats ?? 0}
                          </td>

                          {/* Tests */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {edu.tests ?? 0}
                          </td>

                          {/* Polls */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {edu.polls ?? 0}
                          </td>

                          {/* Assessments */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {edu.assessments ?? 0}
                          </td>

                          {/* Resources */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {edu.resources ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-[#131b2d] hover:bg-gray-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= LEARNERS TAB (Screenshot 2) ================= */}
          {activeTab === 'learners' && (
            <div className="space-y-6">
              {/* Search + Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={learnerSearch}
                    onChange={(e) => setLearnerSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <CustomSelect
                    value={learnerTimeRange}
                    onChange={(val) => setLearnerTimeRange(val as string)}
                    options={genericTimeOptions}
                    size="sm"
                    className="w-36"
                  />
                </div>
              </div>

              {/* Learners Table */}
              <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <th className="py-4 px-6">Learner</th>
                        <th className="py-4 px-6 text-center">Courses</th>
                        <th className="py-4 px-6 text-center">Sessions</th>
                        <th className="py-4 px-6 text-center">Duration (mins)</th>
                        <th className="py-4 px-6 text-center">Chit chat s</th>
                        <th className="py-4 px-6 text-center">Tests</th>
                        <th className="py-4 px-6 text-center">Polls</th>
                        <th className="py-4 px-6 text-center">Assessments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {filteredLearners.map((lrn) => (
                        <tr
                          key={lrn.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                        >
                          {/* Learner avatar + name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#131b2d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {lrn.name.charAt(0)}
                              </div>
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                {lrn.name}
                              </div>
                            </div>
                          </td>

                          {/* Courses */}
                          <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                            {lrn.coursesCount}
                          </td>

                          {/* Sessions */}
                          <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                            {lrn.sessionsCount}
                          </td>

                          {/* Duration (mins) */}
                          <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300 font-medium">
                            {lrn.durationMin}
                          </td>

                          {/* Chit chats */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {lrn.chitChats ?? 0}
                          </td>

                          {/* Tests */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {lrn.tests ?? 0}
                          </td>

                          {/* Polls */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {lrn.polls ?? 0}
                          </td>

                          {/* Assessments */}
                          <td className="py-4 px-6 text-center text-gray-400 font-medium">
                            {lrn.assessments ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Pagination */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLearnerPage(Math.max(1, learnerPage - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLearnerPage(1)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer ${
                        learnerPage === 1
                          ? 'bg-[#131b2d] dark:bg-gray-800 text-white'
                          : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      1
                    </button>
                    <button
                      type="button"
                      onClick={() => setLearnerPage(2)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer ${
                        learnerPage === 2
                          ? 'bg-[#131b2d] dark:bg-gray-800 text-white'
                          : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      2
                    </button>
                    <button
                      type="button"
                      onClick={() => setLearnerPage(Math.min(2, learnerPage + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-[#131b2d] hover:bg-gray-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= LOGS TAB (Screenshot 3) ================= */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              {/* Filter Pills + Controls Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Activity Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                  {[
                    { id: 'all', label: 'All Activity' },
                    { id: 'user', label: 'User' },
                    { id: 'course', label: 'Course' },
                    { id: 'session', label: 'Session' },
                    { id: 'content', label: 'Content' },
                    { id: 'billing', label: 'Billing' },
                    { id: 'credit', label: 'Credit' },
                    { id: 'settings', label: 'Settings' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLogCategory(cat.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                        logCategory === cat.id
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 shadow-xs font-bold'
                          : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200/60 dark:border-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Right filters */}
                <div className="flex items-center gap-3 shrink-0">
                  <CustomSelect
                    value={logTimeRange}
                    onChange={(val) => setLogTimeRange(val as string)}
                    options={logTimeOptions}
                    size="sm"
                    className="w-36"
                  />

                  <button
                    type="button"
                    onClick={() => setIsFilterModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-gray-500" />
                    Filter
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-white dark:bg-[#161B26] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <th className="py-4 px-6">User</th>
                        <th className="py-4 px-6">Event Type</th>
                        <th className="py-4 px-6">Action</th>
                        <th className="py-4 px-6">Details</th>
                        <th className="py-4 px-6 text-right">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                        >
                          {/* User with Role badge */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#131b2d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {log.userName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                                  {log.userName}
                                </div>
                                <span
                                  className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.userRole === 'Owner'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                      : 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                                  }`}
                                >
                                  {log.userRole}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Event Type pill */}
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                              {log.eventType}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100 text-xs">
                            {log.action}
                          </td>

                          {/* Details */}
                          <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-xs max-w-md truncate">
                            {log.details}
                          </td>

                          {/* Date / Time */}
                          <td className="py-4 px-6 text-right font-medium text-gray-600 dark:text-gray-400 text-xs">
                            {log.createdAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= FILTER MODAL (Screenshot 4) ================= */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Filter</h2>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Learner Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Learner</label>
              <CustomSelect
                value={filterLearner}
                onChange={(val) => setFilterLearner(val as string)}
                options={learnerSelectOptions}
                placeholder="All"
                className="w-full"
              />
            </div>

            {/* Educator Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Educator</label>
              <CustomSelect
                value={filterEducator}
                onChange={(val) => setFilterEducator(val as string)}
                options={educatorSelectOptions}
                placeholder="All"
                className="w-full"
              />
            </div>

            {/* Course Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Course</label>
              <CustomSelect
                value={filterCourse}
                onChange={(val) => setFilterCourse(val as string)}
                options={courseSelectOptions}
                placeholder="Course"
                className="w-full"
              />
            </div>

            {/* Action Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Action</label>
              <CustomSelect
                value={filterAction}
                onChange={(val) => setFilterAction(val as string)}
                options={actionSelectOptions}
                placeholder="All Actions"
                className="w-full"
              />
            </div>

            {/* Footer buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setFilterLearner('all');
                  setFilterEducator('all');
                  setFilterCourse('all');
                  setFilterAction('all');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#131b2d] hover:bg-gray-900 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SESSION DETAIL MODAL ================= */}
      {selectedSession && (
        <SessionDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSession(null);
          }}
          session={selectedSession}
          userRole="admin"
          onPlayRecording={(sess) => {
            if (sess.recordingUrl) {
              window.open(sess.recordingUrl, '_blank');
            } else {
              alert('Recording is being processed by Zoom AI Companion.');
            }
          }}
          onDeleteSession={async (sessionId) => {
            await handleDeleteSession(sessionId);
          }}
          onUpdateSession={async (sessionId, updates) => {
            await fetch(`/api/v1/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            await fetchAnalyticsData();
          }}
        />
      )}
    </div>
  );
}
