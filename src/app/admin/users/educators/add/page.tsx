'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AddEducatorModal } from '@/components/admin/AddEducatorModal';

export default function AddEducatorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <AddEducatorModal
        isOpen={true}
        onClose={() => router.push('/admin/users/educators')}
        onSuccess={() => router.push('/admin/users/educators')}
      />
    </div>
  );
}
