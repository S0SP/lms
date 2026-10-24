'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calendar,
  Clock,
  ShieldAlert,
  ArrowRight,
  Repeat,
  Mail,
} from 'lucide-react';

export interface HostItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  isCurrentHost: boolean;
  isCourseEducator: boolean;
  hasConflict: boolean;
  conflictInfo?: {
    id: string;
    title: string;
    scheduledAt: string;
    durationMin: number;
  } | null;
}

export interface ChangeHostModalProps {
  isOpen: boolean;
  sessionId: string;
  sessionTitle: string;
  sessionTime?: string;
  courseName?: string | null;
  currentEducatorId?: string | null;
  currentEducatorName?: string | null;
  onClose: () => void;
  onHostChanged: (newHost: { id: string; name: string; email: string }) => void;
}

// Client-side session host list cache (stale-while-revalidate, 60s TTL)
const hostListCache = new Map<string, { hosts: HostItem[]; timestamp: number }>();

export function ChangeHostModal({
  isOpen,
  sessionId,
  sessionTitle,
  sessionTime,
  courseName,
  currentEducatorId,
  currentEducatorName,
  onClose,
  onHostChanged,
}: ChangeHostModalProps) {
  const [hosts, setHosts] = useState<HostItem[]>(() => {
    return hostListCache.get(sessionId)?.hosts || [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'course' | 'available'>('all');
  const [notifyParties, setNotifyParties] = useState(true);
  const [changeReason, setChangeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch host candidate list
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    setError(null);
    setSelectedHostId(null);
    setSearchQuery('');
    setChangeReason('');

    // Check cache
    const cached = hostListCache.get(sessionId);
    const isCacheFresh = cached && Date.now() - cached.timestamp < 60_000;
    if (cached) {
      setHosts(cached.hosts);
      const current = cached.hosts.find((h) => h.isCurrentHost);
      if (current) setSelectedHostId(current.id);
    }

    if (!isCacheFresh) {
      setLoading(!cached); // only show spinner if nothing in cache
      fetch(`/api/v1/sessions/${sessionId}/hosts`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const fetchedHosts: HostItem[] = json.data.hosts || [];
            setHosts(fetchedHosts);
            hostListCache.set(sessionId, { hosts: fetchedHosts, timestamp: Date.now() });
            const current = fetchedHosts.find((h) => h.isCurrentHost);
            if (current && !selectedHostId) {
              setSelectedHostId(current.id);
            }
          } else {
            if (!cached) {
              setError(json.error || 'Failed to load educators for this session');
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching session hosts:', err);
          if (!cached) setError('Network error while loading educators');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, sessionId]);

  const filteredHosts = useMemo(() => {
    return hosts.filter((host) => {
      // Tab filter
      if (activeTab === 'course' && !host.isCourseEducator) return false;
      if (activeTab === 'available' && host.hasConflict) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = host.name?.toLowerCase().includes(q);
        const matchEmail = host.email?.toLowerCase().includes(q);
        return matchName || matchEmail;
      }
      return true;
    });
  }, [hosts, activeTab, searchQuery]);

  const selectedHost = useMemo(() => {
    return hosts.find((h) => h.id === selectedHostId) || null;
  }, [hosts, selectedHostId]);

  const isCurrentSelected = selectedHost?.isCurrentHost;

  const handleSubmit = async () => {
    if (!selectedHostId || isCurrentSelected) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educatorId: selectedHostId,
          changeReason: changeReason.trim() || undefined,
          notifyParties,
          allowConflict: Boolean(selectedHost?.hasConflict),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update session host');
      }

      const target = hosts.find((h) => h.id === selectedHostId);
      if (target) {
        onHostChanged({
          id: target.id,
          name: target.name,
          email: target.email,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to change session host:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-gray-900 dark:text-gray-100 flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/50">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-950 dark:text-white leading-tight">
                Change Session Host
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[380px]">
                {sessionTitle} {courseName ? `• ${courseName}` : ''}
              </p>
              {sessionTime && (
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{sessionTime}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Host Overview Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-[#111622] border border-gray-200/80 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#121826] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(currentEducatorName || 'Host')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Current Host
                </p>
                <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                  {currentEducatorName || 'Assigned Educator'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-200/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300/60 dark:border-gray-700">
              Assigned
            </span>
          </div>

          {/* Search & Tabs */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search educators by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111622] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500 transition shadow-xs"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                All Hosts ({hosts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('course')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'course'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Course Hosts ({hosts.filter((h) => h.isCourseEducator).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'available'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Available ({hosts.filter((h) => !h.hasConflict).length})
              </button>
            </div>
          </div>

          {/* Host List */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-[#111622]">
            {loading ? (
              <div className="p-10 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Checking host schedules & availability...</span>
              </div>
            ) : filteredHosts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No educators match your search or filter.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/80 max-h-56 overflow-y-auto">
                {filteredHosts.map((host) => {
                  const isSelected = selectedHostId === host.id;
                  const initials = host.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={host.id}
                      onClick={() => setSelectedHostId(host.id)}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Radio Selector */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>

                        {/* Name & Email */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {host.name}
                            </span>
                            {host.isCurrentHost && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                Current
                              </span>
                            )}
                            {host.isCourseEducator && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                <Sparkles className="w-2.5 h-2.5" /> Course Educator
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {host.email}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 pl-2">
                        {host.hasConflict ? (
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            title={`Conflict: ${host.conflictInfo?.title || 'Another scheduled session'}`}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Busy</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Warning if conflicting */}
          {selectedHost?.hasConflict && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Schedule Overlap Notice</p>
                <p className="text-[11px] mt-0.5">
                  {selectedHost.name} has another session scheduled ({selectedHost.conflictInfo?.title || 'Session'}) at this time. You can still reassign if intentional.
                </p>
              </div>
            </div>
          )}

          {/* Reassignment options */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyParties}
                onChange={(e) => setNotifyParties(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Notify newly assigned educator & enrolled learners via email
              </span>
            </label>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Reason for change / Note to host (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule adjustment, faculty substitute..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111622] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {selectedHost && !isCurrentSelected ? (
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Reassigning to <span className="text-blue-600 dark:text-blue-400">{selectedHost.name}</span>
              </span>
            ) : (
              <span>Select an educator above</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !selectedHostId || isCurrentSelected}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 rounded-xl transition shadow-xs active:scale-95 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Host...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Confirm Change</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
