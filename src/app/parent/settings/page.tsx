import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, parentProfiles, learnerProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  SettingsWorkspaceClient,
  type SettingsProfile,
  type LinkedChild,
} from '@/components/settings/SettingsWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function ParentSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const parentUserId = session.user.id as string;
  if ((session.user as any).role !== 'parent') redirect('/');

  // Real profile straight from the users table (no hardcoded mock values).
  const [profile] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, parentUserId))
    .limit(1);

  // Real linked children: parent_profiles rows owned by THIS parent, joined to the
  // learner's users row (same pattern as src/app/parent/dashboard/page.tsx and
  // src/app/parent/fees/page.tsx). learner_profiles is left-joined for grade/board
  // and only explicit columns are selected, so learner_profiles.private_note is
  // never returned.
  const childRows = await db
    .select({
      linkId: parentProfiles.id,
      learnerId: parentProfiles.learnerId,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      relationship: parentProfiles.relationship,
      grade: learnerProfiles.grade,
      board: learnerProfiles.board,
    })
    .from(parentProfiles)
    .innerJoin(users, eq(parentProfiles.learnerId, users.id))
    .leftJoin(learnerProfiles, eq(learnerProfiles.userId, users.id))
    .where(eq(parentProfiles.userId, parentUserId));

  // A learner can have more than one parent_profiles row for the same parent
  // (e.g. re-invited), so collapse to one card per learner.
  const seenLearners = new Set<string>();
  const linkedChildren: LinkedChild[] = [];
  for (const row of childRows) {
    if (seenLearners.has(row.learnerId)) continue;
    seenLearners.add(row.learnerId);
    linkedChildren.push({
      linkId: row.linkId,
      learnerId: row.learnerId,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      relationship: row.relationship,
      grade: row.grade,
      board: row.board,
    });
  }

  const initialProfile: SettingsProfile | null = profile
    ? {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
      }
    : null;

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Account Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal information, linked learners, and preferences.</p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl"></div>}>
        <SettingsWorkspaceClient
          role="parent"
          initialProfile={initialProfile}
          linkedChildren={linkedChildren}
        />
      </Suspense>
    </div>
  );
}
