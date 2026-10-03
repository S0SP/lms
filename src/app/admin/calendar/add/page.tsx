import React from 'react';
import { db } from '@/lib/drizzle';
import { courses, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AddSessionForm } from '@/components/admin/AddSessionForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AddSessionPage() {
  // Fetch available published courses
  const availableCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
    })
    .from(courses)
    .where(eq(courses.status, 'published'));

  // Fetch all educators
  const educators = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.role, 'educator'));

  // Fetch all learners
  const learners = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.role, 'learner'));

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/admin/calendar" 
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add New Session</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Schedule a new live class or 1-on-1 session.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <AddSessionForm 
          courses={availableCourses}
          educators={educators}
          learners={learners}
        />
      </div>
    </div>
  );
}
