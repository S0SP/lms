'use client';

import React, { useState, useRef } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { 
  X, 
  Calendar, 
  Award, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Paperclip,
  Upload,
  Trash2,
  ExternalLink,
  Link2
} from 'lucide-react';

interface AttachedFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
  key?: string;
}

interface CreateAssignmentModalProps {
  isOpen: boolean;
  courseId: string;
  sectionId?: string;
  sectionTitle?: string;
  sections?: Array<{ id: string; title: string }>;
  onClose: () => void;
  onCreated: (assignment: any) => void;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateAssignmentModal({
  isOpen,
  courseId,
  sectionId,
  sectionTitle,
  sections,
  onClose,
  onCreated,
}: CreateAssignmentModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sectionId || (sections && sections.length > 0 ? sections[0].id : '')
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxMarks, setMaxMarks] = useState('20');
  const [endsOn, setEndsOn] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [attachedDocs, setAttachedDocs] = useState<AttachedFile[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (sectionId) {
      setSelectedSectionId(sectionId);
    } else if (sections && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sectionId, sections, selectedSectionId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingDoc(true);
    setError(null);

    const newDocs: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 1. Get presigned upload URL
        const presignedRes = await fetch('/api/v1/uploads/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            folder: 'assignment-docs',
          }),
        });

        const presignedData = await presignedRes.json();
        if (!presignedRes.ok) {
          throw new Error(presignedData.error || `Failed to upload ${file.name}`);
        }

        const { url: uploadUrl, key: fileKey, publicUrl } = presignedData.data;

        // 2. Direct upload PUT
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        newDocs.push({
          name: file.name,
          url: publicUrl || uploadUrl,
          size: file.size,
          type: file.type || 'application/octet-stream',
          key: fileKey,
        });
      } catch (err: any) {
        console.error('File upload failed:', err);
        setError(err.message || `Failed to upload ${file.name}`);
      }
    }

    setAttachedDocs((prev) => [...prev, ...newDocs]);
    setUploadingDoc(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const name = linkTitle.trim() || linkUrl.trim();
    setAttachedDocs((prev) => [
      ...prev,
      {
        name,
        url,
        type: 'link',
      },
    ]);
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
  };

  const handleRemoveDoc = (index: number) => {
    setAttachedDocs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an assignment title.');
      return;
    }
    const marksNum = Number(maxMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      setError('Maximum marks must be a positive number.');
      return;
    }
    const targetSectionId = sectionId || selectedSectionId;
    if (!targetSectionId) {
      setError('Please select a course section for this assignment.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/v1/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: targetSectionId,
          title: title.trim(),
          description: description.trim() || undefined,
          endsOn: endsOn ? new Date(endsOn).toISOString() : null,
          maxMarks: marksNum,
          isPublished,
          attachments: attachedDocs.map((d) => ({
            name: d.name,
            url: d.url,
            size: d.size,
            type: d.type,
            key: d.key,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create assignment');
      }

      onCreated(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#131b2d]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Create Assignment
            </h2>
            {sectionTitle && (
              <p className="text-xs text-gray-500 mt-0.5">Section: {sectionTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sections && sections.length > 0 && !sectionId && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Course Section / Module *
              </label>
              <CustomSelect
                value={selectedSectionId}
                onChange={setSelectedSectionId}
                options={(sections || []).map((s) => ({ value: s.id, label: s.title }))}
                placeholder="Select a module..."
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Assignment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lab Report 1: Graph Traversal Algorithms"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Instructions & Problem Description
            </label>
            <textarea
              rows={4}
              placeholder="Provide clear instructions, submission criteria, or problem statements for students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all resize-none"
            />
          </div>

          {/* Reference Documents & Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                Assignment Documents & Attachments
              </label>
              <button
                type="button"
                onClick={() => setShowLinkInput(!showLinkInput)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                {showLinkInput ? 'Cancel' : '+ Add URL / Doc Link'}
              </button>
            </div>

            {/* Optional URL Link Input */}
            {showLinkInput && (
              <div className="p-3.5 mb-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Starter Repo, Problem Spec)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="url"
                    placeholder="https://... (Google Docs, GitHub, Drive)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(false)}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!linkUrl.trim()}
                    className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Attach Link
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
            />

            {/* Drag & drop / click upload box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-blue-50/30 dark:bg-gray-800/20 dark:hover:bg-blue-950/10 group"
            >
              {uploadingDoc ? (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading documents...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                  <div className="w-8 h-8 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Click to attach PDF, Word, Problem Sheet, or Starter files
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Supports .pdf, .docx, .zip, .pptx, .xlsx, .txt, images (up to 25MB each)
                  </span>
                </div>
              )}
            </div>

            {/* Uploaded Documents List */}
            {attachedDocs.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachedDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        {doc.type === 'link' ? <Link2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {doc.name}
                        </p>
                        {doc.size ? (
                          <p className="text-[10px] text-gray-400">
                            {formatBytes(doc.size)}
                          </p>
                        ) : doc.type === 'link' ? (
                          <p className="text-[10px] text-blue-500 truncate max-w-[200px]">
                            {doc.url}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Preview attachment"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                Max Score (Marks) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Submission Deadline
              </label>
              <input
                type="datetime-local"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
            <div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                Publish Immediately
              </span>
              <span className="text-xs text-gray-500">
                If enabled, enrolled students will immediately see this assignment. You can revoke it anytime.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
