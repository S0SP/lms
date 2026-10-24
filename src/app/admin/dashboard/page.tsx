import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  School,
  PersonStanding,
  Users,
  PlayCircle,
  UserPlus,
  Compass,
  Calendar,
  CreditCard,
  Webhook,
  ChevronRight,
  TrendingUp,
  BookOpen,
  FileText,
  Video,
  Clock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { db } from '@/lib/drizzle';
import { users, courses, sessions, monthlyReports, courseEnrollments } from '@/db/schema';
import { eq, count, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// ─── Live Data Fetcher (Runs Server-Side, Zero Client JS Waterfall) ────────────
async function fetchDashboardData() {
  const [
    learnersCount,
    educatorsCount,
    activeCoursesCount,
    sessionsThisMonthCount,
    pendingReportsCount,
    recentCourses,
    recentSessions,
    recentUsers,
    enrollmentsCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.role, 'learner')),
    db.select({ count: count() }).from(users).where(eq(users.role, 'educator')),
    db.select({ count: count() }).from(courses).where(eq(courses.status, 'published')),
    db.execute(sql`
      SELECT count(*)::int as count FROM sessions
      WHERE scheduled_at >= date_trunc('month', now())
        AND scheduled_at < date_trunc('month', now()) + interval '1 month'
    `),
    db.select({ count: count() }).from(monthlyReports).where(eq(monthlyReports.status, 'draft')),
    db.select({
      id: courses.id,
      name: courses.name,
      type: courses.type,
      status: courses.status,
      board: courses.board,
      grade: courses.grade,
      createdAt: courses.createdAt,
    })
      .from(courses)
      .orderBy(desc(courses.createdAt))
      .limit(5),
    db.select({
      id: sessions.id,
      title: sessions.title,
      topic: sessions.topic,
      scheduledAt: sessions.scheduledAt,
      durationMin: sessions.durationMin,
      status: sessions.status,
      zoomMeetingUrl: sessions.zoomMeetingUrl,
      courseName: courses.name,
      educatorName: users.name,
    })
      .from(sessions)
      .leftJoin(courses, eq(sessions.courseId, courses.id))
      .leftJoin(users, eq(sessions.educatorId, users.id))
      .orderBy(desc(sessions.scheduledAt))
      .limit(5),
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5),
    db.select({ count: count() }).from(courseEnrollments),
  ]);

  return {
    kpis: {
      totalLearners: learnersCount[0]?.count ?? 0,
      totalEducators: educatorsCount[0]?.count ?? 0,
      activeCourses: activeCoursesCount[0]?.count ?? 0,
      sessionsThisMonth: Number((sessionsThisMonthCount[0] as any)?.count ?? 0),
      pendingReports: pendingReportsCount[0]?.count ?? 0,
      totalEnrollments: enrollmentsCount[0]?.count ?? 0,
    },
    recentCourses,
    recentSessions,
    recentUsers,
  };
}

// ─── Format helper for dates ──────────────────────────────────────────────────
function formatDate(date: Date | string | null) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSessionTime(date: Date | string | null) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── KPI Banner Component ─────────────────────────────────────────────────────
function KpiBanner({ kpis }: { kpis: any }) {
  const stats = [
    {
      label: 'Total Learners',
      value: kpis.totalLearners,
      icon: PersonStanding,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/admin/users?role=learner',
      subtext: `${kpis.totalEnrollments} active enrollments`,
    },
    {
      label: 'Educators',
      value: kpis.totalEducators,
      icon: School,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      href: '/admin/users?role=educator',
      subtext: 'Teaching faculty',
    },
    {
      label: 'Active Courses',
      value: kpis.activeCourses,
      icon: BookOpen,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      href: '/admin/courses',
      subtext: 'Published curricula',
    },
    {
      label: 'Sessions This Month',
      value: kpis.sessionsThisMonth,
      icon: Video,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      href: '/admin/calendar',
      subtext: 'Current month calendar',
    },
    {
      label: 'Pending Reports',
      value: kpis.pendingReports,
      icon: FileText,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      href: '/admin/reports',
      subtext: 'Drafts requiring review',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-[#131b2d] dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {s.value.toLocaleString()}
            </div>
            <div className="text-xs text-[#414754] dark:text-gray-400 font-medium mt-0.5">{s.label}</div>
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 border-t border-gray-100 dark:border-gray-800/60 pt-2 truncate">
            {s.subtext}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6" />
        <div className="h-96 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6" />
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export default async function AdminDashboard() {
  const session = await auth();
  const adminName = session?.user?.name?.split(' ')[0] ?? 'Admin';
  const data = await fetchDashboardData();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#131b2d] dark:text-gray-100">
              Good morning, {adminName} 👋
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live DB Sync
            </span>
          </div>
          <p className="text-[#414754] dark:text-gray-400 mt-1 text-sm">
            Live database snapshot of your academy courses, sessions, faculty, and learners.
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses/create"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Course
          </Link>
          <Link
            href="/admin/calendar"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#161B26] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-xs transition-colors"
          >
            <CalendarDays className="w-4 h-4 text-gray-500" /> Calendar
          </Link>
        </div>
      </div>

      {/* Live KPI Stats */}
      <Suspense fallback={<DashboardSkeleton />}>
        <KpiBanner kpis={data.kpis} />
      </Suspense>

      {/* Two Column Layout: Live Data on Left, Members & Quick Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Courses & Live Sessions (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Live Recent Courses */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Recent Courses ({data.recentCourses.length})
                </h2>
              </div>
              <Link
                href="/admin/courses"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all ({data.kpis.activeCourses}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.recentCourses.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No courses found in database.{' '}
                <Link href="/admin/courses/create" className="text-blue-600 underline">
                  Create your first course
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.recentCourses.map((c) => (
                  <div
                    key={c.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 px-2 rounded-lg transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/courses/${c.id}`}
                          className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate"
                        >
                          {c.name}
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                            c.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="capitalize">{c.type.replace(/_/g, ' ')}</span>
                        {c.board && <span>• {c.board}</span>}
                        {c.grade && <span>• {c.grade}</span>}
                        <span>• Added {formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 rounded transition-colors shrink-0"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Scheduled & Recent Sessions */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Upcoming & Recent Sessions ({data.recentSessions.length})
                </h2>
              </div>
              <Link
                href="/admin/calendar"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View calendar <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.recentSessions.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No sessions scheduled yet.{' '}
                <Link href="/admin/calendar" className="text-blue-600 underline">
                  Schedule a session
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {s.topic || s.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                            s.status === 'live'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse'
                              : s.status === 'completed'
                              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        {s.courseName && <span className="text-gray-600 dark:text-gray-300 font-medium">{s.courseName}</span>}
                        {s.educatorName && <span>• {s.educatorName}</span>}
                        <span>• {formatSessionTime(s.scheduledAt)}</span>
                        <span>({s.durationMin} min)</span>
                      </div>
                    </div>
                    {s.zoomMeetingUrl && (
                      <a
                        href={s.zoomMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded flex items-center gap-1 shrink-0 self-start sm:self-center transition-colors"
                      >
                        <Video className="w-3 h-3" /> Join Zoom
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Users & Quick Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Recent Users from Database */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Recent Users ({data.recentUsers.length})
                </h2>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.recentUsers.map((u) => {
                const initials = u.name
                  ? u.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'U';
                const roleColors: Record<string, string> = {
                  learner: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                  educator: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
                  admin: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                };
                return (
                  <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                        roleColors[u.role] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
              <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Quick Course Launchers
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href="/admin/courses/create?type=one_on_one"
                className="p-3 bg-gray-50 dark:bg-[#1C2333] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <PersonStanding className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">1-on-1 Personalised</h3>
                    <p className="text-[11px] text-gray-400">Custom 1:1 mentorship curriculum</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Link>

              <Link
                href="/admin/courses/create?type=group"
                className="p-3 bg-gray-50 dark:bg-[#1C2333] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">Group Cohort</h3>
                    <p className="text-[11px] text-gray-400">Collaborative live batch learning</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Link>

              <Link
                href="/admin/courses/create?type=recorded"
                className="p-3 bg-gray-50 dark:bg-[#1C2333] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <PlayCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">Recorded Course</h3>
                    <p className="text-[11px] text-gray-400">Self-paced video modules & tests</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Link>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wider text-gray-400 mb-2">
                Onboard Users
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/admin/users/learners/add"
                  className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 group-hover:text-blue-600">+ Learner</p>
                </Link>
                <Link
                  href="/admin/users/educators/add"
                  className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 group-hover:text-violet-600">+ Educator</p>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Integrations & Tools */}
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2 mb-3">
              <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Academy Settings & Tools
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/admin/settings?tab=integrations"
                className="p-2.5 bg-gray-50 dark:bg-[#1C2333] rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-500" /> Calendar Sync
              </Link>
              <Link
                href="/admin/settings?tab=payments"
                className="p-2.5 bg-gray-50 dark:bg-[#1C2333] rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-gray-500" /> Payments
              </Link>
              <Link
                href="/admin/analytics"
                className="p-2.5 bg-gray-50 dark:bg-[#1C2333] rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-gray-500" /> Analytics
              </Link>
              <Link
                href="/admin/settings?tab=webhooks"
                className="p-2.5 bg-gray-50 dark:bg-[#1C2333] rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors"
              >
                <Webhook className="w-4 h-4 text-gray-500" /> Webhooks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
