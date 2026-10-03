import React from 'react';
import { ScheduleSessionsClient } from './ScheduleSessionsClient';

export const dynamic = 'force-dynamic';

export default async function ScheduleSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ScheduleSessionsClient courseId={id} />;
}
