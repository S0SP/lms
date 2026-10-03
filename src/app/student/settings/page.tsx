import React, { Suspense } from 'react';
import { SettingsWorkspaceClient } from '@/components/settings/SettingsWorkspaceClient';

export default function StudentSettingsPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account preferences and connected profiles.</p>
      </div>
      
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl"></div>}>
        <SettingsWorkspaceClient role="student" />
      </Suspense>
    </div>
  );
}
