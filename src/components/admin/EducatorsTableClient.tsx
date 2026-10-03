'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  School,
  CheckCircle2,
  Circle,
  Tag,
  CalendarClock,
} from 'lucide-react';
import { EducatorProfileModal } from './EducatorProfileModal';

export interface EducatorTableRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  tagline: string | null;
  calendarConnected: boolean | null;
  tags: Array<{ name: string; colorHex: string }>;
  courseCount: number;
}

interface EducatorsTableClientProps {
  educators: EducatorTableRow[];
  q?: string;
  initialEducatorId?: string | null;
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

const fmtDate = (isoStr: string) => {
  const d = new Date(isoStr);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

export function EducatorsTableClient({
  educators,
  q = '',
  initialEducatorId = null,
}: EducatorsTableClientProps) {
  const router = useRouter();
  const [selectedEducatorId, setSelectedEducatorId] = useState<string | null>(initialEducatorId);

  return (
    <>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {educators.length === 0 ? (
          <tr>
            <td colSpan={7}>
              <div className="py-16 text-center space-y-3">
                <School className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {q ? `No educators found for "${q}"` : 'No educators yet'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {q
                    ? 'Try a different name, email, or phone number.'
                    : 'Invite your first educator to start assigning courses.'}
                </p>
              </div>
            </td>
          </tr>
        ) : (
          educators.map((educator) => {
            return (
              <tr
                key={educator.id}
                onClick={() => setSelectedEducatorId(educator.id)}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                title="Click to view and edit educator details"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shadow-2xs group-hover:ring-2 group-hover:ring-blue-500/20 transition-all">
                      {educator.avatarUrl ? (
                        <img
                          src={educator.avatarUrl}
                          alt={educator.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        initials(educator.name)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {educator.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {educator.role}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {educator.email}
                        {educator.phone ? ` · ${educator.phone}` : ''}
                      </span>
                      {educator.tagline ? (
                        <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {educator.tagline}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {educator.tags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                      <Tag className="w-3.5 h-3.5" />
                      No tags assigned
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {educator.tags.map((tag) => (
                        <span
                          key={`${tag.name}-${tag.colorHex}`}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          style={{ borderLeft: `3px solid ${tag.colorHex}` }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                    {educator.courseCount}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {educator.calendarConnected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Connected
                      </>
                    ) : educator.calendarConnected === null ? (
                      <>
                        <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        No profile
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        Not Connected
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      educator.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {educator.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {educator.lastLoginAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      {fmtDateTime(educator.lastLoginAt)}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">Never signed in</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {fmtDate(educator.createdAt)}
                </td>
              </tr>
            );
          })
        )}
      </tbody>

      {/* Educator Profile Modal when clicked */}
      {selectedEducatorId && (
        <EducatorProfileModal
          isOpen={!!selectedEducatorId}
          educatorId={selectedEducatorId}
          onClose={() => setSelectedEducatorId(null)}
          onUpdated={() => router.refresh()}
        />
      )}
    </>
  );
}
