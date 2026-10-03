'use client';

import React, { useState } from 'react';
import EducatorSidebar from '@/components/layout/EducatorSidebar';
import EducatorHeader from '@/components/layout/EducatorHeader';

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 font-body-main min-h-screen">
      {/* Sidebar Navigation */}
      <EducatorSidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Top Header */}
      <EducatorHeader 
        onMenuClick={() => setMobileOpen(true)}
        isCollapsed={isCollapsed}
      />

      {/* Main Content Area */}
      <main className={`pt-16 min-h-screen transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-56'}`}>
        {children}
      </main>
    </div>
  );
}
