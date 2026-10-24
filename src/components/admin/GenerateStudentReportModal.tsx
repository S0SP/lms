'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Search,
  Calendar,
  BookOpen,
  User,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CustomSelect } from '@/components/ui/CustomSelect';

type EnrolledCourse = {
  courseId: string;
  courseName: string;
  courseType?: string;
  grade?: string;
  board?: string;
};

type Student = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  grade?: string | null;
  board?: string | null;
  courses: EnrolledCourse[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reportId: string) => void;
};

type PeriodPreset = 'current_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

export default function GenerateStudentReportModal({ isOpen, onClose, onSuccess }: Props) {
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const startStr = `${curYear}-${curMonth}-01`;
    const todayStr = now.toISOString().split('T')[0];

    setCustomStartDate(startStr);
    setCustomEndDate(todayStr);

    // Fetch students list
    setLoadingStudents(true);
    setFetchError(null);

    fetch('/api/v1/reports/students')
      .then((res) => res.json())
      .then((json) => {
        setLoadingStudents(false);
        if (json.data?.students) {
          setStudents(json.data.students);
          if (json.data.students.length > 0 && !selectedStudentId) {
            const first = json.data.students[0];
            setSelectedStudentId(first.id);
            if (first.courses.length > 0) {
              setSelectedCourseId(first.courses[0].courseId);
            }
          }
        } else if (json.error) {
          setFetchError(json.error.message || 'Failed to load students');
        }
      })
      .catch((err) => {
        setLoadingStudents(false);
        setFetchError(err.message || 'Network error loading students');
      });
  }, [isOpen]);

  // Filter students alphabetically by search
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.grade && s.grade.toLowerCase().includes(q)) ||
        (s.board && s.board.toLowerCase().includes(q)) ||
        s.courses.some((c) => c.courseName.toLowerCase().includes(q))
    );
  }, [students, studentSearch]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  // Handle student selection change
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    const stud = students.find((s) => s.id === studentId);
    if (stud && stud.courses.length > 0) {
      setSelectedCourseId(stud.courses[0].courseId);
    } else {
      setSelectedCourseId('');
    }
  };

  // Compute period range
  const computedPeriod = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let label = '';

    if (periodPreset === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else if (periodPreset === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      label = startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else if (periodPreset === 'last_30_days') {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      label = `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (periodPreset === 'last_90_days') {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      label = `Quarter (${startDate.toLocaleDateString('en-IN', { month: 'short' })} – ${endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})`;
    } else {
      startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
      label = `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    return { startDate, endDate, label };
  }, [periodPreset, customStartDate, customEndDate]);

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      setGenError('Please select a student.');
      return;
    }
    if (!selectedCourseId) {
      setGenError('Please select a course for this student.');
      return;
    }

    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          all: false,
          learnerId: selectedStudentId,
          courseId: selectedCourseId,
          monthYear: computedPeriod.startDate.toISOString(),
          startDate: computedPeriod.startDate.toISOString(),
          endDate: computedPeriod.endDate.toISOString(),
          periodLabel: computedPeriod.label,
          force: true,
        }),
      });

      const json = await res.json();
      setGenerating(false);

      if (!res.ok || json.error) {
        setGenError(json.error?.message || 'Failed to generate progress report');
        return;
      }

      const reportId = json.data?.reportId;
      if (reportId) {
        onSuccess(reportId);
        onClose();
      }
    } catch (err: any) {
      setGenerating(false);
      setGenError(err.message || 'An error occurred during report generation');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-transparent dark:from-blue-950/20 dark:via-[#161B26] dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00B4D8] to-[#3A86FF] flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Generate Student Progress Report
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Compiles AI summaries, teacher feedback, parent notes, and assignments for any interval.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {genError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          {/* 1. Student Selection (Alphabetical Order) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Select Student (Alphabetically Ordered)
              </span>
              <span className="text-[11px] font-normal text-gray-400">
                {filteredStudents.length} {filteredStudents.length === 1 ? 'scholar' : 'scholars'} available
              </span>
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search student by name, grade, or enrolled course..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Student List Box */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 bg-gray-50/50 dark:bg-gray-900/30">
              {loadingStudents ? (
                <div className="p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  Loading enrolled students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  {fetchError ? fetchError : 'No students matching search.'}
                </div>
              ) : (
                filteredStudents.map((stud) => {
                  const isSelected = stud.id === selectedStudentId;
                  return (
                    <button
                      key={stud.id}
                      type="button"
                      onClick={() => handleSelectStudent(stud.id)}
                      className={`w-full p-3 text-left flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600'
                          : 'hover:bg-gray-100/70 dark:hover:bg-gray-800/40 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                          <UserAvatar
                            src={stud.avatarUrl}
                            alt={stud.name}
                            initials={stud.name[0] || '?'}
                            className="w-full h-full object-cover"
                            fallbackClassName="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                            {stud.name}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                            {stud.grade && <span>{stud.grade}</span>}
                            {stud.board && <span>• {stud.board}</span>}
                            <span>• {stud.courses.length} course(s)</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Course Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Course Track
            </label>
            {selectedStudent && selectedStudent.courses.length > 0 ? (
              <CustomSelect<string>
                value={selectedCourseId}
                onChange={(val) => setSelectedCourseId(val)}
                options={selectedStudent.courses.map((c) => ({
                  value: c.courseId,
                  label: `${c.courseName} ${c.courseType ? `(${c.courseType.replace(/_/g, ' ')})` : ''}`,
                }))}
                size="md"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                {selectedStudent
                  ? 'This student has no active enrolled courses.'
                  : 'Select a student above to choose from their courses.'}
              </div>
            )}
          </div>

          {/* 3. Evaluation Period Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Evaluation Period Interval
            </label>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'current_month', label: 'Current Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'last_90_days', label: 'Last 90 Days / Quarter' },
                { id: 'custom', label: 'Custom Date Range' },
              ].map((p) => {
                const active = periodPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodPreset(p.id as PeriodPreset)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Pickers */}
            {periodPreset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              Selected Interval: <span className="underline">{computedPeriod.label}</span>
            </div>
          </div>

          {/* 4. Evidence Pipeline Overview */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-cyan-50/30 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-cyan-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Automated Evidence Compilation Pipeline
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              When triggered, UnboundYou aggregates:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-400 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Zoom AI summaries &amp; transcripts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Teacher feedback &amp; notes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Parent reflections &amp; comments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Submitted &amp; scored assignments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !selectedStudentId || !selectedCourseId}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B4D8] to-[#3A86FF] hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate &amp; Save Draft</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
