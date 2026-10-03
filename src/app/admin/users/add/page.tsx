'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddUserModal, UserRoleOption } from '@/components/admin/AddUserModal';

function AddUserPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRole = searchParams?.get('role');
  const role: UserRoleOption =
    rawRole === 'admin' ? 'admin' : rawRole === 'educator' ? 'educator' : 'learner';

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <AddUserModal
        isOpen={true}
        initialRole={role}
        onClose={() => router.push('/admin/users')}
        onSuccess={() => router.push('/admin/users')}
      />
    </div>
  );
}

export default function AddUserPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-gray-500">Loading form...</div>}>
      <AddUserPageContent />
    </React.Suspense>
  );
}
