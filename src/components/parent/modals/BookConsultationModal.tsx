'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useSession } from 'next-auth/react';

interface BookConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookConsultationModal({ isOpen, onClose, onSuccess }: BookConsultationModalProps) {
  const { data: session } = useSession();
  const [child, setChild] = useState('Aarav M.');
  const [subject, setSubject] = useState('IGCSE Mathematics');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [childrenOptions, setChildrenOptions] = useState<{ value: string; label: string }[]>([
    { value: 'Aarav M.', label: 'Aarav M.' },
    { value: 'Isha M.', label: 'Isha M.' },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch real linked children if available
    fetch('/api/v1/user/parent-linking')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const opts = json.data.map((c: any) => ({
            value: c.learnerName || c.name || 'Scholar',
            label: c.learnerName || c.name || 'Scholar',
          }));
          setChildrenOptions(opts);
          setChild(opts[0].value);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError('Please select date and time for consultation');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const slotAt = new Date(`${date}T${time}:00`).toISOString();
      const userEmail = session?.user?.email || 'parent@unboundyou.local';
      const userName = session?.user?.name || child;

      const res = await fetch('/api/v1/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: `${userName} (for ${child})`,
          prospectEmail: userEmail,
          prospectPhone: (session?.user as any)?.phone || undefined,
          slotAt,
          notes: `Subject: ${subject}. ${notes ? `Notes: ${notes}` : ''}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to book consultation');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error booking consultation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E2535] rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Book a Trial / Consultation
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Consultation booked successfully! We will contact you shortly.</span>
            </div>
          )}
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Child</label>
            <CustomSelect
              value={child}
              onChange={(val) => setChild(val)}
              options={childrenOptions}
              placeholder="Select child"
            />
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject / Focus</label>
            <CustomSelect
              value={subject}
              onChange={(val) => setSubject(val)}
              options={[
                { value: 'IGCSE Mathematics', label: 'IGCSE Mathematics' },
                { value: 'A-Level Physics', label: 'A-Level Physics' },
                { value: 'IB Chemistry', label: 'IB Chemistry' },
                { value: 'SAT / ACT Prep', label: 'SAT / ACT Prep' },
                { value: 'Computer Science', label: 'Computer Science' },
              ]}
              placeholder="Select subject"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Time</label>
              <CustomSelect
                value={time}
                onChange={(val) => setTime(val)}
                options={[
                  { value: '09:00', label: '09:00 AM' },
                  { value: '10:00', label: '10:00 AM' },
                  { value: '11:30', label: '11:30 AM' },
                  { value: '14:00', label: '02:00 PM' },
                  { value: '16:00', label: '04:00 PM' },
                  { value: '18:00', label: '06:00 PM' },
                ]}
                placeholder="Select time"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (Optional)</label>
            <textarea 
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific topics or goals you would like to discuss?"
              className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Booking...' : 'Book Consultation'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
