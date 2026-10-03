'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppSidebar from './AppSidebar';
import { 
  Rocket,
  Calendar, 
  Clock,
  Video,
  UserCheck,
  Users,
  Film,
  UsersRound,
  FileText,
  Store,
  BarChart2,
  Plus,
  GraduationCap,
  Shield,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { AddUserModal, UserRoleOption } from '@/components/admin/AddUserModal';

interface AdminSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { name: 'Get Started', href: '/admin/dashboard', icon: Rocket },
  { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { name: 'Availability', href: '/admin/availability', icon: Clock },
  { name: 'Consultations', href: '/admin/consultations', icon: Video },
  { name: '1-On-1 Personalized...', href: '/admin/courses/1-on-1', icon: UserCheck },
  { name: 'Group Courses', href: '/admin/courses/group', icon: Users },
  { name: 'Recorded Courses', href: '/admin/courses/recorded', icon: Film },
  { name: 'Users', href: '/admin/users', icon: UsersRound },
  { name: 'Progress Reports', href: '/admin/reports', icon: FileText },
  { name: 'Store', href: '/admin/store', icon: Store },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
];

export default function AdminSidebar(props: AdminSidebarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <AppSidebar 
        {...props} 
        navItems={navItems} 
        dashboardUrl="/admin/dashboard"
        settingsUrl="/admin/settings"
        bottomAction={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-[#F1F5F9] dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition shadow-2xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            <span>Add User</span>
            <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400 ml-1" />
          </button>
        }
      />

      {/* Modal matching Screenshots 1 & 2 */}
      <AddUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRole={null}
      />
    </>
  );
}

