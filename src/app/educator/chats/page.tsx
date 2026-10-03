import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ChatWorkspaceClient } from '@/components/chat/ChatWorkspaceClient';
import {
  getThreadForUser,
  listMessages,
  listThreadsForUser,
} from '@/repositories/chatRepository';

export const dynamic = 'force-dynamic';

const THREAD_LIMIT = 50;
const MESSAGE_LIMIT = 200;

interface PageProps {
  searchParams: Promise<{ thread?: string }>;
}

export default async function EducatorChatsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewerId = session.user.id as string;
  const viewerRole = (session.user as { role?: string }).role ?? '';

  const { thread: threadParam } = await searchParams;
  const threads = await listThreadsForUser(viewerId, { limit: THREAD_LIMIT });
  // getThreadForUser is the membership gate on the URL param: a non-member (or a
  // bogus id) resolves to null and we fall back to the most recent thread.
  const requested = threadParam ? await getThreadForUser(threadParam, viewerId) : null;
  const activeThreadId = requested?.thread.id ?? threads[0]?.id ?? null;
  const messages = activeThreadId
    ? await listMessages(activeThreadId, viewerId, { limit: MESSAGE_LIMIT })
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <ChatWorkspaceClient
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        viewerId={viewerId}
        viewerRole={viewerRole}
        emptyTitle="No conversations yet"
        emptyBody="Threads show up here once you are added to a direct chat or a course group."
      />
    </div>
  );
}
