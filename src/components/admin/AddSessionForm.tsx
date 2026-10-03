'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, BookOpen, User, Users, AlertCircle, Loader2 } from 'lucide-react';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface AddSessionFormProps {
  courses: { id: string; name: string }[];
  educators: { id: string; name: string }[];
  learners: { id: string; name: string; email?: string | null }[];
}

export function AddSessionForm({ courses, educators, learners }: AddSessionFormProps) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [courseId, setCourseId] = useState('');
  const [educatorId, setEducatorId] = useState('');
  const [scheduledAtDate, setScheduledAtDate] = useState('');
  const [scheduledAtTime, setScheduledAtTime] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [creditsConsumed, setCreditsConsumed] = useState(1);
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [createZoomMeeting, setCreateZoomMeeting] = useState(true);

  const toggleLearner = (id: string) => {
    setSelectedLearners((prev) => 
      prev.includes(id) ? prev.filter((lId) => lId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!title.trim() || !courseId || !educatorId || !scheduledAtDate || !scheduledAtTime) {
        throw new Error('Please fill out all required fields marked with an asterisk (*).');
      }
      if (selectedLearners.length === 0) {
        throw new Error('Please select at least one learner for this session.');
      }

      // Robust date & time validation
      const dateStr = `${scheduledAtDate}T${scheduledAtTime}`;
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date or time format. Please check the scheduling fields.');
      }

      const scheduledAt = parsedDate.toISOString();

      const payload = {
        title: title.trim(),
        topic: topic.trim() || undefined,
        courseId,
        educatorId,
        scheduledAt,
        durationMin: Number(durationMin),
        creditsConsumed: Number(creditsConsumed),
        learnerIds: Array.from(new Set(selectedLearners)),
        createZoomMeeting
      };

      const res = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      let responseData: any = null;
      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch (parseErr) {
        console.error('Failed to parse response body:', responseText);
        throw new Error(`Server returned error (${res.status}): ${responseText || res.statusText || 'Unable to parse response'}`);
      }

      if (!res.ok) {
        const errorMsg = responseData?.error || responseData?.message || `Failed to schedule session (${res.status})`;
        throw new Error(errorMsg);
      }

      // Success feedback and redirect
      setSessionCreated(true);
      setTimeout(() => {
        router.push('/admin/calendar');
        router.refresh();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while scheduling session');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Core Info */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">Session Details</h3>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Title <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Intro to Algebra" 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Topic (Optional)</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Chapter 1: Foundations" 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" /> Course <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={courseId}
                onChange={setCourseId}
                options={courses.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select a course..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Educator <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={educatorId}
                onChange={setEducatorId}
                options={educators.map(e => ({ value: e.id, label: e.name }))}
                placeholder="Select an educator..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Scheduling & Learners */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">Scheduling & Attendees</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" /> Date <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                required
                value={scheduledAtDate}
                onChange={(e) => setScheduledAtDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Time <span className="text-red-500">*</span>
              </label>
              <input 
                type="time" 
                required
                value={scheduledAtTime}
                onChange={(e) => setScheduledAtTime(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Duration (Mins) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                required
                min={15}
                max={480}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Credits Consumed <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                required
                min={0}
                step={0.5}
                value={creditsConsumed}
                onChange={(e) => setCreditsConsumed(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> Enrolled Learners <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 scrollbar-thin">
              {learners.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">No active learners found.</p>
              ) : (
                learners.map((learner) => (
                  <label key={learner.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={selectedLearners.includes(learner.id)}
                      onChange={() => toggleLearner(learner.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{learner.name}</span>
                      {learner.email && <span className="text-xs text-gray-400">({learner.email})</span>}
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select at least one learner for this session.</p>
          </div>

          {/* Zoom Settings */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={createZoomMeeting}
                  onChange={(e) => setCreateZoomMeeting(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Create Zoom Meeting</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automatically generate a Zoom link for this session.</p>
              </div>
            </label>
          </div>

        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => router.push('/admin/calendar')}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <FeedbackButton
          type="submit"
          loading={loading}
          success={sessionCreated}
          loadingText="Creating Session..."
          successText="Session Created ✓"
          className="px-6 py-2.5 rounded-xl font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-sm"
        >
          Add Session
        </FeedbackButton>
      </div>
    </form>
  );
}
