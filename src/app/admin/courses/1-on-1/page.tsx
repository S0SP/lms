'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  BookOpen,
  Users,
  Loader2,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  FileCheck,
  CheckCircle2,
  ExternalLink,
  Filter,
  MoreVertical
} from 'lucide-react';
import { CourseSellingPageWizardModal } from '@/components/admin/CourseSellingPageWizardModal';

interface Course {
  id: string;
  name: string;
  shortCode?: string | null;
  type: string;
  status: string;
  board?: string | null;
  grade?: string | null;
  enrollmentCount: number;
  isTemplate?: boolean;
  defaultSessionDurationMin?: number;
  sellingPageJson?: any;
  educators?: Array<{ id: string; name: string; email: string }>;
  createdAt: string;
}

export default function Courses1on1Page() {
  const [activeTab, setActiveTab] = useState<'courses' | 'templates'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [templates, setTemplates] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Course | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'courses') {
        const params = new URLSearchParams({ type: 'one_on_one', isTemplate: 'false' });
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        const res = await fetch(`/api/v1/courses?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setCourses(json.data || []);
        }
      } else {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        const res = await fetch(`/api/v1/courses/templates?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setTemplates(json.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load courses or templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadData, searchQuery ? 200 : 0);
    return () => clearTimeout(t);
  }, [activeTab, searchQuery]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      setActionLoadingId(templateId);
      const res = await fetch(`/api/v1/courses/templates/${templateId}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        showNotification('Template duplicated successfully!');
        loadData();
      }
    } catch (e) {
      console.error('Failed to duplicate template', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInstantiateCourse = async (template: Course) => {
    try {
      setActionLoadingId(template.id);
      const res = await fetch(`/api/v1/courses/templates/${template.id}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Live Track)`,
          board: template.board,
          grade: template.grade,
        }),
      });
      if (res.ok) {
        showNotification(`Created live 1-on-1 personalized course from "${template.name}"!`);
        setActiveTab('courses');
      }
    } catch (e) {
      console.error('Failed to instantiate course from template', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      setActionLoadingId(templateId);
      const res = await fetch(`/api/v1/courses/templates/${templateId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotification('Template deleted.');
        loadData();
      }
    } catch (e) {
      console.error('Failed to delete template', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full flex flex-col h-full space-y-6">
      {/* Toast notification */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header & Actions with Clean Black Button matching app aesthetic */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">1-on-1 Personalized Courses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage customized individual curricula, reusable course templates, and selling page workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'templates' ? (
            <button
              onClick={() => {
                setEditingTemplate(null);
                setIsWizardOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add new template</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingTemplate(null);
                setIsWizardOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create 1-on-1 Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Subtabs Navigation with Pill Counters */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'courses'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Active 1-on-1 Courses</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'courses' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Course Templates</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'templates' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {templates.length}
          </span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-[#161B26] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/40">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'courses' ? 'Search active courses...' : 'Search course templates...'}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 shadow-sm"
            />
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-28 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-gray-700 dark:text-gray-300 animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Loading {activeTab}...</p>
          </div>
        ) : activeTab === 'courses' ? (
          /* Active Courses Table */
          courses.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No active 1-on-1 courses found</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Create a customized 1-on-1 course directly or instantiate from one of your course templates.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition"
                >
                  Create Course
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  View Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                    <th className="py-3.5 px-6">Course Name</th>
                    <th className="py-3.5 px-6">Board & Grade</th>
                    <th className="py-3.5 px-6">Assigned Educators</th>
                    <th className="py-3.5 px-6">Learners</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="font-bold text-sm">{course.name}</div>
                        {course.shortCode && <div className="text-[11px] text-gray-400">{course.shortCode}</div>}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {course.board ? `${course.board} • ` : ''}{course.grade || '—'}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        {course.educators && course.educators.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-[10px] flex items-center justify-center">
                              {course.educators[0].name ? course.educators[0].name[0] : 'E'}
                            </span>
                            <span>{course.educators.map((e) => e.name).join(', ')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {course.enrollmentCount}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            course.status === 'published'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                          }`}
                        >
                          {course.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/educator/courses/${course.id}`}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold text-xs hover:bg-gray-200 transition inline-flex items-center gap-1"
                        >
                          Workspace
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Course Templates Grid / Table */
          templates.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No course templates created</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Course templates allow you to pre-configure complete 9-step selling pages, pricing packages, syllabus outlines, and educator payout rules once, then instantiate them for individual learners with one click.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsWizardOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add new template</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131722] hover:border-gray-400 dark:hover:border-gray-600 transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                        {tmpl.board || 'IGCSE'} • {tmpl.grade || 'Grade 9'}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tmpl.defaultSessionDurationMin || 60}m
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white line-clamp-1">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {tmpl.sellingPageJson?.subtitle || tmpl.sellingPageJson?.description || 'Custom syllabus template with 1-on-1 personalized mentoring.'}
                      </p>
                    </div>

                    {/* Metadata specs */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                      <div>
                        Plans:{' '}
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {tmpl.sellingPageJson?.paymentPlans?.length || 0}
                        </span>
                      </div>
                      <div>
                        Reviews:{' '}
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {tmpl.sellingPageJson?.reviews?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleInstantiateCourse(tmpl)}
                      disabled={actionLoadingId === tmpl.id}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {actionLoadingId === tmpl.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Create 1-on-1</span>
                        </>
                      )}
                    </button>

                    <button
                      title="Edit Template in 9-Step Wizard"
                      onClick={() => {
                        setEditingTemplate(tmpl);
                        setIsWizardOpen(true);
                      }}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Duplicate Template"
                      onClick={() => handleDuplicateTemplate(tmpl.id)}
                      disabled={actionLoadingId === tmpl.id}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Delete Template"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      disabled={actionLoadingId === tmpl.id}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 9-Step Course Selling Page & Template Wizard Modal */}
      <CourseSellingPageWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          showNotification('Course template successfully saved and synchronized with database!');
          loadData();
        }}
        initialData={editingTemplate}
        isTemplateMode={true}
      />
    </div>
  );
}
