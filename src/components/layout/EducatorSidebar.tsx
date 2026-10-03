'use client';

import React from 'react';
import AppSidebar from './AppSidebar';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  BookOpen, 
  MessageSquare, 
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

interface EducatorSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', href: '/educator/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/educator/calendar', icon: Calendar },
  { name: 'Availability', href: '/educator/availability', icon: Clock },
  { name: 'Courses', href: '/educator/courses', icon: BookOpen },
  { name: 'Chats', href: '/educator/chats', icon: MessageSquare },
  { name: 'Payouts', href: '/educator/payouts', icon: CreditCard },
  { name: 'Conflicts', href: '/educator/conflicts', icon: AlertTriangle },
];

export default function EducatorSidebar(props: EducatorSidebarProps) {
  return (
    <AppSidebar 
      {...props} 
      navItems={navItems} 
      dashboardUrl="/educator/dashboard"
      settingsUrl="/educator/settings"
    />
  );
}
