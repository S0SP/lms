import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AnalyticsWorkspaceClient } from '@/components/admin/AnalyticsWorkspaceClient';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['owner', 'admin'];

export default async function AdminAnalytics() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes((session.user as { role?: string }).role ?? '')) redirect('/');

  return <AnalyticsWorkspaceClient />;
}
