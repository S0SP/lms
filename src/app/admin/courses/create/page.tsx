'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Check, 
  UploadCloud, 
  Plus, 
  Info,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Settings,
  Loader2,
  Trash2,
  UserCheck
} from 'lucide-react';
import { FeedbackButton } from '@/components/ui/FeedbackButton';

export default function CourseCreationWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courseCreated, setCourseCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available educators from database
  const [availableEducators, setAvailableEducators] = useState<Array<{ id: string; name: string; email: string }>>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    urlSlug: '',
    type: 'one_on_one' as 'one_on_one' | 'group' | 'recorded',
    board: 'IGCSE',
    grade: 'Grade 9',
    description: '',
    defaultSessionDurationMin: 60,
    cohortMaxLearners: 15,
    selectedEducatorIds: [] as string[],
    sections: [
      { id: 'sec-1', title: 'Module 1: Foundations' },
      { id: 'sec-2', title: 'Module 2: Advanced Topics' },
    ],
  });

  const [newSectionTitle, setNewSectionTitle] = useState('');

  useEffect(() => {
    async function loadEducators() {
      try {
        const res = await fetch('/api/v1/educators');
        if (res.ok) {
          const json = await res.json();
          setAvailableEducators(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load educators for wizard:', err);
      }
    }
    loadEducators();
  }, []);

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('Please enter a course name');
        return;
      }
      setError(null);
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handlePublish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const toggleEducator = (eduId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedEducatorIds.includes(eduId);
      return {
        ...prev,
        selectedEducatorIds: exists
          ? prev.selectedEducatorIds.filter((id) => id !== eduId)
          : [...prev.selectedEducatorIds, eduId],
      };
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    setFormData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: `sec-${Date.now()}`, title: newSectionTitle.trim() },
      ],
    }));
    setNewSectionTitle('');
  };

  const handleRemoveSection = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
  };

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // 1. Create course
      const res = await fetch('/api/v1/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          board: formData.board,
          grade: formData.grade,
          description: formData.description,
          urlSlug: formData.urlSlug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          defaultSessionDurationMin: formData.defaultSessionDurationMin,
          cohortMaxLearners: formData.type === 'group' ? formData.cohortMaxLearners : undefined,
          educatorIds: formData.selectedEducatorIds,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create course');
      }

      const createdCourse = json.data;

      // 2. Sync sections
      if (formData.sections.length > 0 && createdCourse?.id) {
        const sectionsPayload = formData.sections.map((s, idx) => ({
          title: s.title,
          sortOrder: idx,
          resources: [],
        }));

        await fetch(`/api/v1/courses/${createdCourse.id}/curriculum`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: sectionsPayload }),
        });
      }

      // Set feedback state and redirect
      setCourseCreated(true);
      setTimeout(() => {
        router.push('/admin/courses');
      }, 900);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while publishing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <title>Create Course | Admin | UnboundYou</title>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8">
        {/* Modal Container */}
        <div className="bg-white dark:bg-[#161B26] w-full max-w-6xl h-[90vh] min-h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-200 dark:border-gray-800">
          
          {/* Modal Header */}
          <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Course</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure the fundamental details of your new program.</p>
            </div>
            <Link href="/admin/courses" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </Link>
          </div>

          {/* Modal Body (Split Layout) */}
          <div className="flex flex-1 overflow-hidden bg-white dark:bg-[#161B26] relative">
            
            {/* Collapse Toggle */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`
                hidden md:flex absolute top-8 -translate-y-1/2 z-50
                w-7 h-7 rounded-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-neutral-800 shadow-sm
                items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800
                transition-all cursor-pointer
                ${isSidebarCollapsed 
                  ? 'left-0' 
                  : 'left-72 -ml-3.5'
                }
              `}
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            {/* Left Rail: Step Navigation */}
            <div className={`hidden md:block border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 transition-all duration-300 overflow-y-auto ${isSidebarCollapsed ? 'w-0 opacity-0 px-0' : 'w-72 p-8'}`}>
              <nav className="relative min-w-[224px]">
                <div className="absolute left-4 top-4 bottom-4 w-[2px] bg-gray-200 dark:bg-gray-800 -z-0"></div>
                
                <ul className="flex flex-col gap-8 relative z-10">
                  {[
                    { num: 1, title: 'Course Details', desc: 'Title, type, and taxonomy' },
                    { num: 2, title: 'Curriculum', desc: 'Initial module sections' },
                    { num: 3, title: 'Educators', desc: 'Assign instructors' },
                    { num: 4, title: 'Settings & Duration', desc: 'Cohort size & session lengths' },
                    { num: 5, title: 'Review & Publish', desc: 'Publish settings' },
                  ].map((step) => {
                    const isActive = currentStep === step.num;
                    const isCompleted = currentStep > step.num;
                    const isPending = currentStep < step.num;

                    return (
                      <li key={step.num} className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setCurrentStep(step.num)}
                          className={`
                            shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors cursor-pointer
                            ${isActive ? 'border-blue-600 bg-white text-blue-600 dark:bg-gray-900' : ''}
                            ${isCompleted ? 'border-blue-600 bg-blue-600 text-white' : ''}
                            ${isPending ? 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800' : ''}
                          `}
                        >
                          {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : step.num}
                        </button>
                        
                        <div className={`mt-1 cursor-pointer ${isPending ? 'opacity-50' : ''}`} onClick={() => setCurrentStep(step.num)}>
                          <div className={`text-sm font-bold ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {step.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {step.desc}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-thin">
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Step 1: Details */}
              {currentStep === 1 && (
                <div className="max-w-2xl mx-auto md:mx-0 lg:ml-8 xl:ml-12 pb-12 animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">1. Course Details</h3>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Course Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          name: val,
                          urlSlug: val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        });
                      }}
                      placeholder="e.g. Cambridge IGCSE Additional Mathematics" 
                      className="h-11 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Delivery Format</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'one_on_one', label: '1-on-1' },
                        { id: 'group', label: 'Group Cohort' },
                        { id: 'recorded', label: 'Self-Paced' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: t.id as any })}
                          className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                            formData.type === t.id
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Curriculum Board</label>
                      <CustomSelect
                        value={formData.board}
                        onChange={(v) => setFormData({ ...formData, board: v })}
                        options={[
                          { value: 'IGCSE', label: 'IGCSE' },
                          { value: 'IB DP', label: 'IB DP' },
                          { value: 'CBSE', label: 'CBSE' },
                          { value: 'A-Level', label: 'A-Level' },
                          { value: 'Other', label: 'Other' },
                        ]}
                        placeholder="Select board"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Target Grade Level</label>
                      <CustomSelect
                        value={formData.grade}
                        onChange={(v) => setFormData({ ...formData, grade: v })}
                        options={[
                          { value: 'Grade 8', label: 'Grade 8' },
                          { value: 'Grade 9', label: 'Grade 9' },
                          { value: 'Grade 10', label: 'Grade 10' },
                          { value: 'Grade 11', label: 'Grade 11' },
                          { value: 'Grade 12', label: 'Grade 12' },
                        ]}
                        placeholder="Select grade"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Description / Syllabus Overview</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe the learning objectives, course coverage, and target student outcomes..."
                      className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Curriculum Sections */}
              {currentStep === 2 && (
                <div className="max-w-2xl mx-auto md:mx-0 lg:ml-8 xl:ml-12 pb-12 animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">2. Curriculum Structure</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define the modules or chapters for this course.</p>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="Add a new section (e.g. Module 3: Trigonometry)..."
                      className="flex-1 h-10 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Add Section
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.sections.map((s, idx) => (
                      <div key={s.id} className="p-3.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {idx + 1}. {s.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(s.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Assign Educators */}
              {currentStep === 3 && (
                <div className="max-w-2xl mx-auto md:mx-0 lg:ml-8 xl:ml-12 pb-12 animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">3. Assign Educators</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select instructors who can teach this course.</p>
                  </div>

                  {availableEducators.length === 0 ? (
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center text-sm text-gray-400">
                      No educators registered yet. You can invite educators in User Management.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableEducators.map((edu) => {
                        const isSelected = formData.selectedEducatorIds.includes(edu.id);
                        return (
                          <div
                            key={edu.id}
                            onClick={() => toggleEducator(edu.id)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{edu.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{edu.email}</p>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Duration & Cohort settings */}
              {currentStep === 4 && (
                <div className="max-w-2xl mx-auto md:mx-0 lg:ml-8 xl:ml-12 pb-12 animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">4. Program Delivery Settings</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure session lengths and cohort maximums.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Default Session Length (mins)</label>
                      <input 
                        type="number"
                        min="30"
                        step="15"
                        max="240"
                        value={formData.defaultSessionDurationMin}
                        onChange={(e) => setFormData({ ...formData, defaultSessionDurationMin: parseInt(e.target.value) || 60 })}
                        className="h-11 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 outline-none"
                      />
                    </div>

                    {formData.type === 'group' && (
                      <div className="flex flex-col gap-2">
                        <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">Max Learners Per Cohort</label>
                        <input 
                          type="number"
                          min="2"
                          max="100"
                          value={formData.cohortMaxLearners}
                          onChange={(e) => setFormData({ ...formData, cohortMaxLearners: parseInt(e.target.value) || 15 })}
                          className="h-11 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Review & Publish */}
              {currentStep === 5 && (
                <div className="max-w-2xl mx-auto md:mx-0 lg:ml-8 xl:ml-12 pb-12 animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">5. Review & Confirm</h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Program Name</span>
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{formData.name}</span>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Format</span>
                      <span className="font-semibold text-sm text-blue-600 uppercase">{formData.type.replace('_', ' ')}</span>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Board & Grade</span>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{formData.board} • {formData.grade}</span>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Curriculum Sections</span>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{formData.sections.length} Modules</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Assigned Educators</span>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{formData.selectedEducatorIds.length} Selected</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Modal Footer Bar */}
          <div className="px-6 md:px-12 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between z-20">
            <Link href="/admin/courses" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold text-sm transition-colors">
              Cancel
            </Link>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-sm transition-colors ${currentStep === 1 ? 'text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-[#161B26]'}`}
              >
                Back
              </button>
              {currentStep === totalSteps ? (
                <FeedbackButton 
                  type="button"
                  onClick={handleNext}
                  loading={submitting}
                  success={courseCreated}
                  loadingText="Creating Course..."
                  successText="Course Published ✓"
                  className="px-6 py-2.5 font-bold text-sm"
                >
                  Publish Course
                </FeedbackButton>
              ) : (
                <button 
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 font-bold text-sm flex items-center gap-2 shadow-sm"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
