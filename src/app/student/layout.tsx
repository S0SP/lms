'use client';

import React, { useState } from 'react';
import StudentSidebar from '@/components/layout/StudentSidebar';
import StudentHeader from '@/components/layout/StudentHeader';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 font-body-main min-h-screen">
      {/* Sidebar Navigation */}
      <StudentSidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Top Header */}
      <StudentHeader 
        onMenuClick={() => setMobileOpen(true)}
        isCollapsed={isCollapsed}
      />

      {/* Main Content Area */}
      <main className={`pt-16 min-h-screen bg-gray-50 dark:bg-[#050505] transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-56'}`}>
        {children}
      </main>
    </div>
  );
}
