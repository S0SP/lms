'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AddLearnerModal } from '@/components/admin/AddLearnerModal';

export default function AddLearnerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <AddLearnerModal
        isOpen={true}
        onClose={() => router.push('/admin/users/learners')}
        onSuccess={() => router.push('/admin/users/learners')}
      />
    </div>
  );
}
