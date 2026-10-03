"use client";

import React, { useState, useEffect, use } from 'react';
import { 
  BookOpen, Users, Clock, ArrowRight, PlayCircle, FileText, CheckCircle2, ChevronRight, MessageSquare, Plus, FileQuestion, Save, X, Calendar as CalendarIcon, AlignLeft,
  Paperclip, BarChart2, Mic, MoreHorizontal, Play, MessageCircle, Search, GripVertical, PlusCircle, MoreVertical, ChevronDown, Video, CheckSquare, Edit, Trash2, Loader2, Check,
  Award, Eye, EyeOff, Send, MessageCircleReply
} from 'lucide-react';
import Link from 'next/link';
import CreateTestBuilderModal from '@/components/educator/modals/CreateTestBuilderModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import CreateAssignmentModal from '@/components/educator/modals/CreateAssignmentModal';
import GradingSubmissionsModal from '@/components/educator/modals/GradingSubmissionsModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableResource({
  resource,
  sectionId,
  onDelete,
  onTogglePublish,
  onViewSubmissions,
}: {
  resource: any;
  sectionId: string;
  onDelete?: () => void;
  onTogglePublish?: (id: string, current: boolean, sectionId: string) => void;
  onViewSubmissions?: (resource: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: resource.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isPublished = resource.isPublished !== false;

  let icon = <FileText className="w-[18px] h-[18px]" />;
  let iconBg = "bg-[#ba1a1a]/10 dark:bg-red-900/30 text-[#ba1a1a] dark:text-red-400";
  if (resource.type === 'video') {
    icon = <Video className="w-[18px] h-[18px]" />;
    iconBg = "bg-[#2F80F9]/10 dark:bg-blue-900/30 text-[#2F80F9] dark:text-blue-400";
  } else if (resource.type === 'quiz' || resource.type === 'test') {
    icon = <CheckSquare className="w-[18px] h-[18px]" />;
    iconBg = "bg-[#08BD7E]/10 dark:bg-green-900/30 text-[#08BD7E] dark:text-green-400";
  } else if (resource.type === 'assessment') {
    icon = <Award className="w-[18px] h-[18px]" />;
    iconBg = "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
  }

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center justify-between p-3 rounded-xl hover:bg-[#f2f3ff] dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-[#c1c6d6]/30 dark:hover:border-gray-700 bg-white dark:bg-[#161B26] z-10 relative">
      <div className="flex items-center gap-4 pl-8 relative min-w-0">
        <div {...attributes} {...listeners} className="absolute left-0 cursor-grab p-1 opacity-0 group-hover:opacity-100 transition-all outline-none">
          <GripVertical className="w-4 h-4 text-[#727785] dark:text-gray-500 hover:text-[#131b2d] dark:hover:text-gray-300" />
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="text-[14px] font-medium text-[#131b2d] dark:text-gray-200 truncate">{resource.title}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">
            {resource.type}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Revoke / Publish toggle badge */}
        {onTogglePublish && (
          <button
            type="button"
            onClick={() => onTogglePublish(resource.id, isPublished, sectionId)}
            className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 transition-all active:scale-95 ${
              isPublished
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
            }`}
            title={isPublished ? 'Published to students. Click to Revoke.' : 'Revoked / Draft. Click to Publish.'}
          >
            {isPublished ? (
              <>
                <Eye className="w-3 h-3 text-emerald-600" />
                <span>Live</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-amber-600" />
                <span>Revoked</span>
              </>
            )}
          </button>
        )}

        {/* View Submissions for assessments */}
        {resource.type === 'assessment' && onViewSubmissions && (
          <button
            type="button"
            onClick={() => onViewSubmissions(resource)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 transition-colors flex items-center gap-1 active:scale-95"
          >
            <Award className="w-3 h-3" />
            <span>Submissions</span>
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[#727785] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded p-1 transition-colors active:scale-95"
            title="Delete Resource"
          >
            <Trash2 className="w-[16px] h-[16px]" />
          </button>
        )}
      </div>
    </div>
  );
}

function SortableSection({
  section,
  toggleSection,
  resources,
  handleDragEnd,
  onAddResource,
  onAddAssignment,
  onAddQuiz,
  onDeleteSection,
  onDeleteResource,
  onTogglePublish,
  onViewSubmissions,
}: {
  section: any;
  toggleSection: any;
  resources: any[];
  handleDragEnd: any;
  onAddResource?: () => void;
  onAddAssignment?: () => void;
  onAddQuiz?: () => void;
  onDeleteSection?: () => void;
  onDeleteResource?: (resourceId: string) => void;
  onTogglePublish?: (id: string, current: boolean, sectionId: string) => void;
  onViewSubmissions?: (resource: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-[#161B26] border border-[#c1c6d6] dark:border-gray-800 rounded-2xl shadow-[0_4px_12px_rgba(15,23,41,0.04)] overflow-hidden z-10 relative">
      <div className="flex items-center justify-between p-4 border-b border-[#c1c6d6] dark:border-gray-800 bg-[#faf8ff] dark:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab p-1 outline-none">
            <GripVertical className="w-5 h-5 text-[#727785] dark:text-gray-500 hover:text-[#131b2d] dark:hover:text-gray-300" />
          </div>
          <h3 className="text-[16px] leading-[24px] font-bold tracking-[-0.01em] text-[#131b2d] dark:text-gray-100">{section.title}</h3>
          <span className="ml-2 px-2.5 py-0.5 bg-[#eff5ff] dark:bg-blue-900/30 text-[#2F80F9] dark:text-blue-300 text-[12px] font-medium rounded-full">{resources.length} Resources</span>
        </div>
        <div className="flex items-center gap-2">
          {onAddAssignment && (
            <button
              onClick={onAddAssignment}
              title="Add Assignment (with Deadlines & Files)"
              className="text-xs font-semibold px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
            >
              <Award className="w-3.5 h-3.5" />
              <span>+ Assignment</span>
            </button>
          )}
          {onAddQuiz && (
            <button
              onClick={onAddQuiz}
              title="Create Quiz (Auto-graded Questions)"
              className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>+ Quiz</span>
            </button>
          )}
          {onAddResource && (
            <button
              onClick={onAddResource}
              title="Add File or Video Lesson"
              className="text-xs font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#2F80F9] dark:bg-blue-900/30 dark:text-blue-300 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Lesson</span>
            </button>
          )}
          {onDeleteSection && (
            <button
              onClick={onDeleteSection}
              title="Delete Section"
              className="text-[#727785] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-1 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => toggleSection(section.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-transform">
            <ChevronDown className={`w-4 h-4 text-[#131b2d] dark:text-gray-300 transition-transform duration-200 ${section.expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      {section.expanded && (
        <div className="p-2 bg-white dark:bg-[#161B26] flex flex-col gap-1">
          {resources.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              No resources in this section yet. Click + Assignment, + Quiz, or + Lesson above.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, section.id)}>
              <SortableContext items={resources.map((r: any) => r.id)} strategy={verticalListSortingStrategy}>
                {resources.map((resource: any) => (
                  <SortableResource 
                    key={resource.id} 
                    resource={resource}
                    sectionId={section.id}
                    onTogglePublish={onTogglePublish}
                    onViewSubmissions={onViewSubmissions}
                    onDelete={() => onDeleteResource?.(resource.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

export default function EducatorCourseWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'content'>('home');
  const [isTestBuilderOpen, setIsTestBuilderOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAssessmentChoiceOpen, setIsAssessmentChoiceOpen] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [sections, setSections] = useState<any[]>([]);
  const [resources, setResources] = useState<Record<string, any[]>>({});

  // Add Section State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isSavingSection, setIsSavingSection] = useState(false);

  // Add Resource Modal/State
  const [addingResourceSectionId, setAddingResourceSectionId] = useState<string | null>(null);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<'video' | 'file' | 'test'>('file');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [isSavingResource, setIsSavingResource] = useState(false);

  // Modals for Assignment, Quiz, and Grading
  const [activeAssignmentSection, setActiveAssignmentSection] = useState<{ id: string; title: string } | null>(null);
  const [activeQuizSection, setActiveQuizSection] = useState<{ id: string; title: string } | null>(null);
  const [gradingAssessment, setGradingAssessment] = useState<{ id: string; title: string; maxMarks: number } | null>(null);

  // Timeline State
  const [timelinePosts, setTimelinePosts] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [newPostBody, setNewPostBody] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/courses/${courseId}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data;
          setCourse(data);

          if (data.curriculum && Array.isArray(data.curriculum) && data.curriculum.length > 0) {
            setSections(
              data.curriculum.map((s: any) => ({
                id: s.id,
                title: s.title,
                expanded: true,
              }))
            );
            const resMap: Record<string, any[]> = {};
            data.curriculum.forEach((s: any) => {
              resMap[s.id] = s.resources || [];
            });
            setResources(resMap);
          } else {
            const defaultId = 'sec-1';
            setSections([{ id: defaultId, title: 'Module 1: Introduction', expanded: true }]);
            setResources({
              [defaultId]: [
                { id: 'res-1', type: 'video', title: 'Welcome and Overview' },
                { id: 'res-2', type: 'file', title: 'Syllabus & Course Notes' },
              ],
            });
          }
        }
      } catch (err) {
        console.error('Failed to load course details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

  // Load Timeline dynamically when tab opened
  const loadTimelinePosts = async () => {
    try {
      setLoadingTimeline(true);
      const res = await fetch(`/api/v1/courses/${courseId}/timeline`);
      if (res.ok) {
        const json = await res.json();
        setTimelinePosts(json.data || []);
        setTimelineLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timeline' && !timelineLoaded) {
      loadTimelinePosts();
    }
  }, [activeTab, timelineLoaded, courseId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSectionDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        saveCurriculumData(next, resources);
        return next;
      });
    }
  };

  const handleResourceDragEnd = (event: any, sectionId: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setResources((prev) => {
        const items = prev[sectionId] || [];
        const oldIndex = items.findIndex((i: any) => i.id === active.id);
        const newIndex = items.findIndex((i: any) => i.id === over.id);
        const next = {
          ...prev,
          [sectionId]: arrayMove(items, oldIndex, newIndex),
        };
        saveCurriculumData(sections, next);
        return next;
      });
    }
  };

  const toggleSection = (id: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));
  };

  // ─── Central Curriculum Sync to Database ─────────────────────────────────────
  const saveCurriculumData = async (
    sectionsToSave = sections,
    resourcesToSave = resources
  ) => {
    try {
      setSavingCurriculum(true);
      setSaveSuccess(false);

      const payload = sectionsToSave.map((sec, sIdx) => ({
        id: sec.id.startsWith('sec-') && sec.id.length < 20 ? undefined : sec.id,
        title: sec.title,
        sortOrder: sIdx,
        resources: (resourcesToSave[sec.id] || []).map((res: any, rIdx: number) => ({
          id: res.id.startsWith('res-') && res.id.length < 20 ? undefined : res.id,
          title: res.title,
          type: res.type,
          sortOrder: rIdx,
          externalUrl: res.externalUrl,
        })),
      }));

      const res = await fetch(`/api/v1/courses/${courseId}/curriculum`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: payload }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setSections(
            json.data.map((s: any) => ({
              id: s.id,
              title: s.title,
              expanded: true,
            }))
          );
          const resMap: Record<string, any[]> = {};
          json.data.forEach((s: any) => {
            resMap[s.id] = s.resources || [];
          });
          setResources(resMap);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        const errJson = await res.json().catch(() => null);
        alert(errJson?.error || 'Failed to save curriculum changes.');
      }
    } catch (err) {
      console.error('Failed to save curriculum:', err);
      alert('Network error while saving curriculum.');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      setIsSavingSection(true);
      const newId = `sec-${Date.now()}`;
      const newSec = { id: newId, title: newSectionTitle.trim(), expanded: true };
      const nextSections = [...sections, newSec];
      const nextResources = { ...resources, [newId]: [] };

      setSections(nextSections);
      setResources(nextResources);
      setNewSectionTitle('');
      setIsAddingSection(false);

      await saveCurriculumData(nextSections, nextResources);
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!confirm(`Are you sure you want to delete section "${sec?.title || 'this section'}" and all its contents?`)) return;

    const nextSections = sections.filter((s) => s.id !== sectionId);
    const nextResources = { ...resources };
    delete nextResources[sectionId];

    setSections(nextSections);
    setResources(nextResources);

    await saveCurriculumData(nextSections, nextResources);
  };

  const handleCreateResource = async () => {
    if (!addingResourceSectionId || !newResourceTitle.trim()) return;
    try {
      setIsSavingResource(true);
      const newRes = {
        id: `res-${Date.now()}`,
        title: newResourceTitle.trim(),
        type: newResourceType,
        externalUrl: newResourceUrl.trim() || undefined,
      };
      const nextResources = {
        ...resources,
        [addingResourceSectionId]: [...(resources[addingResourceSectionId] || []), newRes],
      };
      setResources(nextResources);
      setNewResourceTitle('');
      setNewResourceUrl('');
      setAddingResourceSectionId(null);

      await saveCurriculumData(sections, nextResources);
    } finally {
      setIsSavingResource(false);
    }
  };

  const handleDeleteResource = async (sectionId: string, resourceId: string) => {
    const resItem = (resources[sectionId] || []).find((r: any) => r.id === resourceId);
    if (!confirm(`Are you sure you want to delete "${resItem?.title || 'this resource'}"?`)) return;

    const nextResources = {
      ...resources,
      [sectionId]: (resources[sectionId] || []).filter((r: any) => r.id !== resourceId),
    };
    setResources(nextResources);

    await saveCurriculumData(sections, nextResources);
  };

  const handleTogglePublish = async (resourceId: string, currentStatus: boolean, sectionId: string) => {
    try {
      const nextStatus = !currentStatus;
      const res = await fetch(`/api/v1/resources/${resourceId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: nextStatus }),
      });
      if (res.ok) {
        setResources((prev) => ({
          ...prev,
          [sectionId]: (prev[sectionId] || []).map((r: any) =>
            r.id === resourceId ? { ...r, isPublished: nextStatus } : r
          ),
        }));
      } else {
        alert('Failed to update publish state');
      }
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  const handleAssignmentCreated = (created: any) => {
    if (!created?.resource) return;
    const secId = created.resource.sectionId;
    setResources((prev) => ({
      ...prev,
      [secId]: [
        ...(prev[secId] || []),
        {
          id: created.resource.id,
          title: created.resource.title,
          type: 'assessment',
          isPublished: created.resource.isPublished,
          assessmentId: created.id,
          maxMarks: created.maxMarks,
        },
      ],
    }));
  };

  const handleQuizCreated = (created: any) => {
    if (!created?.resource) return;
    const secId = created.resource.sectionId;
    setResources((prev) => ({
      ...prev,
      [secId]: [
        ...(prev[secId] || []),
        {
          id: created.resource.id,
          title: created.resource.title,
          type: 'test',
          isPublished: created.resource.isPublished,
          testId: created.id,
        },
      ],
    }));
  };

  // ─── Timeline Feed Actions ───────────────────────────────────────────────────
  const handleCreatePost = async () => {
    if (!newPostBody.trim() || isPosting) return;
    try {
      setIsPosting(true);
      const res = await fetch(`/api/v1/courses/${courseId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newPostBody }),
      });
      if (res.ok) {
        const json = await res.json();
        setTimelinePosts((prev) => [json.data, ...prev]);
        setNewPostBody('');
      } else {
        const errJson = await res.json().catch(() => null);
        alert(errJson?.error || 'Failed to post announcement.');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('Network error while posting.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      setDeletingPostId(postId);
      const res = await fetch(`/api/v1/courses/${courseId}/timeline/${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTimelinePosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert('Failed to delete post.');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim() || submittingComment) return;
    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/v1/courses/${courseId}/timeline/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText }),
      });
      if (res.ok) {
        const json = await res.json();
        setTimelinePosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [...(p.comments || []), json.data],
                  commentCount: (p.commentCount || 0) + 1,
                }
              : p
          )
        );
        setCommentText('');
        setActiveCommentPostId(null);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2F80F9] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Workspace Header */}
      <div className="bg-white dark:bg-[#161B26] border-b border-[#c1c6d6] dark:border-gray-800 shrink-0">
        <div className="p-4 md:px-8 max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#414754] dark:text-gray-400 mb-3 tracking-[0.02em]">
            <Link
              href="/educator/courses"
              className="hover:text-[#131b2d] dark:hover:text-gray-100 transition-colors"
            >
              Courses
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#131b2d] dark:text-gray-100">
              {course?.shortCode || course?.name || 'Workspace'}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[12px] bg-[#eff5ff] dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-[#c1dafe] dark:border-blue-800">
                <BookOpen className="w-6 h-6 text-[#2F80F9] dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-[24px] md:text-[28px] leading-[36px] tracking-[-0.02em] font-bold text-[#131b2d] dark:text-gray-100">
                  {course?.name || 'Course Workspace'}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  {course?.shortCode && (
                    <>
                      <span className="text-[14px] leading-[20px] text-[#414754] dark:text-gray-400">
                        {course.shortCode}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-[#c1c6d6] dark:bg-gray-700" />
                    </>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eff5ff] text-[#2F80F9] dark:bg-blue-900/30 dark:text-blue-400 tracking-wider uppercase">
                    {course?.type?.replace('_', ' ') || 'Course'}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-[#c1c6d6] dark:bg-gray-700" />
                  <span className="text-[14px] leading-[20px] text-[#414754] dark:text-gray-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {course?.activeEnrollments ?? 0} Learner
                    {course?.activeEnrollments !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveCurriculumData(sections, resources)}
                disabled={savingCurriculum}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#08BD7E] hover:bg-[#08BD7E]/90 text-white rounded-[8px] transition-all font-semibold text-[12px] leading-[16px] tracking-[0.02em] shadow-sm disabled:opacity-50 active:scale-95 hover-lift"
              >
                {savingCurriculum ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-white animate-confirm-pop" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveSuccess ? 'Saved to DB!' : savingCurriculum ? 'Saving...' : 'Save Curriculum'}
              </button>

              <button
                type="button"
                onClick={() => setIsAssessmentChoiceOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2F80F9] text-white rounded-[8px] hover:bg-[#2F80F9]/90 transition-all font-semibold text-[12px] leading-[16px] tracking-[0.02em] shadow-sm active:scale-95 hover-lift"
              >
                <Plus className="w-4 h-4" />
                Create Assessment
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 max-w-5xl mx-auto flex items-center gap-6 mt-4 border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'home', label: 'Home Overview' },
            { id: 'timeline', label: 'Timeline & Posts' },
            { id: 'content', label: 'Curriculum & Content' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Content Area */}
      <div className="flex-1 bg-[#f2f3ff]/40 dark:bg-[#0D1117] overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Home Overview Tab */}
          {activeTab === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-[#161B26] border border-[#c1c6d6] dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Course Information
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {course?.description ||
                      'No syllabus description provided. You can organize learning modules and lessons under the Curriculum tab.'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-4 rounded-lg bg-[#faf8ff] dark:bg-[#080D16] border border-[#dbe2fb] dark:border-gray-800/50">
                      <p className="text-[12px] font-semibold tracking-[0.02em] text-[#414754] dark:text-gray-400 mb-1">
                        Curriculum Sections
                      </p>
                      <p className="text-2xl font-bold text-[#131b2d] dark:text-gray-100">
                        {sections.length}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#faf8ff] dark:bg-[#080D16] border border-[#dbe2fb] dark:border-gray-800/50">
                      <p className="text-[12px] font-semibold tracking-[0.02em] text-[#414754] dark:text-gray-400 mb-1">
                        Active Enrolments
                      </p>
                      <p className="text-2xl font-bold text-[#08BD7E] dark:text-green-400">
                        {course?.activeEnrollments ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-[#161B26] border border-[#c1c6d6] dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Assigned Educators
                  </h3>
                  <div className="space-y-3">
                    {course?.educators && course.educators.length > 0 ? (
                      course.educators.map((edu: any) => (
                        <div key={edu.id} className="flex items-center gap-3">
                          {edu.avatarUrl ? (
                            <img
                              src={edu.avatarUrl}
                              alt={edu.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                              {edu.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {edu.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{edu.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No other educators assigned.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab — 100% DB Connected */}
          {activeTab === 'timeline' && (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
              {/* Announcement Creation Box */}
              <section className="bg-white dark:bg-[#161B26] rounded-xl border border-[#c1c6d6] dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#2F80F9] flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                    {course?.educators?.[0]?.name?.charAt(0) || 'E'}
                  </div>
                  <div className="w-full flex flex-col gap-3">
                    <textarea
                      value={newPostBody}
                      onChange={(e) => setNewPostBody(e.target.value)}
                      className="w-full bg-transparent border-none text-[#131b2d] dark:text-gray-100 placeholder:text-gray-400 text-[14px] resize-none focus:ring-0 p-0 h-20 outline-none leading-relaxed"
                      placeholder="Share a class announcement, assignment update, or learning tip with students..."
                    />
                    <div className="flex items-center justify-between pt-3 border-t border-[#c1c6d6]/50 dark:border-gray-800">
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        Visible to all enrolled students
                      </span>
                      <button
                        type="button"
                        onClick={handleCreatePost}
                        disabled={!newPostBody.trim() || isPosting}
                        className="px-4 py-1.5 bg-[#2F80F9] hover:bg-[#2F80F9]/90 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 hover-lift"
                      >
                        {isPosting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Post Update</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feed Items */}
              {loadingTimeline ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2F80F9]" />
                  <span className="text-xs">Loading timeline updates...</span>
                </div>
              ) : timelinePosts.length === 0 ? (
                <div className="py-12 px-6 bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 text-center flex flex-col items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No updates posted yet</p>
                  <p className="text-xs text-gray-400 mt-1">Use the box above to post your first course announcement.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {timelinePosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-[#161B26] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4"
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {post.authorAvatarUrl ? (
                            <img
                              src={post.authorAvatarUrl}
                              alt={post.authorName}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#eff5ff] dark:bg-blue-900/30 text-[#2F80F9] dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-[#c1dafe] dark:border-blue-800">
                              {post.authorName?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {post.authorName}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-[#2F80F9] uppercase tracking-wider">
                                {post.authorRole || 'Educator'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                          title="Delete Post"
                        >
                          {deletingPostId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Post Body */}
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {post.body}
                      </p>

                      {/* Comments Section */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)
                            }
                            className="flex items-center gap-1.5 hover:text-[#2F80F9] font-medium transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{post.commentCount || 0} Comments</span>
                          </button>
                        </div>

                        {/* Existing comments */}
                        {post.comments && post.comments.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                            {post.comments.map((comment: any) => (
                              <div key={comment.id} className="text-xs space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(comment.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300">{comment.body}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment box */}
                        {activeCommentPostId === post.id && (
                          <div className="flex items-center gap-2 pt-2">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Write a comment..."
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#080D16] text-gray-900 dark:text-gray-100 outline-none focus:border-[#2F80F9]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              disabled={!commentText.trim() || submittingComment}
                              className="px-3 py-1.5 bg-[#2F80F9] text-white text-xs font-semibold rounded-lg hover:bg-[#2F80F9]/90 disabled:opacity-50 transition-colors flex items-center gap-1 active:scale-95"
                            >
                              {submittingComment ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Reply</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Curriculum & Content Tab — 100% DB Connected */}
          {activeTab === 'content' && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Curriculum Structure
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add modules, assignments, and quizzes. Reorder with drag &amp; drop. All changes save directly to the database.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingSection(true)}
                    className="bg-[#2F80F9] text-white px-4 py-2 rounded-[8px] font-semibold text-[12px] tracking-[0.02em] flex items-center gap-2 hover:bg-[#2F80F9]/90 transition-all shadow-sm active:scale-95 hover-lift"
                  >
                    <Plus className="w-[18px] h-[18px]" />
                    Add Section
                  </button>
                </div>
              </div>

              {/* Add Section Inline Form */}
              {isAddingSection && (
                <div className="p-4 bg-white dark:bg-[#161B26] border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm flex items-center gap-3 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="Enter section title (e.g. Chapter 1: Introduction)..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#080D16] text-gray-900 dark:text-gray-100 outline-none focus:border-[#2F80F9]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSection();
                      if (e.key === 'Escape') setIsAddingSection(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateSection}
                    disabled={isSavingSection || !newSectionTitle.trim()}
                    className="px-4 py-2 bg-[#2F80F9] hover:bg-[#2F80F9]/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
                  >
                    {isSavingSection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Add &amp; Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingSection(false)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Add Resource Inline Form */}
              {addingResourceSectionId && (
                <div className="p-4 bg-white dark:bg-[#161B26] border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm flex flex-col gap-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <CustomSelect
                      value={newResourceType}
                      onChange={(v: any) => setNewResourceType(v)}
                      options={[
                        { value: 'file', label: 'Document / Lecture Notes' },
                        { value: 'video', label: 'Video Lesson' },
                        { value: 'test', label: 'Assessment / Quiz' },
                      ]}
                      size="sm"
                    />
                    <input
                      type="text"
                      value={newResourceTitle}
                      onChange={(e) => setNewResourceTitle(e.target.value)}
                      placeholder="Resource title (e.g. Lecture 1: Core Principles)..."
                      className="flex-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#080D16] text-gray-900 dark:text-gray-100 outline-none focus:border-[#2F80F9]"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      value={newResourceUrl}
                      onChange={(e) => setNewResourceUrl(e.target.value)}
                      placeholder="Optional URL / Video Link / Doc Link..."
                      className="flex-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#080D16] text-gray-900 dark:text-gray-100 outline-none focus:border-[#2F80F9]"
                    />
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleCreateResource}
                        disabled={isSavingResource || !newResourceTitle.trim()}
                        className="px-4 py-2 bg-[#2F80F9] text-white rounded-lg text-xs font-bold hover:bg-[#2F80F9]/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        {isSavingResource && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save Lesson
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingResourceSectionId(null);
                          setNewResourceTitle('');
                          setNewResourceUrl('');
                        }}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections List */}
              <div className="flex flex-col gap-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionDragEnd}
                >
                  <SortableContext
                    items={sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        toggleSection={toggleSection}
                        resources={resources[section.id] || []}
                        handleDragEnd={handleResourceDragEnd}
                        onAddResource={() => setAddingResourceSectionId(section.id)}
                        onAddAssignment={() => setActiveAssignmentSection({ id: section.id, title: section.title })}
                        onAddQuiz={() => setActiveQuizSection({ id: section.id, title: section.title })}
                        onTogglePublish={handleTogglePublish}
                        onDeleteResource={(resId) => handleDeleteResource(section.id, resId)}
                        onDeleteSection={() => handleDeleteSection(section.id)}
                        onViewSubmissions={(resource) => {
                          setGradingAssessment({
                            id: resource.id,
                            title: resource.title,
                            maxMarks: resource.maxMarks || 100,
                          });
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Choice Modal */}
      {isAssessmentChoiceOpen && (
        <div className="fixed inset-0 bg-[#131b2d]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161B26] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-[#2F80F9] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Create Assessment
                  </h2>
                  <p className="text-xs text-gray-500">
                    Choose an assessment format to evaluate your students
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssessmentChoiceOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Options */}
            <div className="p-6 space-y-4">
              {/* Option 1: Quiz / Test */}
              <button
                type="button"
                onClick={() => {
                  setIsAssessmentChoiceOpen(false);
                  setIsTestBuilderOpen(true);
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 dark:hover:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20 transition-all flex items-start gap-4 group active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-[#08BD7E] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      Interactive Quiz / Online Test
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      Auto-Graded
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Build timed quizzes with single or multiple choice questions, automated scoring, and instant learner feedback.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 self-center" />
              </button>

              {/* Option 2: Assignment */}
              <button
                type="button"
                onClick={() => {
                  setIsAssessmentChoiceOpen(false);
                  setIsAssignmentModalOpen(true);
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 hover:border-purple-500 dark:hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/10 hover:bg-purple-50/80 dark:hover:bg-purple-950/20 transition-all flex items-start gap-4 group active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      Graded Assignment / Project
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      Manual Grading
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Set homework, lab reports, or projects with deadlines, file submission requirements, and custom maximum marks.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors shrink-0 self-center" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Creation Modal (from header) */}
      {isAssignmentModalOpen && (
        <CreateAssignmentModal
          isOpen={true}
          courseId={courseId}
          sections={sections}
          onClose={() => setIsAssignmentModalOpen(false)}
          onCreated={(created) => {
            handleAssignmentCreated(created);
            setIsAssignmentModalOpen(false);
          }}
        />
      )}

      {/* Quiz / Test Builder Modal (from header) */}
      {isTestBuilderOpen && (
        <CreateTestBuilderModal
          isOpen={true}
          courseId={courseId}
          sections={sections}
          onClose={() => setIsTestBuilderOpen(false)}
          onCreated={(created) => {
            handleQuizCreated(created);
            setIsTestBuilderOpen(false);
          }}
        />
      )}

      {/* Assignment Creation Modal (from specific section) */}
      {activeAssignmentSection && (
        <CreateAssignmentModal
          isOpen={true}
          courseId={courseId}
          sectionId={activeAssignmentSection.id}
          sectionTitle={activeAssignmentSection.title}
          sections={sections}
          onClose={() => setActiveAssignmentSection(null)}
          onCreated={handleAssignmentCreated}
        />
      )}

      {/* Quiz / Test Builder Modal (from specific section) */}
      {activeQuizSection && (
        <CreateTestBuilderModal
          isOpen={true}
          courseId={courseId}
          sectionId={activeQuizSection.id}
          sections={sections}
          onClose={() => setActiveQuizSection(null)}
          onCreated={handleQuizCreated}
        />
      )}

      {/* Grading & Submissions Modal */}
      {gradingAssessment && (
        <GradingSubmissionsModal
          isOpen={true}
          assignmentId={gradingAssessment.id}
          assignmentTitle={gradingAssessment.title}
          maxMarks={gradingAssessment.maxMarks}
          onClose={() => setGradingAssessment(null)}
        />
      )}
    </div>
  );
}
