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
  Smartphone,
  Webhook,
  ChevronRight,
  TrendingUp,
  BookOpen,
  FileText,
  Video,
} from 'lucide-react';
import { db } from '@/lib/drizzle';
import { users, courses, sessions, monthlyReports } from '@/db/schema';
import { eq, count, and, gte, lte, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// ─── KPI fetch — runs server-side, zero client JS cost ───────────────────────
async function fetchKpis() {
  const [learners, educators, activeCourses, sessionsThisMonth, pendingReports] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.role, 'learner')),
    db.select({ count: count() }).from(users).where(eq(users.role, 'educator')),
    db.select({ count: count() }).from(courses).where(eq(courses.status, 'published')),
    db.execute(sql`
      SELECT count(*)::int as count FROM sessions
      WHERE scheduled_at >= date_trunc('month', now())
        AND scheduled_at < date_trunc('month', now()) + interval '1 month'
    `),
    db.select({ count: count() }).from(monthlyReports).where(eq(monthlyReports.status, 'draft')),
  ]);

  return {
    totalLearners: learners[0]?.count ?? 0,
    totalEducators: educators[0]?.count ?? 0,
    activeCourses: activeCourses[0]?.count ?? 0,
    sessionsThisMonth: Number((sessionsThisMonth[0] as any)?.count ?? 0),
    pendingReports: pendingReports[0]?.count ?? 0,
  };
}

// ─── KPI Banner ───────────────────────────────────────────────────────────────
async function KpiBanner() {
  const kpis = await fetchKpis();

  const stats = [
    { label: 'Total Learners', value: kpis.totalLearners, icon: PersonStanding, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/admin/users?role=learner' },
    { label: 'Educators', value: kpis.totalEducators, icon: School, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', href: '/admin/users?role=educator' },
    { label: 'Active Courses', value: kpis.activeCourses, icon: BookOpen, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', href: '/admin/courses' },
    { label: 'Sessions This Month', value: kpis.sessionsThisMonth, icon: Video, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/admin/calendar' },
    { label: 'Pending Reports', value: kpis.pendingReports, icon: FileText, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', href: '/admin/reports' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-2 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <div className="text-2xl font-bold text-[#131b2d] dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {s.value.toLocaleString()}
          </div>
          <div className="text-xs text-[#414754] dark:text-gray-400 font-medium">{s.label}</div>
        </Link>
      ))}
    </div>
  );
}

// ─── Skeleton for Suspense fallback ──────────────────────────────────────────
function KpiBannerSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-pulse">
          <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
          <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default async function AdminDashboard() {
  const session = await auth();
  const adminName = session?.user?.name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#131b2d] dark:text-gray-100">
          Good morning, {adminName} 👋
        </h1>
        <p className="text-[#414754] dark:text-gray-400 mt-1 text-sm">
          Here's a live snapshot of your academy
        </p>
      </div>

      {/* Live KPI Stats — streamed server-side */}
      <Suspense fallback={<KpiBannerSkeleton />}>
        <KpiBanner />
      </Suspense>

      <div className="space-y-12">
        {/* Section 1: Create a Course */}
        <section>
          <h2 className="text-lg font-bold text-[#131b2d] dark:text-gray-100 mb-6 flex items-center gap-2">
            <School className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Create a Course
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1-on-1 */}
            <div className="bg-white dark:bg-[#161B26] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col hover:border-blue-500 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <PersonStanding className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#131b2d] dark:text-gray-100 mb-1">1-on-1 Personalised</h3>
              <p className="text-[#414754] dark:text-gray-400 text-sm flex-1 mb-6">
                Tailored sessions for individual learners with flexible scheduling and direct mentoring.
              </p>
              <Link href="/admin/courses/create?type=one_on_one" className="text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                Create course <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Group */}
            <div className="bg-white dark:bg-[#161B26] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col hover:border-blue-500 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#131b2d] dark:text-gray-100 mb-1">Group Cohort</h3>
              <p className="text-[#414754] dark:text-gray-400 text-sm flex-1 mb-6">
                Live sessions for multiple students, fostering community learning and shared discussions.
              </p>
              <Link href="/admin/courses/create?type=group" className="text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                Create course <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Recorded */}
            <div className="bg-white dark:bg-[#161B26] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col hover:border-blue-500 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#131b2d] dark:text-gray-100 mb-1">Recorded</h3>
              <p className="text-[#414754] dark:text-gray-400 text-sm flex-1 mb-6">
                Self-paced video courses with quizzes and assignments that students can access anytime.
              </p>
              <Link href="/admin/courses/create?type=recorded" className="text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                Create course <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 2: Add Users */}
        <section>
          <h2 className="text-lg font-bold text-[#131b2d] dark:text-gray-100 mb-6 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Add Users
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/admin/users/learners/add" className="bg-white dark:bg-[#161B26] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 hover:border-blue-500 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <PersonStanding className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#131b2d] dark:text-gray-100">Add Learner</h3>
                <p className="text-[#414754] dark:text-gray-400 text-sm">Invite students to join your academy.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link href="/admin/users/educators/add" className="bg-white dark:bg-[#161B26] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 hover:border-blue-500 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#131b2d] dark:text-gray-100">Add Educator</h3>
                <p className="text-[#414754] dark:text-gray-400 text-sm">Onboard teachers and grant administrative access.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </Link>
          </div>
        </section>

        {/* Section 3: Explore Features */}
        <section>
          <h2 className="text-lg font-bold text-[#131b2d] dark:text-gray-100 mb-6 flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Explore Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/settings?tab=integrations" className="bg-gray-50 dark:bg-[#1C2333] p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-[#161B26] hover:shadow-sm transition-all flex flex-col gap-3 group">
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500" />
              <span className="font-semibold text-sm text-[#131b2d] dark:text-gray-100">Connect Google Calendar</span>
            </Link>

            <Link href="/admin/settings?tab=payments" className="bg-gray-50 dark:bg-[#1C2333] p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-[#161B26] hover:shadow-sm transition-all flex flex-col gap-3 group">
              <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500" />
              <span className="font-semibold text-sm text-[#131b2d] dark:text-gray-100">Connect Payment Gateway</span>
            </Link>

            <Link href="/admin/analytics" className="bg-gray-50 dark:bg-[#1C2333] p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-[#161B26] hover:shadow-sm transition-all flex flex-col gap-3 group">
              <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500" />
              <span className="font-semibold text-sm text-[#131b2d] dark:text-gray-100">Analytics & Reports</span>
            </Link>

            <Link href="/admin/settings?tab=webhooks" className="bg-gray-50 dark:bg-[#1C2333] p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-[#161B26] hover:shadow-sm transition-all flex flex-col gap-3 group">
              <Webhook className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500" />
              <span className="font-semibold text-sm text-[#131b2d] dark:text-gray-100">APIs & Webhooks</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
