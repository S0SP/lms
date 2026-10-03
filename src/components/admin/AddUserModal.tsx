'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  BookOpen,
  UserCheck,
  Users,
} from 'lucide-react';
import { AddLearnerModal } from './AddLearnerModal';
import { AddEducatorModal } from './AddEducatorModal';
import { AddAdminModal } from './AddAdminModal';
import { AddMultipleLearnersModal } from './AddMultipleLearnersModal';

export type UserRoleOption = 'learner' | 'educator' | 'admin' | 'multiple_learners' | null;

export interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRoleOption;
  onSuccess?: () => void;
}

export function AddUserModal({
  isOpen,
  onClose,
  initialRole = null,
  onSuccess,
}: AddUserModalProps) {
  // If initialRole is null, we show the 4-choice "Add new user" picker modal
  const [selectedRole, setSelectedRole] = useState<UserRoleOption>(initialRole);
  const [hoveredCard, setHoveredCard] = useState<string | null>('educator');

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole, isOpen]);

  if (!isOpen) return null;

  // If a role is chosen, render that specific modal
  if (selectedRole === 'learner') {
    return (
      <AddLearnerModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  if (selectedRole === 'educator') {
    return (
      <AddEducatorModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  if (selectedRole === 'admin') {
    return (
      <AddAdminModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  if (selectedRole === 'multiple_learners') {
    return (
      <AddMultipleLearnersModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  // ─── "Add new user" Choice Modal exactly matching Screenshot 2 ───
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161B26] w-full max-w-[460px] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Screenshot 2 */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Add new user
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Cards matching Screenshot 2 */}
        <div className="p-6 pt-2 space-y-3">
          {/* 1. Learner / Parent */}
          <div
            onClick={() => setSelectedRole('learner')}
            onMouseEnter={() => setHoveredCard('learner')}
            className={`rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all border ${
              hoveredCard === 'learner'
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 bg-white dark:bg-gray-800/40'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                Learner / Parent
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Access courses & live sessions
              </p>
            </div>
          </div>

          {/* 2. Educator */}
          <div
            onClick={() => setSelectedRole('educator')}
            onMouseEnter={() => setHoveredCard('educator')}
            className={`rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all border ${
              hoveredCard === 'educator'
                ? 'border-amber-400 dark:border-amber-500 bg-amber-50/25 dark:bg-amber-950/25 shadow-xs'
                : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 bg-white dark:bg-gray-800/40'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-xs font-bold ${hoveredCard === 'educator' ? 'text-amber-900 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>
                Educator
              </h3>
              <p className={`text-[11px] mt-0.5 ${hoveredCard === 'educator' ? 'text-amber-700/90 dark:text-amber-400/90' : 'text-gray-500 dark:text-gray-400'}`}>
                Conduct courses & manage learners
              </p>
            </div>
          </div>

          {/* 3. Admin */}
          <div
            onClick={() => setSelectedRole('admin')}
            onMouseEnter={() => setHoveredCard('admin')}
            className={`rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all border ${
              hoveredCard === 'admin'
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs'
                : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 bg-white dark:bg-gray-800/40'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                Admin
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Full system access
              </p>
            </div>
          </div>

          {/* 4. Multiple Learners */}
          <div
            onClick={() => setSelectedRole('multiple_learners')}
            onMouseEnter={() => setHoveredCard('multiple_learners')}
            className={`rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all border ${
              hoveredCard === 'multiple_learners'
                ? 'border-rose-300 dark:border-rose-700 bg-rose-50/20 dark:bg-rose-950/20 shadow-xs'
                : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 bg-white dark:bg-gray-800/40'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0 text-rose-500 dark:text-rose-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                Multiple Learners
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Add multiple learners to a course
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
