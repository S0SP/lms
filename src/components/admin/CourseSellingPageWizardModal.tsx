'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Calendar,
  Clock,
  User,
  Users,
  Star,
  Tag,
  HelpCircle,
  Folder,
  Video as VideoIcon,
  FileText,
  MessageSquare,
  CheckSquare,
  BarChart2,
  FileCheck,
  Youtube as YoutubeIcon,
  Link2,
  Code,
  Copy,
  Info,
  DollarSign,
  Percent,
  Search,
  AlertCircle,
  GripVertical,
  CheckCircle2,
  BookOpen,
  MoreVertical,
  Layers,
  Sparkles,
  Paperclip,
  PlayCircle,
  Smartphone,
  Mail,
  Hash,
  List,
  UploadCloud,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface CourseSellingPageWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (course: any) => void;
  initialData?: any;
  isTemplateMode?: boolean;
}

export interface PaymentPlanItem {
  id: string;
  type: 'session_package' | 'postpaid_session' | 'prepaid_session' | 'session_subscription';
  name: string;
  price: number;
  currency: string;
  sessionCredits?: number;
  autoRenew?: boolean;
  billingCycle?: string;
  gracePeriod?: string;
  gracePeriodDays?: number;
  invoiceLead?: string;
  invoiceLeadDays?: number;
  description?: string;
}

export interface ReviewItem {
  id: string;
  name: string;
  role?: string;
  rating: number;
  comment: string;
  avatarUrl?: string;
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  expiryDate?: string;
  totalUsageLimit?: number;
  perUserLimit?: number;
  description?: string;
}

export interface RegistrationQuestion {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'dropdown' | 'multiselect' | 'file';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ContentResourceItem {
  id: string;
  title: string;
  type: 'folder' | 'video' | 'file' | 'chit_chat' | 'test' | 'poll' | 'assessment' | 'youtube' | 'link' | 'embed' | 'copy_resource';
  externalUrl?: string;
  fileSize?: string;
  duration?: string;
  isFreePreview?: boolean;
}

export interface ContentSectionItem {
  id: string;
  title: string;
  resources: ContentResourceItem[];
  isExpanded?: boolean;
}

const SIDEBAR_STEPS = [
  {
    step: 1,
    title: 'Course Details',
    subtitle: 'Add course details and description',
    badgeColor: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    activeBorder: 'border-blue-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 2,
    title: 'Educators',
    subtitle: 'Assign the educator to conduct sessions',
    badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
    activeBorder: 'border-emerald-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 3,
    title: 'Payment Plans',
    subtitle: 'Choose how and when to bill',
    badgeColor: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
    activeBorder: 'border-amber-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 4,
    title: 'Scheduling',
    subtitle: 'Manage session scheduling',
    badgeColor: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-400 dark:border-cyan-800',
    activeBorder: 'border-cyan-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 5,
    title: 'Course Highlights',
    subtitle: 'Highlight key outcomes and benefits',
    badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800',
    activeBorder: 'border-indigo-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 6,
    title: 'Reviews',
    subtitle: 'Display reviews to build trust',
    badgeColor: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800',
    activeBorder: 'border-rose-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 7,
    title: 'Coupons',
    subtitle: 'Manage discount coupons for this course',
    badgeColor: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
    activeBorder: 'border-orange-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 8,
    title: 'Registration Questions',
    subtitle: 'Collect extra details from buyers at checkout',
    badgeColor: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800',
    activeBorder: 'border-purple-500 bg-white dark:bg-[#161B26]',
  },
  {
    step: 9,
    title: 'Course Content',
    subtitle: 'Add sections, resources, tests and more',
    badgeColor: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-800',
    activeBorder: 'border-teal-500 bg-white dark:bg-[#161B26]',
  },
];

export function CourseSellingPageWizardModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  isTemplateMode = true,
}: CourseSellingPageWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEducators, setAllEducators] = useState<any[]>([]);

  // Step 1: Course Details
  const [courseTitle, setCourseTitle] = useState('test');
  const [subtitle, setSubtitle] = useState('');
  const [board, setBoard] = useState('IGCSE');
  const [grade, setGrade] = useState('Grade 9');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Step 2: Educators
  const [educatorTab, setEducatorTab] = useState<'existing' | 'new'>('existing');
  const [educatorSearch, setEducatorSearch] = useState('');
  const [selectedEducatorIds, setSelectedEducatorIds] = useState<string[]>([]);
  const [educatorPayoutOverrides, setEducatorPayoutOverrides] = useState<Record<string, { rate: number; scope: 'future' | 'all' }>>({});
  // Submodal: Edit Payout
  const [payoutModalEdu, setPayoutModalEdu] = useState<any | null>(null);
  const [payoutRateInput, setPayoutRateInput] = useState<string>('');
  const [payoutScopeInput, setPayoutScopeInput] = useState<'future' | 'all'>('future');
  // New educator invite form
  const [newEduName, setNewEduName] = useState('');
  const [newEduEmail, setNewEduEmail] = useState('');
  const [newEduPhone, setNewEduPhone] = useState('');

  // Step 3: Payment Plans
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanItem[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isPlanTypePickerOpen, setIsPlanTypePickerOpen] = useState(false);
  const [planModalType, setPlanModalType] = useState<PaymentPlanItem['type']>('session_package');
  const [planName, setPlanName] = useState('Billing Plan 1');
  const [planPrice, setPlanPrice] = useState<string>('');
  const [planCurrency, setPlanCurrency] = useState('INR');
  const [planSessionCredits, setPlanSessionCredits] = useState<string>('');
  const [planAutoRenew, setPlanAutoRenew] = useState(false);
  const [planBillingCycle, setPlanBillingCycle] = useState('Monthly');
  const [planGracePeriod, setPlanGracePeriod] = useState('3 days');
  const [planInvoiceLead, setPlanInvoiceLead] = useState('5 days');

  // Copy Resource Modal
  const [copyResourceModalSectionId, setCopyResourceModalSectionId] = useState<string | null>(null);

  // Step 4: Scheduling
  const [sessionDurationStr, setSessionDurationStr] = useState('1 hr');
  const [schedulerRole, setSchedulerRole] = useState<'admin' | 'learner'>('admin');
  const [cancellationPolicy, setCancellationPolicy] = useState(
    'If you cancel,\n• 0 to 24 hours before the session, you will be charged 1 credit\n• More than 24 hours before the session, you will be charged 0 credit'
  );

  // Step 5: Course Highlights
  const [highlightTitleHeader, setHighlightTitleHeader] = useState('');
  const [highlightsList, setHighlightsList] = useState<string[]>(['', '', '']);

  // Step 6: Reviews
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Step 7: Coupons
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDescription, setCouponDescription] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [couponTotalLimit, setCouponTotalLimit] = useState('');
  const [couponPerUserLimit, setCouponPerUserLimit] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percent' | 'flat'>('percent');
  const [couponDiscountVal, setCouponDiscountVal] = useState('0');

  // Step 8: Registration Questions
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([
    { id: 'q-1', label: 'Name', type: 'text', required: true },
    { id: 'q-2', label: 'Email', type: 'email', required: false },
  ]);
  const [editingQuestion, setEditingQuestion] = useState<RegistrationQuestion | null>(null);

  // Step 9: Course Content & Resource Modals
  const [contentSearch, setContentSearch] = useState('');
  const [sections, setSections] = useState<ContentSectionItem[]>([
    { id: 'sec-1', title: 'Section 1', resources: [], isExpanded: true },
    { id: 'sec-2', title: 'Section 2', resources: [], isExpanded: false },
  ]);
  const [activeMenuSectionId, setActiveMenuSectionId] = useState<string | null>(null);

  // Dedicated Video Modal
  const [videoModalSectionId, setVideoModalSectionId] = useState<string | null>(null);
  const [videoUploadTab, setVideoUploadTab] = useState<'upload' | 'url'>('upload');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState('15:00');
  const [videoFreePreview, setVideoFreePreview] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Dedicated File Modal
  const [fileModalSectionId, setFileModalSectionId] = useState<string | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const genericFileInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube Modal
  const [youtubeModalSectionId, setYoutubeModalSectionId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Link Modal
  const [linkModalSectionId, setLinkModalSectionId] = useState<string | null>(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Test / Quiz Modal
  const [testModalSectionId, setTestModalSectionId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [testQuestionCount, setTestQuestionCount] = useState('10');

  // Resource Playback / Preview Modal
  const [previewingResource, setPreviewingResource] = useState<ContentResourceItem | null>(null);

  // Public Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load existing data if editing
  useEffect(() => {
    if (initialData) {
      setCourseTitle(initialData.name || 'test');
      setBoard(initialData.board || 'IGCSE');
      setGrade(initialData.grade || 'Grade 9');
      setDescription(initialData.description || '');
      setThumbnailUrl(initialData.thumbnailUrl || '');
      if (initialData.defaultSessionDurationMin) {
        setSessionDurationStr(
          initialData.defaultSessionDurationMin >= 60
            ? `${initialData.defaultSessionDurationMin / 60} hr`
            : `${initialData.defaultSessionDurationMin} mins`
        );
      }

      if (initialData.sellingPageJson) {
        const sp = initialData.sellingPageJson;
        if (sp.subtitle) setSubtitle(sp.subtitle);
        if (sp.paymentPlans) setPaymentPlans(sp.paymentPlans);
        if (sp.highlightTitleHeader) setHighlightTitleHeader(sp.highlightTitleHeader);
        if (sp.highlightsList) setHighlightsList(sp.highlightsList);
        if (sp.reviews) setReviews(sp.reviews);
        if (sp.coupons) setCoupons(sp.coupons);
        if (sp.questions) setQuestions(sp.questions);
        if (sp.registrationEnabled !== undefined) setRegistrationEnabled(sp.registrationEnabled);
        if (sp.schedulerRole) setSchedulerRole(sp.schedulerRole);
        if (sp.cancellationPolicy) setCancellationPolicy(sp.cancellationPolicy);
        if (sp.educatorPayoutOverrides) setEducatorPayoutOverrides(sp.educatorPayoutOverrides);
      }

      if (initialData.educators && Array.isArray(initialData.educators)) {
        setSelectedEducatorIds(initialData.educators.map((e: any) => e.id));
      }
      if (initialData.curriculum && Array.isArray(initialData.curriculum)) {
        setSections(
          initialData.curriculum.map((sec: any) => ({
            id: sec.id || `sec-${Math.random()}`,
            title: sec.title || 'Section',
            resources: (sec.resources || []).map((r: any) => ({
              id: r.id || `res-${Math.random()}`,
              title: r.title,
              type: r.type || 'file',
              externalUrl: r.externalUrl,
              duration: r.duration,
              fileSize: r.fileSize,
              isFreePreview: r.isFreePreview,
            })),
            isExpanded: true,
          }))
        );
      }
    }
  }, [initialData]);

  // Load educators from DB
  useEffect(() => {
    async function loadEducators() {
      try {
        const res = await fetch('/api/v1/educators');
        if (res.ok) {
          const json = await res.json();
          setAllEducators(json.data || []);
        }
      } catch (e) {
        console.error('Failed to load educators', e);
      }
    }
    loadEducators();
  }, []);

  if (!isOpen) return null;

  // Rich Text Formatting Helper
  const applyFormatting = (tag: string, wrapper: [string, string]) => {
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    const replacement = `${wrapper[0]}${selectedText || tag}${wrapper[1]}`;

    const newText = description.substring(0, start) + replacement + description.substring(end);
    setDescription(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapper[0].length, start + replacement.length - wrapper[1].length);
    }, 10);
  };

  // Upload File Helper
  const handleUploadFile = async (file: File, folder: string = 'course-content'): Promise<string> => {
    try {
      const res = await fetch('/api/v1/uploads/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          folder,
        }),
      });

      if (!res.ok) throw new Error('Failed to get upload signature');
      const { data } = await res.json();

      const putRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!putRes.ok) throw new Error('Upload to storage failed');
      return data.publicUrl || `/uploads/${data.key}`;
    } catch (err: any) {
      console.error('Upload fallback:', err);
      return URL.createObjectURL(file);
    }
  };

  // Video Save Handler
  const handleSaveVideo = async () => {
    if (!videoTitle.trim() || !videoModalSectionId) return;
    setVideoUploading(true);
    let finalUrl = videoUrl;

    if (videoUploadTab === 'upload' && videoFile) {
      try {
        finalUrl = await handleUploadFile(videoFile, 'videos');
      } catch (e) {
        console.error(e);
      }
    }

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== videoModalSectionId) return sec;
        return {
          ...sec,
          resources: [
            ...sec.resources,
            {
              id: `res-${Date.now()}`,
              title: videoTitle.trim(),
              type: 'video',
              externalUrl: finalUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
              duration: videoDuration || '15:00',
              fileSize: videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : '12 MB',
              isFreePreview: videoFreePreview,
            },
          ],
        };
      })
    );

    setVideoUploading(false);
    setVideoModalSectionId(null);
    setVideoTitle('');
    setVideoUrl('');
    setVideoFile(null);
  };

  // File Save Handler
  const handleSaveGenericFile = async () => {
    if (!fileTitle.trim() || !fileModalSectionId) return;
    setFileUploading(true);
    let finalUrl = '';
    let sizeStr = '2.4 MB';

    if (fileObject) {
      finalUrl = await handleUploadFile(fileObject, 'docs');
      sizeStr = `${(fileObject.size / 1024).toFixed(0)} KB`;
    }

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== fileModalSectionId) return sec;
        return {
          ...sec,
          resources: [
            ...sec.resources,
            {
              id: `res-${Date.now()}`,
              title: fileTitle.trim(),
              type: 'file',
              externalUrl: finalUrl,
              fileSize: sizeStr,
            },
          ],
        };
      })
    );

    setFileUploading(false);
    setFileModalSectionId(null);
    setFileTitle('');
    setFileObject(null);
  };

  // Save All Changes
  const handleSaveAll = async (preview: boolean = false) => {
    if (!courseTitle.trim()) {
      setError('Please provide a course title in Step 1.');
      setCurrentStep(1);
      return;
    }

    setSaving(true);
    setError(null);

    const durationMin = sessionDurationStr.includes('hr')
      ? parseFloat(sessionDurationStr) * 60
      : parseInt(sessionDurationStr) || 60;

    const sellingPageJson = {
      subtitle,
      highlightTitleHeader,
      highlightsList,
      reviews,
      coupons,
      questions: registrationEnabled ? questions : [],
      registrationEnabled,
      paymentPlans,
      schedulerRole,
      cancellationPolicy,
      educatorPayoutOverrides,
    };

    const payload = {
      name: courseTitle.trim(),
      description: description.trim(),
      board,
      grade,
      thumbnailUrl:
        thumbnailUrl ||
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      defaultSessionDurationMin: durationMin,
      sellingPageJson,
      educatorIds: selectedEducatorIds,
      sections: sections.map((s, sIdx) => ({
        id: s.id.startsWith('sec-') ? undefined : s.id,
        title: s.title,
        sortOrder: sIdx,
        resources: s.resources.map((r, rIdx) => ({
          id: r.id.startsWith('res-') ? undefined : r.id,
          title: r.title,
          type: r.type,
          sortOrder: rIdx,
          externalUrl: r.externalUrl || '',
          duration: r.duration,
          fileSize: r.fileSize,
          isFreePreview: r.isFreePreview,
        })),
      })),
      isTemplate: isTemplateMode !== undefined ? isTemplateMode : (initialData?.isTemplate ?? false),
    };

    try {
      let url = '/api/v1/courses/templates';
      let method = 'POST';

      if (initialData?.id) {
        url = `/api/v1/courses/templates/${initialData.id}`;
        method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save course');
      }

      const savedData = await res.json();
      onSuccess(savedData.data || savedData);
      if (preview) {
        setIsPreviewOpen(true);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Exact Replica Window Frame matching screenshot signal-2026-10-01-23-37-06-043.png */}
      <div className="bg-white dark:bg-[#10141D] rounded-2xl shadow-2xl w-full max-w-[1180px] h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100">

        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#10141D]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isTemplateMode ? 'Course Template' : '1-on-1 Course Selling Page'}: {courseTitle || 'test'}
          </h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex items-center gap-2 shadow-sm"
            >
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span>Preview Public Page</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Center Layout: Left Sidebar + Right Content Area */}
        <div className="flex-1 flex overflow-hidden">

          {/* ═══════════════════════════════════════════════════════════════════════
              LEFT VERTICAL SIDEBAR (Fixed Width, No Overflowing Chevrons)
          ═══════════════════════════════════════════════════════════════════════ */}
          <div className="w-[340px] border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4 space-y-2 bg-gray-50/40 dark:bg-gray-900/30 shrink-0">
            {SIDEBAR_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              return (
                <button
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${isActive
                      ? `${s.activeBorder} shadow-sm ring-1 ring-black/5 dark:ring-white/5`
                      : 'border-transparent hover:bg-gray-100/70 dark:hover:bg-gray-800/60'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${s.badgeColor}`}
                    >
                      {s.step}
                    </div>
                    <div className="min-w-0 flex-1 pr-1">
                      <p
                        className={`text-xs font-bold truncate ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{s.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'
                      }`}
                  />
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              RIGHT MAIN WORKSPACE
          ═══════════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── STEP 1: COURSE DETAILS ───────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Enter course title"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Course Subtitle
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Enter course subtitle"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Course Description
                  </label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                    {/* Interactive Rich Text Toolbar matching screenshot */}
                    <div className="flex items-center gap-3 px-3.5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300 text-xs flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyFormatting('bold', ['**', '**'])}
                        className="font-bold hover:text-blue-600 px-1"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('italic', ['*', '*'])}
                        className="italic hover:text-blue-600 px-1"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('underline', ['<u>', '</u>'])}
                        className="underline hover:text-blue-600 px-1"
                        title="Underline"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('code', ['`', '`'])}
                        className="hover:text-blue-600 px-1 font-mono text-[11px]"
                        title="Code snippet"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('strikethrough', ['~~', '~~'])}
                        className="hover:text-blue-600 px-1 line-through"
                        title="Strikethrough"
                      >
                        S
                      </button>
                      <span className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormatting('list', ['\n• ', ''])}
                        className="hover:text-blue-600 px-1"
                        title="Bullet List"
                      >
                        ≡ List
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('numbered', ['\n1. ', ''])}
                        className="hover:text-blue-600 px-1"
                        title="Numbered List"
                      >
                        1. Numbered
                      </button>
                      <span className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormatting('subscript', ['_{', '}'])}
                        className="hover:text-blue-600 px-1"
                        title="Subscript"
                      >
                        x₂
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('superscript', ['^{', '}'])}
                        className="hover:text-blue-600 px-1"
                        title="Superscript"
                      >
                        x²
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('formula', ['\n$$ ', ' $$\n'])}
                        className="hover:text-blue-600 px-1 italic"
                        title="Math Formula"
                      >
                        fx
                      </button>
                      <span className="text-[11px] text-gray-400 ml-auto">Normal ▾</span>
                    </div>
                    <textarea
                      ref={descriptionTextareaRef}
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description"
                      className="w-full p-4 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Cover Photo
                  </label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden p-4 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt="Cover preview"
                          className="w-24 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-24 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Recommended 1200x630 JPG / PNG</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">High quality banner for your course selling page.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={coverFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCoverPhotoUploading(true);
                          const url = await handleUploadFile(file, 'course-covers');
                          setThumbnailUrl(url);
                          setCoverPhotoUploading(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={coverPhotoUploading}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 transition"
                      >
                        {coverPhotoUploading ? 'Uploading...' : 'Upload Image'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: EDUCATORS ────────────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Educator</h3>
                  <p className="text-xs text-gray-400 mt-0.5">These educators will be shown on the course public page</p>
                </div>

                {/* Sub tabs matching signal-2026-10-01-23-37-06-043_003.png */}
                <div className="grid grid-cols-2 rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50/50 dark:bg-gray-800/40">
                  <button
                    type="button"
                    onClick={() => setEducatorTab('existing')}
                    className={`py-2 rounded-lg text-xs font-bold transition ${educatorTab === 'existing'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setEducatorTab('new')}
                    className={`py-2 rounded-lg text-xs font-bold transition ${educatorTab === 'new'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    New Educator
                  </button>
                </div>

                {educatorTab === 'existing' ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={educatorSearch}
                        onChange={(e) => setEducatorSearch(e.target.value)}
                        placeholder="Search Educator"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 shadow-sm"
                      />
                    </div>

                    <div className="space-y-2.5">
                      {allEducators
                        .filter(
                          (edu) =>
                            edu.name?.toLowerCase().includes(educatorSearch.toLowerCase()) ||
                            edu.email?.toLowerCase().includes(educatorSearch.toLowerCase())
                        )
                        .map((edu) => {
                          const isSelected = selectedEducatorIds.includes(edu.id);
                          const override = educatorPayoutOverrides[edu.id];
                          return (
                            <div
                              key={edu.id}
                              className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                                  {edu.name ? edu.name[0].toUpperCase() : 'E'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{edu.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPayoutModalEdu(edu);
                                        setPayoutRateInput(override?.rate ? override.rate.toString() : '500');
                                        setPayoutScopeInput(override?.scope || 'future');
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
                                    >
                                      {override ? `₹${override.rate} Payout` : '+ Add Payout'}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">{edu.email}</p>
                                </div>
                              </div>

                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedEducatorIds((prev) =>
                                    prev.includes(edu.id)
                                      ? prev.filter((id) => id !== edu.id)
                                      : [...prev, edu.id]
                                  );
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Educator Name *
                      </label>
                      <input
                        type="text"
                        value={newEduName}
                        onChange={(e) => setNewEduName(e.target.value)}
                        placeholder="Enter name"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Educator Email *
                      </label>
                      <input
                        type="email"
                        value={newEduEmail}
                        onChange={(e) => setNewEduEmail(e.target.value)}
                        placeholder="Enter email"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Educator Phone Number
                      </label>
                      <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center gap-1 text-xs">
                          <span>🇮🇳</span>
                          <span className="font-semibold">+91</span>
                        </div>
                        <input
                          type="text"
                          value={newEduPhone}
                          onChange={(e) => setNewEduPhone(e.target.value)}
                          placeholder="Phone number"
                          className="flex-1 px-4 py-2 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newEduName.trim() || !newEduEmail.trim()) return;
                          const newId = `edu-${Date.now()}`;
                          const newEdu = { id: newId, name: newEduName.trim(), email: newEduEmail.trim() };
                          setAllEducators((prev) => [newEdu, ...prev]);
                          setSelectedEducatorIds((prev) => [...prev, newId]);
                          setNewEduName('');
                          setNewEduEmail('');
                          setNewEduPhone('');
                          setEducatorTab('existing');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition"
                      >
                        Add Educator
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: PAYMENT PLANS ────────────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Payment Plan</h3>
                    <p className="text-xs text-gray-400 mt-0.5">These plans will be shown on the course public page</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanModalType('session_package');
                      setPlanName(`Billing Plan ${paymentPlans.length + 1}`);
                      setPlanPrice('');
                      setPlanCurrency('INR');
                      setPlanSessionCredits('4');
                      setPlanAutoRenew(false);
                      setPlanBillingCycle('Monthly');
                      setPlanGracePeriod('3 days');
                      setPlanInvoiceLead('5 days');
                      setIsPlanTypePickerOpen(false);
                      setIsPlanModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    + Add
                  </button>
                </div>

                {paymentPlans.length === 0 ? (
                  <div className="py-24 text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No payment plans added yet</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Add payment plans to make them available on the course public page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {plan.type === 'session_package' && 'Session Based Packages'}
                              {plan.type === 'postpaid_session' && 'Postpaid Per Session'}
                              {plan.type === 'prepaid_session' && 'Prepaid Per Session'}
                              {plan.type === 'session_subscription' && 'Session Based Subscription'}
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{plan.name}</span>
                          </div>
                          <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 flex items-center flex-wrap gap-x-2 gap-y-0.5">
                            {plan.type === 'session_package' && (
                              <>
                                <span>₹{plan.price} {plan.currency || 'INR'}</span>
                                <span className="text-xs font-normal text-gray-400">
                                  • {plan.sessionCredits || 1} Session credits • {plan.autoRenew ? 'Auto-renews' : 'Manual renewal'}
                                </span>
                              </>
                            )}
                            {plan.type === 'postpaid_session' && (
                              <>
                                <span>₹{plan.price} {plan.currency || 'INR'} / session credit</span>
                                <span className="text-xs font-normal text-gray-400">
                                  • Invoiced: {plan.billingCycle || 'Monthly'} • Grace: {plan.gracePeriod || (plan.gracePeriodDays ? `${plan.gracePeriodDays} days` : '3 days')}
                                </span>
                              </>
                            )}
                            {plan.type === 'prepaid_session' && (
                              <>
                                <span>₹{plan.price} {plan.currency || 'INR'} / session credit</span>
                                <span className="text-xs font-normal text-gray-400">
                                  • Invoiced ahead • Cycle: {plan.billingCycle || 'Monthly'} • Lead time: {plan.invoiceLead || (plan.invoiceLeadDays ? `${plan.invoiceLeadDays} days` : '5 days')}
                                </span>
                              </>
                            )}
                            {plan.type === 'session_subscription' && (
                              <>
                                <span>₹{plan.price} {plan.currency || 'INR'} / {plan.billingCycle || 'Monthly'}</span>
                                <span className="text-xs font-normal text-gray-400">
                                  • {plan.sessionCredits || 1} Credits / cycle • Grace: {plan.gracePeriod || (plan.gracePeriodDays ? `${plan.gracePeriodDays} days` : '3 days')}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit Plan"
                            onClick={() => {
                              setEditingPlanId(plan.id);
                              setPlanModalType(plan.type);
                              setPlanName(plan.name);
                              setPlanPrice(plan.price ? plan.price.toString() : '');
                              setPlanCurrency(plan.currency || 'INR');
                              setPlanSessionCredits(plan.sessionCredits ? plan.sessionCredits.toString() : '4');
                              setPlanAutoRenew(Boolean(plan.autoRenew));
                              setPlanBillingCycle(plan.billingCycle || 'Monthly');
                              setPlanGracePeriod(plan.gracePeriod || (plan.gracePeriodDays ? `${plan.gracePeriodDays} days` : '3 days'));
                              setPlanInvoiceLead(plan.invoiceLead || (plan.invoiceLeadDays ? `${plan.invoiceLeadDays} days` : '5 days'));
                              setIsPlanTypePickerOpen(false);
                              setIsPlanModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete Plan"
                            onClick={() => setPaymentPlans((prev) => prev.filter((p) => p.id !== plan.id))}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: SCHEDULING ───────────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1">
                    Session Duration
                  </label>
                  <p className="text-xs text-gray-400 mb-2">Total duration of each Session that would be conducted in this Course</p>
                  <div className="w-32">
                    <CustomSelect
                      value={sessionDurationStr}
                      onChange={(v) => setSessionDurationStr(v)}
                      options={[
                        { value: '30 mins', label: '30 mins' },
                        { value: '45 mins', label: '45 mins' },
                        { value: '1 hr', label: '1 hr' },
                        { value: '1.5 hr', label: '1.5 hr' },
                        { value: '2 hr', label: '2 hr' },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1">
                    Cancellation Policy Note
                  </label>
                  <p className="text-xs text-gray-400 mb-2">This will be shown to Learners when they cancel a session</p>
                  <textarea
                    rows={4}
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1">
                    Who schedules sessions?
                  </label>
                  <p className="text-xs text-gray-400 mb-3">Choose whether scheduling is managed by you or by the learner</p>

                  <div className="space-y-3">
                    <div
                      onClick={() => setSchedulerRole('admin')}
                      className={`p-4 rounded-xl border cursor-pointer flex items-start justify-between transition ${schedulerRole === 'admin'
                          ? 'border-gray-900 dark:border-white bg-gray-50/50 dark:bg-gray-800/40 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Admin Schedules sessions</p>
                        <p className="text-xs text-gray-400">
                          Learners purchase the course first. Admins assign educators and schedule sessions for them
                        </p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-900 dark:border-white flex items-center justify-center shrink-0 mt-0.5">
                        {schedulerRole === 'admin' && <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white" />}
                      </div>
                    </div>

                    <div
                      onClick={() => setSchedulerRole('learner')}
                      className={`p-4 rounded-xl border cursor-pointer flex items-start justify-between transition ${schedulerRole === 'learner'
                          ? 'border-gray-900 dark:border-white bg-gray-50/50 dark:bg-gray-800/40 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Learners Schedule sessions</p>
                        <p className="text-xs text-gray-400">
                          Learners choose an educator and book session times before completing their purchase
                        </p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                        {schedulerRole === 'learner' && <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: COURSE HIGHLIGHTS ────────────────────────────────────── */}
            {currentStep === 5 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Highlight Title Header
                  </label>
                  <input
                    type="text"
                    value={highlightTitleHeader}
                    onChange={(e) => setHighlightTitleHeader(e.target.value)}
                    placeholder="Highlight Title Header"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Highlights
                  </label>
                  <div className="space-y-2.5">
                    {highlightsList.map((hl, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={hl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHighlightsList((prev) => prev.map((item, i) => (i === idx ? val : item)));
                        }}
                        placeholder="Highlight details"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setHighlightsList((prev) => [...prev, ''])}
                    className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    + Add Another Highlight
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 6: REVIEWS ──────────────────────────────────────────────── */}
            {currentStep === 6 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Reviews</h3>
                    <p className="text-xs text-gray-400 mt-0.5">These reviews will be shown on the course public page</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewName('');
                      setReviewRating(5);
                      setReviewComment('');
                      setIsReviewModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shadow-sm"
                  >
                    + Add
                  </button>
                </div>

                {reviews.length === 0 ? (
                  <div className="py-24 text-center space-y-2">
                    <p className="text-xs text-gray-400">No reviews added yet. Click Add to include testimonials.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-start justify-between shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{rev.name}</span>
                            <div className="flex items-center text-amber-400">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{rev.comment}"</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReviews((prev) => prev.filter((r) => r.id !== rev.id))}
                          className="text-gray-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 7: COUPONS ──────────────────────────────────────────────── */}
            {currentStep === 7 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Coupons</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Available coupons for this course</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponCode('');
                      setCouponDescription('');
                      setCouponDiscountVal('10');
                      setIsCouponModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shadow-sm"
                  >
                    + Add
                  </button>
                </div>

                {coupons.length === 0 ? (
                  <div className="py-24 text-center space-y-1.5">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Coupons</h4>
                    <p className="text-xs text-gray-400">You don't have any coupons available to display</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coupons.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">
                            {c.code}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600 ml-2">
                            {c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                          </span>
                          {c.description && <p className="text-[11px] text-gray-400 mt-1">{c.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCoupons((prev) => prev.filter((item) => item.id !== c.id))}
                          className="text-gray-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 8: REGISTRATION QUESTIONS ───────────────────────────────── */}
            {currentStep === 8 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Registration Questions</h3>
                    <p className="text-xs text-gray-400 max-w-lg">
                      Turn this on to ask extra questions when anyone purchases this course from your Store. Name and email are always collected.
                    </p>
                  </div>
                  {/* Working Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setRegistrationEnabled(!registrationEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${registrationEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${registrationEnabled ? 'left-5' : 'left-0.5'
                        }`}
                    />
                  </button>
                </div>

                {/* Pre-filled & custom questions list matching screenshot */}
                <div className="space-y-2.5">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{q.label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {q.type.charAt(0).toUpperCase() + q.type.slice(1)} •{' '}
                            {q.required ? 'Required' : 'Optional'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingQuestion(q)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                          className="p-1 text-gray-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Action Buttons matching exact screenshot */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        { id: `q-${Date.now()}`, label: 'Age / Grade Number', type: 'number', required: false },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <Hash className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add number input</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        { id: `q-${Date.now()}`, label: 'Parent Email', type: 'email', required: false },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        { id: `q-${Date.now()}`, label: 'Target Exam Date', type: 'date', required: false },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        { id: `q-${Date.now()}`, label: 'Parent Phone Number', type: 'phone', required: false },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add phone number</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        { id: `q-${Date.now()}`, label: 'School Name', type: 'text', required: false },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add short text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        {
                          id: `q-${Date.now()}`,
                          label: 'Proficiency Level',
                          type: 'dropdown',
                          required: false,
                          options: ['Beginner', 'Intermediate', 'Advanced'],
                        },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <List className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add drop down</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        {
                          id: `q-${Date.now()}`,
                          label: 'Subjects of Focus',
                          type: 'multiselect',
                          required: false,
                          options: ['Physics', 'Chemistry', 'Mathematics'],
                        },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <List className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add drop down (Multi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        { id: `q-${Date.now()}`, label: 'Upload Syllabus / Past Card', type: 'file', required: false },
                      ]);
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                    <span>Add file upload</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 9: COURSE CONTENT ───────────────────────────────────────── */}
            {currentStep === 9 && (
              <div className="max-w-2xl space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Content</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={contentSearch}
                        onChange={(e) => setContentSearch(e.target.value)}
                        placeholder="Search content"
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTitle = `Section ${sections.length + 1}`;
                        setSections((prev) => [
                          ...prev,
                          { id: `sec-${Date.now()}`, title: newTitle, resources: [], isExpanded: true },
                        ]);
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </button>
                  </div>
                </div>

                {/* Section Cards */}
                <div className="space-y-4">
                  {sections
                    .filter((s) => !contentSearch || s.title.toLowerCase().includes(contentSearch.toLowerCase()))
                    .map((sec) => (
                      <div
                        key={sec.id}
                        className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all ${
                          activeMenuSectionId === sec.id ? 'relative z-30 overflow-visible' : 'overflow-hidden'
                        }`}
                      >
                        {/* Section Card Header */}
                        <div className="p-3.5 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 rounded-t-xl">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <div>
                              <input
                                type="text"
                                value={sec.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSections((prev) =>
                                    prev.map((s) => (s.id === sec.id ? { ...s, title: val } : s))
                                  );
                                }}
                                className="text-xs font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                              />
                              <p className="text-[11px] text-gray-400 mt-0.5">{sec.resources.length} Resources</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 relative">
                            {/* Plus Add Resource Button with exact popup menu from screenshot 018 */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuSectionId(activeMenuSectionId === sec.id ? null : sec.id)
                                }
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm"
                              >
                                <Plus className="w-4 h-4" />
                              </button>

                              {/* Exact Content Popup Menu from signal-2026-10-01-23-37-06-043_018.png */}
                              {activeMenuSectionId === sec.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setActiveMenuSectionId(null)}
                                  />
                                  <div className="absolute right-0 top-9 w-56 max-h-[380px] overflow-y-auto bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-1.5 z-50 animate-fadeIn space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                              ...s,
                                              resources: [
                                                ...s.resources,
                                                { id: `res-${Date.now()}`, title: 'New Folder', type: 'folder' },
                                              ],
                                            }
                                            : s
                                        )
                                      );
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <Folder className="w-4 h-4 text-gray-500" />
                                    <span>Folder</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setVideoModalSectionId(sec.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400"
                                  >
                                    <VideoIcon className="w-4 h-4 text-blue-600" />
                                    <span>Video (Upload / URL)</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setFileModalSectionId(sec.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <span>Files</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                              ...s,
                                              resources: [
                                                ...s.resources,
                                                { id: `res-${Date.now()}`, title: 'Chit Chat Discussion Room', type: 'chit_chat' },
                                              ],
                                            }
                                            : s
                                        )
                                      );
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <MessageSquare className="w-4 h-4 text-gray-500" />
                                    <span>Chit chat</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setTestModalSectionId(sec.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <CheckSquare className="w-4 h-4 text-gray-500" />
                                    <span>Test</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                              ...s,
                                              resources: [
                                                ...s.resources,
                                                { id: `res-${Date.now()}`, title: 'Class Poll', type: 'poll' },
                                              ],
                                            }
                                            : s
                                        )
                                      );
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <BarChart2 className="w-4 h-4 text-gray-500" />
                                    <span>Polls</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                              ...s,
                                              resources: [
                                                ...s.resources,
                                                { id: `res-${Date.now()}`, title: 'Graded Assessment Assignment', type: 'assessment' },
                                              ],
                                            }
                                            : s
                                        )
                                      );
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <FileCheck className="w-4 h-4 text-gray-500" />
                                    <span>Assessment</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setYoutubeModalSectionId(sec.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <YoutubeIcon className="w-4 h-4 text-red-600" />
                                    <span>Youtube</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setLinkModalSectionId(sec.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <Link2 className="w-4 h-4 text-gray-500" />
                                    <span>Link</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === sec.id
                                            ? {
                                              ...s,
                                              resources: [
                                                ...s.resources,
                                                { id: `res-${Date.now()}`, title: 'Embedded Widget', type: 'embed' },
                                              ],
                                            }
                                            : s
                                        )
                                      );
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <Code className="w-4 h-4 text-gray-500" />
                                    <span>Embed Link</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuSectionId(null);
                                      setCopyResourceModalSectionId(sec.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                                  >
                                    <Copy className="w-4 h-4 text-gray-500" />
                                    <span>Copy Resource</span>
                                  </button>
                                </div>
                              </>
                            )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.id === sec.id ? { ...s, isExpanded: !s.isExpanded } : s
                                  )
                                )
                              }
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                            >
                              {sec.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSections((prev) => prev.filter((s) => s.id !== sec.id))}
                              className="p-1.5 text-gray-400 hover:text-rose-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Section Content Items (Accordion) */}
                        {sec.isExpanded && (
                          <div className="p-3 divide-y divide-gray-100 dark:divide-gray-800">
                            {sec.resources.length === 0 ? (
                              <p className="text-xs text-gray-400 py-3 text-center">
                                No resources yet. Click + above to upload video, attach notes, or add quizzes.
                              </p>
                            ) : (
                              sec.resources.map((res) => (
                                <div
                                  key={res.id}
                                  className="py-2.5 px-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg group transition"
                                >
                                  <div className="flex items-center gap-3">
                                    {res.type === 'video' && <VideoIcon className="w-4 h-4 text-blue-500" />}
                                    {res.type === 'file' && <FileText className="w-4 h-4 text-emerald-500" />}
                                    {res.type === 'youtube' && <YoutubeIcon className="w-4 h-4 text-red-600" />}
                                    {res.type === 'test' && <CheckSquare className="w-4 h-4 text-indigo-500" />}
                                    {res.type === 'assessment' && <FileCheck className="w-4 h-4 text-rose-500" />}
                                    {res.type === 'folder' && <Folder className="w-4 h-4 text-amber-500" />}
                                    {res.type === 'link' && <Link2 className="w-4 h-4 text-teal-500" />}
                                    {res.type === 'chit_chat' && <MessageSquare className="w-4 h-4 text-purple-500" />}

                                    <div>
                                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{res.title}</p>
                                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                        <span className="uppercase font-bold">{res.type}</span>
                                        {res.duration && <span>• {res.duration}</span>}
                                        {res.fileSize && <span>• {res.fileSize}</span>}
                                        {res.isFreePreview && (
                                          <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 rounded">
                                            FREE PREVIEW
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {res.externalUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewingResource(res)}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                        title="Preview content"
                                      >
                                        <PlayCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSections((prev) =>
                                          prev.map((s) =>
                                            s.id === sec.id
                                              ? { ...s, resources: s.resources.filter((r) => r.id !== res.id) }
                                              : s
                                          )
                                        );
                                      }}
                                      className="text-gray-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => alert('Ready to use course templates.')}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 flex items-center gap-1"
                  >
                    <span>Choose a template</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM ACTION BAR (Matching exact screenshot styling)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#10141D] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleSaveAll(true)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save and Preview</span>
          </button>

          {currentStep < 9 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(9, prev + 1))}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold text-gray-900 dark:text-white transition flex items-center gap-1 shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSaveAll(false)}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition shadow-sm"
            >
              Finish & Save Course
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: EDIT PAYOUT FOR COURSE
      ═══════════════════════════════════════════════════════════════════════ */}
      {payoutModalEdu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Edit Payout for Course</h4>
              <button onClick={() => setPayoutModalEdu(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {payoutModalEdu.name ? payoutModalEdu.name[0] : 'U'}
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{payoutModalEdu.name}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Payout Amount per Session Credit
              </label>
              <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold flex items-center">
                  ₹
                </div>
                <input
                  type="number"
                  value={payoutRateInput}
                  onChange={(e) => setPayoutRateInput(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none"
                />
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 font-semibold border-l border-gray-200 dark:border-gray-700 flex items-center gap-1">
                  <span>INR</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Apply Payout to Sessions
              </label>
              <CustomSelect
                value={payoutScopeInput}
                onChange={(v) => setPayoutScopeInput(v as any)}
                options={[
                  { value: 'future', label: 'Only Future Sessions' },
                  { value: 'all', label: 'All Past & Future Sessions' },
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalEdu(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEducatorPayoutOverrides((prev) => ({
                    ...prev,
                    [payoutModalEdu.id]: {
                      rate: Number(payoutRateInput) || 500,
                      scope: payoutScopeInput,
                    },
                  }));
                  setPayoutModalEdu(null);
                }}
                className="px-6 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: ADD / EDIT PAYMENT PLAN (Matches screenshots 006, 007, 008, 009)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                {editingPlanId ? 'Edit Payment Plan' : 'Add Payment Plan'}
              </h4>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan Type Header Card */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shadow-sm">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {planModalType === 'session_package' && 'Session Based Packages'}
                    {planModalType === 'postpaid_session' && 'Postpaid Per Session'}
                    {planModalType === 'prepaid_session' && 'Prepaid Per Session'}
                    {planModalType === 'session_subscription' && 'Session Based Subscription'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {planModalType === 'session_package' && 'Buy a bundle of session credits upfront and draw them down'}
                    {planModalType === 'postpaid_session' && 'Charged at the end of the cycle for sessions actually used'}
                    {planModalType === 'prepaid_session' && "Charged ahead of each session as it's scheduled"}
                    {planModalType === 'session_subscription' && 'Recurring payments tied to a set number of sessions each cycle'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPlanTypePickerOpen(!isPlanTypePickerOpen)}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-650 flex items-center gap-1 shadow-xs"
              >
                <Edit2 className="w-3 h-3" />
                Change
              </button>
            </div>

            {/* Plan Type Selector */}
            {isPlanTypePickerOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 animate-fadeIn">
                {[
                  {
                    type: 'session_package',
                    title: 'Session Based Packages',
                    desc: 'Buy a bundle of session credits upfront and draw them down',
                  },
                  {
                    type: 'postpaid_session',
                    title: 'Postpaid Per Session',
                    desc: 'Charged at the end of the cycle for sessions actually used',
                  },
                  {
                    type: 'prepaid_session',
                    title: 'Prepaid Per Session',
                    desc: "Charged ahead of each session as it's scheduled",
                  },
                  {
                    type: 'session_subscription',
                    title: 'Session Based Subscription',
                    desc: 'Recurring payments tied to a set number of sessions each cycle',
                  },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setPlanModalType(item.type as any);
                      setIsPlanTypePickerOpen(false);
                    }}
                    className={`p-2.5 text-left rounded-lg border transition ${
                      planModalType === item.type
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* ── CONDITIONAL MODEL FIELDS ── */}

            {/* 1. MODEL: Session Based Packages (Screenshot 006) */}
            {planModalType === 'session_package' && (
              <>
                {/* Amount */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Amount</label>
                  <p className="text-[11px] text-gray-400">Amount to be charged for the package</p>
                  <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                    <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold flex items-center">
                      {planCurrency === 'USD' ? '$' : planCurrency === 'EUR' ? '€' : planCurrency === 'GBP' ? '£' : '₹'}
                    </div>
                    <input
                      type="number"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="Enter"
                      className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none"
                    />
                    <select
                      value={planCurrency}
                      onChange={(e) => setPlanCurrency(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 font-semibold border-l border-gray-200 dark:border-gray-700 focus:outline-none cursor-pointer"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Session Credits */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Session Credits</label>
                  <p className="text-[11px] text-gray-400">
                    Session credits to be added on payment of the invoice • 1 Session credits = 60 mins
                  </p>
                  <input
                    type="number"
                    value={planSessionCredits}
                    onChange={(e) => setPlanSessionCredits(e.target.value)}
                    placeholder="Enter"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Auto Renew Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Auto-Renew Package</p>
                    <p className="text-[11px] text-gray-400">Renewal invoice will be generated when sessions are completed</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanAutoRenew(!planAutoRenew)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      planAutoRenew ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        planAutoRenew ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}

            {/* 2. MODEL: Postpaid Per Session (Screenshot 007) */}
            {planModalType === 'postpaid_session' && (
              <>
                {/* Price Per Session Credit */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Price Per Session Credit</label>
                  <p className="text-[11px] text-gray-400">Price per session credit to be charged • 1 Session credits = 60 mins</p>
                  <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                    <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold flex items-center">
                      {planCurrency === 'USD' ? '$' : planCurrency === 'EUR' ? '€' : planCurrency === 'GBP' ? '£' : '₹'}
                    </div>
                    <input
                      type="number"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="Enter"
                      className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none"
                    />
                    <select
                      value={planCurrency}
                      onChange={(e) => setPlanCurrency(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 font-semibold border-l border-gray-200 dark:border-gray-700 focus:outline-none cursor-pointer"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Billing Cycle</label>
                  <p className="text-[11px] text-gray-400">Select how often invoices are generated</p>
                  <CustomSelect
                    value={planBillingCycle}
                    onChange={(v) => setPlanBillingCycle(v)}
                    options={[
                      { value: 'Weekly', label: 'Weekly' },
                      { value: 'Every 2 Weeks', label: 'Every 2 Weeks' },
                      { value: 'Monthly', label: 'Monthly' },
                      { value: 'Quarterly', label: 'Quarterly' },
                      { value: 'Half-Yearly', label: 'Half-Yearly' },
                      { value: 'Yearly', label: 'Yearly' },
                    ]}
                  />
                </div>

                {/* Grace Period */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Grace Period</label>
                  <p className="text-[11px] text-gray-400">Platform access will be restricted if invoice is not paid</p>
                  <CustomSelect
                    value={planGracePeriod}
                    onChange={(v) => setPlanGracePeriod(v)}
                    options={[
                      { value: '0 days', label: '0 days' },
                      { value: '3 days', label: '3 days' },
                      { value: '5 days', label: '5 days' },
                      { value: '7 days', label: '7 days' },
                      { value: '14 days', label: '14 days' },
                      { value: '30 days', label: '30 days' },
                    ]}
                  />
                </div>
              </>
            )}

            {/* 3. MODEL: Prepaid Per Session (Screenshot 008) */}
            {planModalType === 'prepaid_session' && (
              <>
                {/* Price Per Session Credit */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Price Per Session Credit</label>
                  <p className="text-[11px] text-gray-400">Price per session credit to be charged • 1 Session credits = 60 mins</p>
                  <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                    <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold flex items-center">
                      {planCurrency === 'USD' ? '$' : planCurrency === 'EUR' ? '€' : planCurrency === 'GBP' ? '£' : '₹'}
                    </div>
                    <input
                      type="number"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="Enter"
                      className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none"
                    />
                    <select
                      value={planCurrency}
                      onChange={(e) => setPlanCurrency(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 font-semibold border-l border-gray-200 dark:border-gray-700 focus:outline-none cursor-pointer"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Billing Cycle</label>
                  <p className="text-[11px] text-gray-400">Select how often invoices are generated</p>
                  <CustomSelect
                    value={planBillingCycle}
                    onChange={(v) => setPlanBillingCycle(v)}
                    options={[
                      { value: 'Weekly', label: 'Weekly' },
                      { value: 'Every 2 Weeks', label: 'Every 2 Weeks' },
                      { value: 'Monthly', label: 'Monthly' },
                      { value: 'Quarterly', label: 'Quarterly' },
                      { value: 'Half-Yearly', label: 'Half-Yearly' },
                      { value: 'Yearly', label: 'Yearly' },
                    ]}
                  />
                </div>

                {/* Invoice Lead Time */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Invoice Lead Time</label>
                  <p className="text-[11px] text-gray-400">Set days before the cycle to create invoices</p>
                  <CustomSelect
                    value={planInvoiceLead}
                    onChange={(v) => setPlanInvoiceLead(v)}
                    options={[
                      { value: '1 day', label: '1 day' },
                      { value: '2 days', label: '2 days' },
                      { value: '3 days', label: '3 days' },
                      { value: '5 days', label: '5 days' },
                      { value: '7 days', label: '7 days' },
                      { value: '10 days', label: '10 days' },
                      { value: '15 days', label: '15 days' },
                    ]}
                  />
                </div>
              </>
            )}

            {/* 4. MODEL: Session Based Subscription (Screenshot 009) */}
            {planModalType === 'session_subscription' && (
              <>
                {/* Amount */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Amount</label>
                  <p className="text-[11px] text-gray-400">Amount to be charged for the subscription</p>
                  <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                    <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold flex items-center">
                      {planCurrency === 'USD' ? '$' : planCurrency === 'EUR' ? '€' : planCurrency === 'GBP' ? '£' : '₹'}
                    </div>
                    <input
                      type="number"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="Enter"
                      className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none"
                    />
                    <select
                      value={planCurrency}
                      onChange={(e) => setPlanCurrency(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 font-semibold border-l border-gray-200 dark:border-gray-700 focus:outline-none cursor-pointer"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Session Credits */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Session Credits</label>
                  <p className="text-[11px] text-gray-400">
                    Session credits to be added for each cycle • 1 Session credits = 60 mins
                  </p>
                  <input
                    type="number"
                    value={planSessionCredits}
                    onChange={(e) => setPlanSessionCredits(e.target.value)}
                    placeholder="Enter"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Billing Cycle */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Billing Cycle</label>
                  <p className="text-[11px] text-gray-400">Select how often invoices are generated</p>
                  <CustomSelect
                    value={planBillingCycle}
                    onChange={(v) => setPlanBillingCycle(v)}
                    options={[
                      { value: 'Weekly', label: 'Weekly' },
                      { value: 'Every 2 Weeks', label: 'Every 2 Weeks' },
                      { value: 'Monthly', label: 'Monthly' },
                      { value: 'Quarterly', label: 'Quarterly' },
                      { value: 'Half-Yearly', label: 'Half-Yearly' },
                      { value: 'Yearly', label: 'Yearly' },
                    ]}
                  />
                </div>

                {/* Grace Period */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">Grace Period</label>
                  <p className="text-[11px] text-gray-400">Platform access will be restricted if invoice is not paid</p>
                  <CustomSelect
                    value={planGracePeriod}
                    onChange={(v) => setPlanGracePeriod(v)}
                    options={[
                      { value: '0 days', label: '0 days' },
                      { value: '3 days', label: '3 days' },
                      { value: '5 days', label: '5 days' },
                      { value: '7 days', label: '7 days' },
                      { value: '14 days', label: '14 days' },
                      { value: '30 days', label: '30 days' },
                    ]}
                  />
                </div>
              </>
            )}

            {/* Plan Name (Applies to all 4 models) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900 dark:text-white">Plan Name</label>
              <p className="text-[11px] text-gray-400">Subtitle for your plan</p>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Billing Plan 1"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalName = planName.trim() || 'Billing Plan 1';
                  const newPlan: PaymentPlanItem = {
                    id: editingPlanId || `plan-${Date.now()}`,
                    type: planModalType,
                    name: finalName,
                    price: Number(planPrice) || 0,
                    currency: planCurrency || 'INR',
                    sessionCredits:
                      planModalType === 'session_package' || planModalType === 'session_subscription'
                        ? Number(planSessionCredits) || 1
                        : undefined,
                    autoRenew: planModalType === 'session_package' ? planAutoRenew : undefined,
                    billingCycle:
                      planModalType === 'postpaid_session' ||
                      planModalType === 'prepaid_session' ||
                      planModalType === 'session_subscription'
                        ? planBillingCycle
                        : undefined,
                    gracePeriod:
                      planModalType === 'postpaid_session' || planModalType === 'session_subscription'
                        ? planGracePeriod
                        : undefined,
                    gracePeriodDays:
                      planModalType === 'postpaid_session' || planModalType === 'session_subscription'
                        ? parseInt(planGracePeriod) || 3
                        : undefined,
                    invoiceLead: planModalType === 'prepaid_session' ? planInvoiceLead : undefined,
                    invoiceLeadDays:
                      planModalType === 'prepaid_session' ? parseInt(planInvoiceLead) || 5 : undefined,
                  };

                  setPaymentPlans((prev) => {
                    if (editingPlanId) {
                      return prev.map((p) => (p.id === editingPlanId ? newPlan : p));
                    }
                    return [...prev, newPlan];
                  });
                  setIsPlanModalOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: ADD REVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Add Review</h4>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Rating</label>
              <div className="flex items-center gap-2 text-gray-300">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Comment</label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter comment"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!reviewName.trim() || !reviewComment.trim()) return;
                  setReviews((prev) => [
                    ...prev,
                    {
                      id: `rev-${Date.now()}`,
                      name: reviewName.trim(),
                      rating: reviewRating,
                      comment: reviewComment.trim(),
                    },
                  ]);
                  setIsReviewModalOpen(false);
                }}
                className="px-6 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: ADD COUPON
      ═══════════════════════════════════════════════════════════════════════ */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Add Coupon</h4>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">This coupon will apply only to this course</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">You can enable it for other courses later</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Coupon code</label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Description</label>
              <textarea
                rows={3}
                value={couponDescription}
                onChange={(e) => setCouponDescription(e.target.value)}
                placeholder="Enter description"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Expiry date</label>
                <input
                  type="date"
                  value={couponExpiry}
                  onChange={(e) => setCouponExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Total usage limit</label>
                <input
                  type="number"
                  value={couponTotalLimit}
                  onChange={(e) => setCouponTotalLimit(e.target.value)}
                  placeholder="No limit"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Discount type</label>
                <CustomSelect
                  value={couponDiscountType}
                  onChange={(v) => setCouponDiscountType(v as any)}
                  options={[
                    { value: 'percent', label: 'Percentage' },
                    { value: 'flat', label: 'Flat Amount' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Discount value</label>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                  <input
                    type="number"
                    value={couponDiscountVal}
                    onChange={(e) => setCouponDiscountVal(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs text-gray-900 dark:text-white bg-transparent focus:outline-none"
                  />
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 font-bold border-l border-gray-200 dark:border-gray-700 flex items-center">
                    {couponDiscountType === 'percent' ? '%' : '₹'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!couponCode.trim()) return;
                  setCoupons((prev) => [
                    ...prev,
                    {
                      id: `coup-${Date.now()}`,
                      code: couponCode.trim(),
                      description: couponDescription.trim(),
                      discountType: couponDiscountType,
                      discountValue: Number(couponDiscountVal) || 0,
                      expiryDate: couponExpiry,
                    },
                  ]);
                  setIsCouponModalOpen(false);
                }}
                className="px-6 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: EDIT QUESTION LABEL / OPTIONS
      ═══════════════════════════════════════════════════════════════════════ */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Edit Question</h4>
              <button onClick={() => setEditingQuestion(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Label</label>
              <input
                type="text"
                value={editingQuestion.label}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editingQuestion.required}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span>Mandatory Field (Required)</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuestions((prev) =>
                    prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
                  );
                  setEditingQuestion(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DEDICATED MODAL: VIDEO UPLOAD
      ═══════════════════════════════════════════════════════════════════════ */}
      {videoModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-blue-600" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Add Video Content</h4>
              </div>
              <button onClick={() => setVideoModalSectionId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50/50 dark:bg-gray-800/40">
              <button
                type="button"
                onClick={() => setVideoUploadTab('upload')}
                className={`py-2 rounded-lg text-xs font-bold transition ${videoUploadTab === 'upload'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Upload Video File (MP4/WebM)
              </button>
              <button
                type="button"
                onClick={() => setVideoUploadTab('url')}
                className={`py-2 rounded-lg text-xs font-bold transition ${videoUploadTab === 'url'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Video URL / Stream Link
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Video Lesson Title *
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="E.g. Module 1: Diagnostic Conceptual Overview"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            {videoUploadTab === 'upload' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Video File
                </label>
                <input
                  type="file"
                  ref={videoFileInputRef}
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setVideoFile(f);
                      if (!videoTitle) setVideoTitle(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />
                <div
                  onClick={() => videoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-gray-50/50 dark:bg-gray-800/30 transition"
                >
                  <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  {videoFile ? (
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{videoFile.name}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Click or Drag video here to upload</p>
                      <p className="text-[11px] text-gray-400 mt-1">Supports MP4, MOV, WebM (Up to 2GB)</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  External Video URL / HLS Link
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Duration
                </label>
                <input
                  type="text"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  placeholder="15:00"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={videoFreePreview}
                    onChange={(e) => setVideoFreePreview(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Free Preview Video</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVideoModalSectionId(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVideo}
                disabled={videoUploading}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2"
              >
                {videoUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{videoUploading ? 'Uploading Video...' : 'Add Video to Section'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: FILE UPLOAD
      ═══════════════════════════════════════════════════════════════════════ */}
      {fileModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Upload Course File</h4>
              <button onClick={() => setFileModalSectionId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Document Title</label>
              <input
                type="text"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                placeholder="E.g. Formula Sheet & Topical Past Papers (PDF)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <input
                type="file"
                ref={genericFileInputRef}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFileObject(f);
                    if (!fileTitle) setFileTitle(f.name);
                  }
                }}
              />
              <div
                onClick={() => genericFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer bg-gray-50/50 dark:bg-gray-800/30"
              >
                <FileText className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                {fileObject ? (
                  <p className="text-xs font-bold text-emerald-600">{fileObject.name}</p>
                ) : (
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Click to choose PDF, DOCX, ZIP file</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFileModalSectionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGenericFile}
                disabled={fileUploading}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
              >
                {fileUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Add File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: YOUTUBE LESSON
      ═══════════════════════════════════════════════════════════════════════ */}
      {youtubeModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <YoutubeIcon className="w-5 h-5 text-red-600" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Add YouTube Video</h4>
              </div>
              <button onClick={() => setYoutubeModalSectionId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Video Title</label>
              <input
                type="text"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                placeholder="E.g. Full Syllabus Revision Lecture"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">YouTube URL</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setYoutubeModalSectionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!youtubeTitle.trim() || !youtubeModalSectionId) return;
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === youtubeModalSectionId
                        ? {
                          ...s,
                          resources: [
                            ...s.resources,
                            {
                              id: `res-${Date.now()}`,
                              title: youtubeTitle.trim(),
                              type: 'youtube',
                              externalUrl: youtubeUrl.trim(),
                            },
                          ],
                        }
                        : s
                    )
                  );
                  setYoutubeModalSectionId(null);
                  setYoutubeTitle('');
                  setYoutubeUrl('');
                }}
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Add YouTube Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: TEST / QUIZ
      ═══════════════════════════════════════════════════════════════════════ */}
      {testModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Create Test / Quiz</h4>
              </div>
              <button onClick={() => setTestModalSectionId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Test Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="E.g. Diagnostic Mid-Term Assessment"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
              <input
                type="number"
                value={testQuestionCount}
                onChange={(e) => setTestQuestionCount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestModalSectionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!testTitle.trim() || !testModalSectionId) return;
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === testModalSectionId
                        ? {
                          ...s,
                          resources: [
                            ...s.resources,
                            {
                              id: `res-${Date.now()}`,
                              title: `${testTitle.trim()} (${testQuestionCount} Qs)`,
                              type: 'test',
                            },
                          ],
                        }
                        : s
                    )
                  );
                  setTestModalSectionId(null);
                  setTestTitle('');
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
              >
                Add Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MODAL: EXTERNAL LINK
      ═══════════════════════════════════════════════════════════════════════ */}
      {linkModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Add External Link</h4>
              <button onClick={() => setLinkModalSectionId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Link Title</label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="E.g. Cambridge Official Syllabus Portal"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">URL</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLinkModalSectionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!linkTitle.trim() || !linkModalSectionId) return;
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === linkModalSectionId
                        ? {
                          ...s,
                          resources: [
                            ...s.resources,
                            {
                              id: `res-${Date.now()}`,
                              title: linkTitle.trim(),
                              type: 'link',
                              externalUrl: linkUrl.trim(),
                            },
                          ],
                        }
                        : s
                    )
                  );
                  setLinkModalSectionId(null);
                  setLinkTitle('');
                  setLinkUrl('');
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          COPY RESOURCE MODAL (Screenshot 018)
      ═══════════════════════════════════════════════════════════════════════ */}
      {copyResourceModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-blue-600" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Copy Resource</h4>
              </div>
              <button
                onClick={() => setCopyResourceModalSectionId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select an existing resource from any section in this course to copy into this section.
            </p>

            <div className="space-y-3">
              {sections.flatMap((s) => s.resources).length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No existing resources found to copy from. Add a video, file, or link first.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {sections.map((sec) =>
                    sec.resources.map((res) => (
                      <div
                        key={`${sec.id}-${res.id}`}
                        onClick={() => {
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === copyResourceModalSectionId
                                ? {
                                    ...s,
                                    resources: [
                                      ...s.resources,
                                      {
                                        ...res,
                                        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                        title: `${res.title} (Copy)`,
                                      },
                                    ],
                                  }
                                : s
                            )
                          );
                          setCopyResourceModalSectionId(null);
                        }}
                        className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 cursor-pointer flex items-center justify-between transition group"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition">
                            {res.title}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            From: <span className="font-semibold text-gray-500 dark:text-gray-300">{sec.title}</span> • {res.type}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition">
                          Copy +
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setCopyResourceModalSectionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          IN-WIZARD RESOURCE PREVIEW / VIDEO PLAYER MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {previewingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#10141D] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{previewingResource.title}</h4>
              </div>
              <button onClick={() => setPreviewingResource(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {previewingResource.type === 'video' ? (
                <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    src={previewingResource.externalUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : previewingResource.type === 'youtube' ? (
                <div className="rounded-xl overflow-hidden aspect-video">
                  <iframe
                    src={previewingResource.externalUrl?.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <FileText className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{previewingResource.title}</p>
                  <a
                    href={previewingResource.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                  >
                    <span>Download / Open File</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PUBLIC SELLING PAGE PREVIEW MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Public Selling Page Live Preview</h3>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Hero */}
              <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="space-y-3 flex-1">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {board} • {grade}
                  </span>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
                    {courseTitle || 'Course Title'}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle || 'Engaging course subtitle here.'}</p>
                </div>
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Course Preview"
                    className="w-full md:w-72 h-44 rounded-2xl object-cover shadow-lg border border-gray-200 dark:border-gray-800"
                  />
                )}
              </div>

              {/* Highlights */}
              {highlightsList.filter(Boolean).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {highlightTitleHeader || 'Course Highlights'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {highlightsList.filter(Boolean).map((h, i) => (
                      <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{h}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Curriculum Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Curriculum & Learning Content</h3>
                <div className="space-y-3">
                  {sections.map((sec) => (
                    <div key={sec.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{sec.title}</p>
                      <div className="space-y-1">
                        {sec.resources.map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            {r.type === 'video' ? <PlayCircle className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                            <span>{r.title}</span>
                            {r.isFreePreview && <span className="text-[10px] text-emerald-600 font-bold ml-2">Preview</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Plans Preview */}
              {paymentPlans.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Choose Your Enrollment Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentPlans.map((p) => (
                      <div key={p.id} className="p-5 rounded-2xl border-2 border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 space-y-2">
                        <p className="font-bold text-base text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-2xl font-black text-blue-600">₹{p.price}</p>
                        <p className="text-xs text-gray-500">
                          {p.sessionCredits ? `${p.sessionCredits} Personalized Sessions Included` : 'Flexible Billing'}
                        </p>
                        <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition">
                          Enroll Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
