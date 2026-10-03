'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Filter as FilterIcon,
  MoreVertical,
  X,
  ChevronRight,
  GitFork,
  Download,
  BookMarked,
  ShieldCheck,
  Tag as TagIcon,
  Calendar
} from 'lucide-react';
import { CourseSellingPageWizardModal } from '@/components/admin/CourseSellingPageWizardModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface Course {
  id: string;
  name: string;
  shortCode?: string | null;
  type: string;
  status: string;
  board?: string | null;
  grade?: string | null;
  thumbnailUrl?: string | null;
  enrollmentCount: number;
  isTemplate?: boolean;
  defaultSessionDurationMin?: number;
  sellingPageJson?: any;
  educators?: Array<{ id: string; name: string; email: string }>;
  createdAt: string;
}

interface FilterOption {
  id: string;
  name: string;
  email?: string;
}

export default function Courses1on1Page() {
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'templates'>('active');
  const [courses, setCourses] = useState<Course[]>([]);
  const [templates, setTemplates] = useState<Course[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown & Modal states
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const [isChooseTemplateModalOpen, setIsChooseTemplateModalOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedTemplateForCourse, setSelectedTemplateForCourse] = useState<Course | null>(null);

  const [isNameCourseModalOpen, setIsNameCourseModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [isCreatingBlankCourse, setIsCreatingBlankCourse] = useState(false);

  // Filter modal & criteria state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterLearner, setFilterLearner] = useState('');
  const [filterEducator, setFilterEducator] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterCreditsOp, setFilterCreditsOp] = useState<'lt' | 'eq' | 'gt'>('lt');
  const [filterCreditsVal, setFilterCreditsVal] = useState<string>('');

  // Available options for Filter dropdowns fetched from DB
  const [learnersList, setLearnersList] = useState<FilterOption[]>([]);
  const [educatorsList, setEducatorsList] = useState<FilterOption[]>([]);
  const [adminsList, setAdminsList] = useState<FilterOption[]>([]);
  const [tagsList, setTagsList] = useState<{ id: string; name: string }[]>([]);

  // Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Course | any | null>(null);
  const [isTemplateModalMode, setIsTemplateModalMode] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Template row action popover
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);

  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // Close + Add dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filter options (learners, educators, admins, tags) once
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const [learnersRes, educatorsRes, adminsRes, tagsRes] = await Promise.all([
          fetch('/api/v1/learners?perPage=100'),
          fetch('/api/v1/educators?perPage=100'),
          fetch('/api/v1/admins'),
          fetch('/api/v1/tags'),
        ]);

        if (learnersRes.ok) {
          const json = await learnersRes.json();
          setLearnersList(json.data || []);
        }
        if (educatorsRes.ok) {
          const json = await educatorsRes.json();
          setEducatorsList(json.data || []);
        }
        if (adminsRes.ok) {
          const json = await adminsRes.json();
          setAdminsList(json.data || []);
        }
        if (tagsRes.ok) {
          const json = await tagsRes.json();
          setTagsList(json.data || []);
        }
      } catch (e) {
        console.error('Failed to load filter options:', e);
      }
    }
    fetchFilterOptions();
  }, []);

  // Calculate active filter count
  const activeFilterCount = [
    filterLearner ? 1 : 0,
    filterEducator ? 1 : 0,
    filterAdmin ? 1 : 0,
    filterTag ? 1 : 0,
    filterCreditsVal.trim() ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load templates count / list whenever loading
      const tmplParams = new URLSearchParams();
      if (activeTab === 'templates' && searchQuery.trim()) {
        tmplParams.set('q', searchQuery.trim());
      }
      const tmplRes = await fetch(`/api/v1/courses/templates?${tmplParams.toString()}`);
      if (tmplRes.ok) {
        const json = await tmplRes.json();
        setTemplates(json.data || []);
      }

      if (activeTab === 'active' || activeTab === 'archived') {
        const params = new URLSearchParams({
          type: 'one_on_one',
          isTemplate: 'false',
          status: activeTab === 'active' ? 'published' : 'archived',
        });

        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (filterLearner) params.set('learnerId', filterLearner);
        if (filterEducator) params.set('educatorId', filterEducator);
        if (filterAdmin) params.set('adminId', filterAdmin);
        if (filterTag) params.set('tagId', filterTag);
        if (filterCreditsVal.trim()) {
          params.set('creditsOp', filterCreditsOp);
          params.set('creditsVal', filterCreditsVal.trim());
        }

        const res = await fetch(`/api/v1/courses?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (activeTab === 'active') {
            setCourses(json.data || []);
          } else {
            setArchivedCourses(json.data || []);
          }
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
  }, [activeTab, searchQuery, filterLearner, filterEducator, filterAdmin, filterTag, filterCreditsVal, filterCreditsOp]);

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

  // Flow 1: Create Blank Course
  const handleStartBlankCourse = () => {
    setIsAddMenuOpen(false);
    setSelectedTemplateForCourse(null);
    setIsCreatingBlankCourse(true);
    setNewCourseName('');
    setIsNameCourseModalOpen(true);
  };

  // Flow 2: Choose Template Course
  const handleStartTemplateCourse = () => {
    setIsAddMenuOpen(false);
    setTemplateSearchQuery('');
    setIsChooseTemplateModalOpen(true);
  };

  // When template is selected from the list (Screenshot 004 -> Screenshot 005)
  const handleSelectTemplate = (tmpl: Course) => {
    setSelectedTemplateForCourse(tmpl);
    setIsCreatingBlankCourse(false);
    setNewCourseName(`${tmpl.name} (1:1)`);
    setIsChooseTemplateModalOpen(false);
    setIsNameCourseModalOpen(true);
  };

  // When "Next" is clicked in "Name your course" modal (Screenshot 005)
  const handleConfirmCourseNameAndOpenWizard = async () => {
    if (!newCourseName.trim()) return;

    if (isCreatingBlankCourse || !selectedTemplateForCourse) {
      // Blank course
      setEditingTemplate({
        name: newCourseName.trim(),
        isTemplate: false,
      });
      setIsTemplateModalMode(false);
      setIsNameCourseModalOpen(false);
      setIsWizardOpen(true);
    } else {
      // Template-backed course: fetch full template details with curriculum & payment plans
      try {
        setActionLoadingId(selectedTemplateForCourse.id);
        const res = await fetch(`/api/v1/courses/templates/${selectedTemplateForCourse.id}`);
        if (res.ok) {
          const json = await res.json();
          const fullTemplate = json.data;

          const prefilledCourse = {
            name: newCourseName.trim(),
            board: fullTemplate.board || 'IGCSE',
            grade: fullTemplate.grade || 'Grade 9',
            description: fullTemplate.description || '',
            thumbnailUrl: fullTemplate.thumbnailUrl || '',
            defaultSessionDurationMin: fullTemplate.defaultSessionDurationMin || 60,
            sellingPageJson: fullTemplate.sellingPageJson || {},
            sections: fullTemplate.curriculum || fullTemplate.sections || [],
            curriculum: fullTemplate.curriculum || fullTemplate.sections || [],
            educators: fullTemplate.educators || [],
            templateId: selectedTemplateForCourse.id,
            isTemplate: false,
          };

          setEditingTemplate(prefilledCourse);
          setIsTemplateModalMode(false);
          setIsNameCourseModalOpen(false);
          setIsWizardOpen(true);
        } else {
          // Fallback if template fetch fails
          setEditingTemplate({
            name: newCourseName.trim(),
            board: selectedTemplateForCourse.board,
            grade: selectedTemplateForCourse.grade,
            templateId: selectedTemplateForCourse.id,
            isTemplate: false,
          });
          setIsTemplateModalMode(false);
          setIsNameCourseModalOpen(false);
          setIsWizardOpen(true);
        }
      } catch (e) {
        console.error('Failed to fetch template details:', e);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  // Flow 3: Add new template from Templates tab (Screenshot 003)
  const handleConfirmNewTemplate = () => {
    if (!newTemplateName.trim()) return;
    setEditingTemplate({
      name: newTemplateName.trim(),
      isTemplate: true,
    });
    setIsTemplateModalMode(true);
    setIsNewTemplateModalOpen(false);
    setIsWizardOpen(true);
  };

  // Helper date formatter matching screenshot: "19 Aug 26"
  const formatDateDisplay = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear().toString().slice(-2);
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
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

      {/* Header & Right-side Actions Toolbar matching Screenshots 002 & 003 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">1-On-1 Personalized Courses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage customized individual curricula, reusable course templates, and selling page workflows.
          </p>
        </div>

        {/* Toolbar: Search + Filter (N) + Add matching Screenshot 002 */}
        <div className="flex items-center gap-2.5 relative">
          {/* Search course input */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course"
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 shadow-sm"
            />
          </div>

          {/* Filter button with count badge matching Screenshot 002 */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition flex items-center gap-2 shadow-sm ${
              activeFilterCount > 0
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="font-bold text-blue-600 dark:text-blue-400">
                ({activeFilterCount})
              </span>
            )}
          </button>

          {/* Action button: '+ Add new template' on Templates tab, or '+ Add' on course tabs */}
          {activeTab === 'templates' ? (
            <button
              onClick={() => {
                setNewTemplateName('');
                setIsNewTemplateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add new template</span>
            </button>
          ) : (
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setIsAddMenuOpen((prev) => !prev)}
                className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>

              {/* Dropdown Menu matching Screenshot 002 */}
              {isAddMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#1E2433] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn">
                  {/* Option 1: Blank Template */}
                  <button
                    onClick={handleStartBlankCourse}
                    className="w-full text-left p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/70 transition flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                      <GitFork className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        New 1-on-1 personalized course
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                        Blank template
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Using a Template */}
                  <button
                    onClick={handleStartTemplateCourse}
                    className="w-full text-left p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/70 transition flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        New 1-on-1 personalized course using a template
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {templates.length} templates available
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtabs Navigation matching Screenshot 003: Active (N), Archived (N), Templates (N) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span>Active</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'archived'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span>Archived</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'archived' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {archivedCourses.length}
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
          <span>Templates</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'templates' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {templates.length}
          </span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-[#161B26] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="py-28 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-gray-700 dark:text-gray-300 animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Loading {activeTab} courses...</p>
          </div>
        ) : activeTab === 'active' || activeTab === 'archived' ? (
          /* Active / Archived Courses List */
          (activeTab === 'active' ? courses : archivedCourses).length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                No {activeTab} 1-on-1 courses found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Create a customized 1-on-1 course directly or instantiate from one of your course templates.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={handleStartBlankCourse}
                  className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition"
                >
                  Create Course
                </button>
                <button
                  onClick={handleStartTemplateCourse}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Use Template
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
                  {(activeTab === 'active' ? courses : archivedCourses).map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                      <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100">
                        <Link href={`/admin/courses/1-on-1/${course.id}`} className="hover:text-blue-600 transition-colors">
                          <div className="font-bold text-sm">{course.name}</div>
                          {course.shortCode && <div className="text-[11px] text-gray-400">{course.shortCode}</div>}
                        </Link>
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Edit Selling Page & Course Details"
                            onClick={() => {
                              setEditingTemplate(course);
                              setIsTemplateModalMode(false);
                              setIsWizardOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/admin/courses/1-on-1/${course.id}`}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold text-xs hover:bg-[#0F172A] hover:text-white dark:hover:bg-white dark:hover:text-black transition inline-flex items-center gap-1"
                          >
                            Workspace
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Templates Table matching Screenshot 003 */
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
                    setNewTemplateName('');
                    setIsNewTemplateModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add new template</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">Educators</th>
                    <th className="py-3.5 px-6">Created on</th>
                    <th className="py-3.5 px-6 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                  {templates.map((tmpl) => (
                    <tr key={tmpl.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                      {/* Name Column with Thumbnail */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-center">
                            {tmpl.thumbnailUrl ? (
                              <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                            {tmpl.name}
                          </span>
                        </div>
                      </td>

                      {/* Educators Column with + Educator button or educator pill */}
                      <td className="py-3.5 px-6">
                        {tmpl.educators && tmpl.educators.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                              {tmpl.educators.map((e) => e.name).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTemplate(tmpl);
                              setIsTemplateModalMode(true);
                              setIsWizardOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 text-gray-400" />
                            <span>Educator</span>
                          </button>
                        )}
                      </td>

                      {/* Created on date matching format "19 Aug 26" */}
                      <td className="py-3.5 px-6 text-gray-500 dark:text-gray-400 text-xs">
                        {formatDateDisplay(tmpl.createdAt)}
                      </td>

                      {/* 3-dots Action Menu */}
                      <td className="py-3.5 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSelectTemplate(tmpl)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-[#0F172A] hover:text-white dark:hover:bg-white dark:hover:text-black text-gray-800 dark:text-gray-200 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Use</span>
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setOpenActionRowId(openActionRowId === tmpl.id ? null : tmpl.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openActionRowId === tmpl.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1E2433] rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-30 p-1.5 text-xs font-medium space-y-0.5 animate-fadeIn">
                                <button
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    handleSelectTemplate(tmpl);
                                  }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Create Course</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    setEditingTemplate(tmpl);
                                    setIsTemplateModalMode(true);
                                    setIsWizardOpen(true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Edit Template</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    handleDuplicateTemplate(tmpl.id);
                                  }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Duplicate</span>
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                <button
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    handleDeleteTemplate(tmpl.id);
                                  }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom right download button matching Screenshot 003 */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => {
                    const csvContent =
                      'data:text/csv;charset=utf-8,' +
                      ['Name,Created On'].concat(templates.map((t) => `"${t.name}","${t.createdAt}"`)).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', 'course-templates.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: "New course template" matching Screenshot 003                     */}
      {/* ========================================================================= */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1E2433] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                New course template
              </h3>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Template name
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmNewTemplate();
                  }}
                  autoFocus
                  placeholder="Name of course template"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="px-5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-750 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNewTemplate}
                disabled={!newTemplateName.trim()}
                className="px-6 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: "Choose a course template" matching Screenshot 004                */}
      {/* ========================================================================= */}
      {isChooseTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1E2433] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Choose a course template
              </h3>
              <button
                onClick={() => setIsChooseTemplateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder="Search by name"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                />
              </div>
            </div>

            {/* Scrollable Templates List */}
            <div className="p-3 overflow-y-auto flex-1 space-y-1.5 divide-y divide-gray-100 dark:divide-gray-800/60">
              {templates
                .filter((t) => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()))
                .map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-center">
                        {tmpl.thumbnailUrl ? (
                          <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {tmpl.name}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0" />
                  </button>
                ))}

              {templates.filter((t) => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())).length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  No templates match your search.
                </div>
              )}
            </div>

            {/* Bottom Button matching Screenshot 004 */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 shrink-0">
              <button
                type="button"
                onClick={handleStartBlankCourse}
                className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4 text-gray-500" />
                <span>Create a new course</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: "Name your course" matching Screenshot 005                        */}
      {/* ========================================================================= */}
      {isNameCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1E2433] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Name your course
              </h3>
              <button
                onClick={() => setIsNameCourseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Course name
                </label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmCourseNameAndOpenWizard();
                  }}
                  autoFocus
                  placeholder="Name of course"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNameCourseModalOpen(false)}
                className="px-5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-750 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCourseNameAndOpenWizard}
                disabled={!newCourseName.trim()}
                className="px-6 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: "Filter" matching Screenshot 010                                  */}
      {/* ========================================================================= */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#1E2433] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Filter
              </h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Learner */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Learner
                </label>
                <CustomSelect
                  value={filterLearner}
                  onChange={(v) => setFilterLearner(v)}
                  placeholder="All Learners"
                  options={[
                    { value: '', label: 'All' },
                    ...learnersList.map((l) => ({
                      value: l.id,
                      label: `${l.name}${l.email ? ` (${l.email})` : ''}`,
                    })),
                  ]}
                />
              </div>

              {/* Educator */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Educator
                </label>
                <CustomSelect
                  value={filterEducator}
                  onChange={(v) => setFilterEducator(v)}
                  placeholder="All Educators"
                  options={[
                    { value: '', label: 'All' },
                    ...educatorsList.map((edu) => ({
                      value: edu.id,
                      label: `${edu.name}${edu.email ? ` (${edu.email})` : ''}`,
                    })),
                  ]}
                />
              </div>

              {/* Admin */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Admin
                </label>
                <CustomSelect
                  value={filterAdmin}
                  onChange={(v) => setFilterAdmin(v)}
                  placeholder="All Admins"
                  options={[
                    { value: '', label: 'All' },
                    ...adminsList.map((adm) => ({
                      value: adm.id,
                      label: `${adm.name}${adm.email ? ` (${adm.email})` : ''}`,
                    })),
                  ]}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tags
                </label>
                <CustomSelect
                  value={filterTag}
                  onChange={(v) => setFilterTag(v)}
                  placeholder="Select Tags..."
                  options={[
                    { value: '', label: 'All Tags' },
                    ...tagsList.map((t) => ({
                      value: t.id,
                      label: t.name,
                    })),
                  ]}
                />
              </div>

              {/* Session credits row matching Screenshot 010 */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Session credits
                </label>
                <div className="flex items-center gap-2">
                  <CustomSelect
                    value={filterCreditsOp}
                    onChange={(v) => setFilterCreditsOp(v as any)}
                    options={[
                      { value: 'lt', label: 'Less than' },
                      { value: 'eq', label: 'Equal to' },
                      { value: 'gt', label: 'More than' },
                    ]}
                    width="w-36"
                  />

                  <input
                    type="number"
                    value={filterCreditsVal}
                    onChange={(e) => setFilterCreditsVal(e.target.value)}
                    placeholder="e.g. 2"
                    min="0"
                    step="1"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                  />

                  <div className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 font-semibold shadow-xs">
                    Credits
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setFilterLearner('');
                  setFilterEducator('');
                  setFilterAdmin('');
                  setFilterTag('');
                  setFilterCreditsVal('');
                  setIsFilterModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-750 transition"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFilterModalOpen(false);
                  loadData();
                }}
                className="px-6 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9-Step Course Selling Page & Template Wizard Modal                        */}
      {/* ========================================================================= */}
      <CourseSellingPageWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          showNotification(
            isTemplateModalMode
              ? 'Course template successfully saved and synchronized with database!'
              : '1-on-1 course successfully saved and synchronized with database!'
          );
          loadData();
        }}
        initialData={editingTemplate}
        isTemplateMode={isTemplateModalMode}
      />
    </div>
  );
}
