'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Download,
  User,
  GraduationCap,
  X,
} from 'lucide-react';
import { AddLearnerModal } from './AddLearnerModal';
import { AddEducatorModal } from './AddEducatorModal';
import { EducatorProfileModal } from './EducatorProfileModal';

export interface LearnerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  parents: { id: string; name: string; email: string }[];
  courses: { id: string; name: string }[];
}

export interface EducatorRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  courses: { id: string; name: string }[];
}

interface UsersWorkspaceClientProps {
  learners: LearnerRow[];
  educators: EducatorRow[];
}

export function UsersWorkspaceClient({ learners, educators }: UsersWorkspaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'learners' | 'educators'>('learners');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEducatorId, setSelectedEducatorId] = useState<string | null>(null);

  // Filter learners
  const filteredLearners = useMemo(() => {
    if (!searchQuery.trim()) return learners;
    const q = searchQuery.toLowerCase();
    return learners.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q)) ||
        l.courses.some((c) => c.name.toLowerCase().includes(q)) ||
        l.parents.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [learners, searchQuery]);

  // Filter educators
  const filteredEducators = useMemo(() => {
    if (!searchQuery.trim()) return educators;
    const q = searchQuery.toLowerCase();
    return educators.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone && e.phone.includes(q)) ||
        e.courses.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [educators, searchQuery]);

  const getInitial = (name: string) => {
    return name?.trim()?.[0]?.toUpperCase() || 'U';
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // CSV export helper
  const handleExportCSV = () => {
    if (activeTab === 'learners') {
      const headers = ['Learner Name', 'Email', 'Phone', 'Parents', 'Courses', 'Joined On'];
      const rows = filteredLearners.map((l) => [
        `"${l.name}"`,
        `"${l.email}"`,
        `"${l.phone || ''}"`,
        `"${l.parents.map((p) => `${p.name} (${p.email})`).join('; ')}"`,
        `"${l.courses.map((c) => c.name).join('; ')}"`,
        `"${formatDate(l.createdAt)}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `learners_details_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Educator Name', 'Email', 'Phone', 'Courses', 'Joined On'];
      const rows = filteredEducators.map((e) => [
        `"${e.name}"`,
        `"${e.email}"`,
        `"${e.phone || ''}"`,
        `"${e.courses.map((c) => c.name).join('; ')}"`,
        `"${formatDate(e.createdAt)}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `educators_details_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full min-h-screen">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Users</h1>
      </div>

      {/* Tabs & Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        {/* Left: Learners & Educators Tabs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('learners')}
            className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
              activeTab === 'learners'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span>Learners</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {learners.length}
            </span>
            {activeTab === 'learners' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('educators')}
            className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
              activeTab === 'educators'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span>Educators</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {educators.length}
            </span>
            {activeTab === 'educators' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Right: Search, Filter, + Add */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-7 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 w-48 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#111622] rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'learners' ? (
            /* ─── LEARNERS TABLE ─── */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold bg-gray-50/50 dark:bg-[#161B26]">
                  <th className="py-3 px-6 font-semibold">Learner</th>
                  <th className="py-3 px-6 font-semibold">Parents</th>
                  <th className="py-3 px-6 font-semibold">Courses</th>
                  <th className="py-3 px-6 font-semibold">Joined on</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-800 dark:text-gray-200">
                {filteredLearners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-xs font-medium">
                      No learners found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLearners.map((learner) => (
                    <tr key={learner.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                      {/* Learner Info */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-900 text-white dark:bg-gray-800 dark:text-gray-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {getInitial(learner.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                              {learner.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {learner.phone || learner.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Parents */}
                      <td className="py-3.5 px-6">
                        {learner.parents.length > 0 ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {learner.parents[0].name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {learner.parents[0].email}
                            </p>
                          </div>
                        ) : (
                          <Link
                            href={`/admin/users/learners/${learner.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition"
                          >
                            <Plus className="w-3 h-3 text-gray-500" />
                            <span>Add</span>
                          </Link>
                        )}
                      </td>

                      {/* Courses */}
                      <td className="py-3.5 px-6">
                        {learner.courses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {learner.courses.slice(0, 2).map((c) => (
                              <div
                                key={c.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-[11px] font-medium"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="truncate max-w-[140px]">{c.name}</span>
                              </div>
                            ))}
                            {learner.courses.length > 2 && (
                              <span className="text-[11px] text-gray-400 font-medium self-center">
                                +{learner.courses.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={`/admin/users/learners/${learner.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition"
                          >
                            <Plus className="w-3 h-3 text-gray-500" />
                            <span>Add Course</span>
                          </Link>
                        )}
                      </td>

                      {/* Joined On */}
                      <td className="py-3.5 px-6 font-medium text-gray-600 dark:text-gray-400">
                        {formatDate(learner.createdAt)}
                      </td>

                      {/* Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/users/learners/${learner.id}`}
                          className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-block transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* ─── EDUCATORS TABLE ─── */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold bg-gray-50/50 dark:bg-[#161B26]">
                  <th className="py-3 px-6 font-semibold">Educator</th>
                  <th className="py-3 px-6 font-semibold">Contact</th>
                  <th className="py-3 px-6 font-semibold">Assigned Courses</th>
                  <th className="py-3 px-6 font-semibold">Joined on</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-800 dark:text-gray-200">
                {filteredEducators.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-xs font-medium">
                      No educators found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEducators.map((educator) => (
                    <tr
                      key={educator.id}
                      onClick={() => setSelectedEducatorId(educator.id)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                      title="Click to view educator settings"
                    >
                      {/* Educator Info */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-900 text-white dark:bg-emerald-800 dark:text-emerald-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:ring-2 group-hover:ring-blue-500/20 transition-all">
                            {getInitial(educator.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {educator.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {educator.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300">
                        {educator.phone || 'No phone set'}
                      </td>

                      {/* Assigned Courses */}
                      <td className="py-3.5 px-6">
                        {educator.courses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {educator.courses.slice(0, 2).map((c) => (
                              <div
                                key={c.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="truncate max-w-[140px]">{c.name}</span>
                              </div>
                            ))}
                            {educator.courses.length > 2 && (
                              <span className="text-[11px] text-gray-400 font-medium self-center">
                                +{educator.courses.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">No courses assigned</span>
                        )}
                      </td>

                      {/* Joined On */}
                      <td className="py-3.5 px-6 font-medium text-gray-600 dark:text-gray-400">
                        {formatDate(educator.createdAt)}
                      </td>

                      {/* Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEducatorId(educator.id);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-block transition-colors cursor-pointer"
                          title="View & Edit Educator Settings"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Footer: Download Details Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-2xs active:scale-95"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          <span>Download {activeTab === 'learners' ? 'Learner' : 'Educator'} Details</span>
        </button>
      </div>

      {/* Add Learner Modal matching Screenshot 1 & 2 */}
      {activeTab === 'learners' && (
        <AddLearnerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Add Educator Modal matching Screenshot 3 & 4 */}
      {activeTab === 'educators' && (
        <AddEducatorModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Educator Profile Modal when clicked */}
      {selectedEducatorId && (
        <EducatorProfileModal
          isOpen={!!selectedEducatorId}
          educatorId={selectedEducatorId}
          onClose={() => setSelectedEducatorId(null)}
          onUpdated={() => router.refresh()}
        />
      )}
    </div>
  );
}
