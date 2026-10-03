'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, ChevronLeft, ChevronRight, Settings, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface AppSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  navItems: NavItem[];
  dashboardUrl: string;
  settingsUrl?: string;
  bottomAction?: React.ReactNode;
}

export default function AppSidebar({ 
  mobileOpen, 
  setMobileOpen, 
  isCollapsed, 
  setIsCollapsed,
  navItems,
  dashboardUrl,
  settingsUrl,
  bottomAction,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed left-0 top-0 h-screen z-50 flex flex-col bg-white dark:bg-[#0A0A0A] border-r border-gray-200 dark:border-neutral-800 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-56'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top Logo & Header */}
        <div className={`h-16 flex items-center shrink-0 relative ${isCollapsed ? 'justify-center px-0' : 'px-3.5 justify-between'}`}>
          <Link href={dashboardUrl} className={`flex items-center ${isCollapsed ? 'justify-center' : 'w-full pr-2'}`}>
            {isCollapsed ? (
              <BrandLogo size="sm" iconOnly />
            ) : (
              <div className="flex items-center w-full">
                <BrandLogo size="sidebar" className="w-full justify-start" />
              </div>
            )}
          </Link>
          
          {/* Mobile close button */}
          <button 
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collapse / Expand Toggle Button (Circular floating badge on border) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-8 -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-neutral-800 shadow-sm items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all z-50 cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={`
                  relative flex items-center px-3 py-2 mx-2 rounded-md transition-colors group
                  ${isActive 
                    ? 'bg-black/5 dark:bg-white/10 text-gray-900 dark:text-gray-100 font-semibold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }
                `}
                title={isCollapsed ? item.name : undefined}
              >
                {isActive && (
                  <div className="absolute -left-2 top-0 h-full w-[3px] bg-blue-600 rounded-r-sm" />
                )}
                
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                
                <span className={`truncate text-sm tracking-tight transition-all duration-300 whitespace-nowrap ml-3 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-32 opacity-100'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto shrink-0 pb-4 pt-4 flex flex-col gap-2 overflow-x-hidden">
          {bottomAction && (
            <div className={`px-2 transition-all ${isCollapsed ? 'hidden' : 'block'}`}>
              {bottomAction}
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
            {settingsUrl && (
              <Link 
                href={settingsUrl}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={`
                  relative flex items-center px-3 py-2 mx-2 rounded-md transition-colors w-[calc(100%-1rem)]
                  ${pathname?.startsWith(settingsUrl) 
                    ? 'bg-black/5 dark:bg-white/10 text-gray-900 dark:text-gray-100 font-semibold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }
                `}
                title={isCollapsed ? 'Settings' : undefined}
              >
                <Settings className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className={`text-sm tracking-tight font-medium truncate transition-all duration-300 whitespace-nowrap ml-3 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-32 opacity-100'}`}>
                  Settings
                </span>
              </Link>
            )}
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className={`
                relative flex items-center px-3 py-2 mx-2 rounded-md transition-colors w-[calc(100%-1rem)]
                text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5
              `}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              <span className={`text-sm tracking-tight font-medium truncate transition-all duration-300 whitespace-nowrap ml-3 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-32 opacity-100'}`}>
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
