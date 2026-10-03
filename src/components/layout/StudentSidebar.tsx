'use client';

import React from 'react';
import AppSidebar from './AppSidebar';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Calendar, 
  BarChart2, 
  CreditCard, 
  MessageSquare, 
} from 'lucide-react';

interface StudentSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'My Courses', href: '/student/courses', icon: GraduationCap },
  { name: 'Sessions', href: '/student/sessions', icon: Calendar },
  { name: 'Progress Reports', href: '/student/progress-reports', icon: BarChart2 },
  { name: 'Fees', href: '/student/fees', icon: CreditCard },
  { name: 'Chats', href: '/student/chats', icon: MessageSquare },
];

export default function StudentSidebar(props: StudentSidebarProps) {
  return (
    <AppSidebar 
      {...props} 
      navItems={navItems} 
      dashboardUrl="/student/dashboard"
      settingsUrl="/student/settings"
    />
  );
}
