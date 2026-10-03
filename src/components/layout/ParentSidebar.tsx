'use client';

import React from 'react';
import AppSidebar from './AppSidebar';
import { 
  LayoutDashboard, 
  BarChart2, 
  CreditCard, 
  MessageSquare, 
  ShoppingBag,
  Calendar,
} from 'lucide-react';

interface ParentSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/parent/calendar', icon: Calendar },
  { name: 'Progress Reports', href: '/parent/reports', icon: BarChart2 },
  { name: 'Fees & Subscriptions', href: '/parent/fees', icon: CreditCard },
  { name: 'Course Store', href: '/parent/store', icon: ShoppingBag },
  { name: 'Chats', href: '/parent/chats', icon: MessageSquare },
];

export default function ParentSidebar(props: ParentSidebarProps) {
  return (
    <AppSidebar 
      {...props} 
      navItems={navItems} 
      dashboardUrl="/parent/dashboard"
      settingsUrl="/parent/settings"
    />
  );
}
