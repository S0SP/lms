'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { NotificationDropdown } from '@/components/ui/NotificationDropdown';
import { useSession, signOut } from 'next-auth/react';

interface StudentHeaderProps {
  onMenuClick: () => void;
  isCollapsed?: boolean;
}

export default function StudentHeader({ onMenuClick, isCollapsed = false }: StudentHeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'Student User';
  const userEmail = user?.email || 'student@unboundyou.com';
  const userImage = user?.image || (user as any)?.avatarUrl;
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'ST';

  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`flex justify-between items-center px-4 md:px-8 h-16 bg-white dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-neutral-800 shadow-2xs fixed top-0 right-0 w-full z-40 transition-all duration-300 ${isCollapsed ? 'md:w-[calc(100%-4rem)]' : 'md:w-[calc(100%-14rem)]'}`}>
      
      {/* Mobile Menu Button & Search */}
      <div className="flex-1 flex items-center gap-3 max-w-md relative">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:hover:bg-white/5 md:hidden transition-colors shrink-0"
          aria-label="Open Mobile Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        <div className="flex-1 relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" style={{ fontSize: '20px' }}>search</span>
          <input 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#111113] rounded-md border border-gray-200 dark:border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600" 
            placeholder="Search courses, tutors..." 
            type="text"
          />
        </div>
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-3 md:gap-4 ml-auto relative">
        <ThemeToggle />
        
        {/* Notifications — DB-driven */}
        <NotificationDropdown
          accentClass="bg-red-500"
          viewAllHref="/student/settings?tab=notifications"
        />
        
        
        <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
        
        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              setShowProfile(!showProfile);
            }}
            className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 p-1 md:pr-3 rounded-md transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 shrink-0 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            aria-haspopup="true"
            aria-expanded={showProfile}
          >
            <UserAvatar 
              src={userImage} 
              alt={userName} 
              initials={initials} 
              className="w-8 h-8 md:w-7 md:h-7 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
              fallbackClassName="bg-blue-600 text-white text-xs border border-blue-500"
            />
            <span className="hidden md:block text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{userName}</span>
          </button>
          
          {showProfile && (
            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50">
              <div className="p-4 bg-gray-50 dark:bg-[#161B26]">
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar 
                    src={userImage} 
                    alt={userName} 
                    initials={initials} 
                    className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-700"
                    fallbackClassName="bg-blue-600 text-white text-sm border border-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{userName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Active Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {((session?.user as any)?.role || 'learner')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
