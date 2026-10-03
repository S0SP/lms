'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, CheckCircle, XCircle, MoreVertical, Loader2, Phone, Mail, BookOpen } from 'lucide-react';

interface Consultation {
  id: string;
  prospectName: string;
  prospectEmail: string;
  prospectPhone?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  slotAt?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'converted';
  notes?: string | null;
  createdAt: string;
}

export default function AdminConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/consultations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setConsultations(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchConsultations, searchQuery ? 250 : 0);
    return () => clearTimeout(t);
  }, [searchQuery, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/v1/consultations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setConsultations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus as any } : c))
        );
      } else {
        alert('Failed to update consultation status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Consultations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage discovery calls and intake requests for prospective learners.</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prospects..." 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none bg-white dark:bg-gray-800 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : consultations.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              No consultations found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Booking requests from the public consultation funnel will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Prospect</th>
                  <th className="px-6 py-4">Subject / Course</th>
                  <th className="px-6 py-4">Requested Slot</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {consultations.map((c) => {
                  const slotDate = c.slotAt ? new Date(c.slotAt) : null;
                  const isUpdating = updatingId === c.id;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
                            {c.prospectName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">{c.prospectName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.prospectEmail}</span>
                              {c.prospectPhone && (
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.prospectPhone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-gray-100 font-medium">
                          {c.courseName || c.notes || 'General Discovery Call'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {slotDate ? (
                          <div>
                            <div className="text-gray-900 dark:text-gray-100 flex items-center gap-1.5 font-medium">
                              <Calendar className="text-gray-400 w-3.5 h-3.5" />
                              {slotDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
                              {slotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Flexible / Any slot</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] capitalize border ${
                            c.status === 'confirmed'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : c.status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : c.status === 'completed'
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {c.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === 'pending' && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(c.id, 'confirmed')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 font-bold text-xs rounded transition-colors disabled:opacity-50"
                              >
                                {isUpdating ? '...' : 'Confirm'}
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(c.id, 'cancelled')}
                                className="border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 font-bold text-xs rounded transition-colors disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {c.status === 'confirmed' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(c.id, 'completed')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-bold text-xs rounded transition-colors disabled:opacity-50"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
