'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  Calendar, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Paperclip,
  Download
} from 'lucide-react';

interface StudentAssignmentModalProps {
  isOpen: boolean;
  resourceId: string;
  resourceTitle: string;
  assessmentData?: {
    id: string;
    description: string | null;
    maxMarks: number;
    endsOn: string | null;
    attachments?: Array<{ name: string; url: string; size?: number; type?: string; key?: string }> | null;
    submission?: {
      id: string;
      submittedAt: string;
      fileR2Keys: string[] | null;
      totalScore: number | null;
      feedback: string | null;
      gradedAt: string | null;
    } | null;
  } | null;
  onClose: () => void;
  onSubmitted?: (submission: any) => void;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudentAssignmentModal({
  isOpen,
  resourceId,
  resourceTitle,
  assessmentData,
  onClose,
  onSubmitted,
}: StudentAssignmentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submission, setSubmission] = useState(assessmentData?.submission || null);
  const [details, setDetails] = useState<any>(assessmentData);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setDetails(assessmentData);
    if (assessmentData?.submission) {
      setSubmission(assessmentData.submission);
    }

    async function fetchFullAssignment() {
      try {
        const idToFetch = assessmentData?.id || resourceId;
        if (!idToFetch) return;
        const res = await fetch(`/api/v1/assignments/${idToFetch}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setDetails((prev: any) => ({ ...prev, ...json.data }));
            if (json.data.submission) {
              setSubmission(json.data.submission);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching assignment details:', err);
      }
    }

    if (isOpen) {
      fetchFullAssignment();
    }
  }, [isOpen, assessmentData, resourceId]);

  if (!isOpen) return null;

  const maxMarks = details?.maxMarks || assessmentData?.maxMarks || 100;
  const deadline = (details?.endsOn || assessmentData?.endsOn) ? new Date(details?.endsOn || assessmentData?.endsOn) : null;
  const isPastDeadline = deadline ? new Date() > deadline : false;
  const isGraded = submission?.totalScore !== null && submission?.totalScore !== undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);

      // 1. Get Cloudflare R2 presigned PUT URL
      const presignedRes = await fetch('/api/v1/uploads/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          folder: 'submission-files',
        }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok) {
        throw new Error(presignedData.error || 'Failed to generate secure upload URL');
      }

      const { url: uploadUrl, key: fileKey } = presignedData.data;

      // 2. Direct PUT upload to storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to cloud storage');
      }

      // 3. Submit assignment to LMS backend
      const targetId = assessmentData?.id || resourceId;
      const submitRes = await fetch(`/api/v1/assignments/${targetId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileR2Keys: [fileKey],
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(submitData.error || 'Failed to submit assignment');
      }

      setSubmission(submitData.data);
      setSelectedFile(null);
      setSuccessMsg('Assignment submitted successfully!');
      if (onSubmitted) onSubmitted(submitData.data);
    } catch (err: any) {
      setError(err.message || 'Error uploading assignment');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#131b2d]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {resourceTitle}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Max Marks: {maxMarks}
                </span>
                {deadline && (
                  <span className={`text-xs flex items-center gap-1 ${isPastDeadline ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {isPastDeadline ? 'Deadline Passed: ' : 'Due: '}
                    {deadline.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Instructions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Assignment Instructions
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {details?.description || assessmentData?.description || 'Review the assignment materials and submit your solution file below.'}
            </div>
          </div>

          {/* Reference Materials / Attachments from Educator */}
          {details?.attachments && details.attachments.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                Reference Documents & Resources ({details.attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {details.attachments.map((doc: any, idx: number) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50/60 dark:bg-gray-800/40 dark:hover:bg-blue-950/20 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        {doc.type === 'link' ? <ExternalLink className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {doc.name}
                        </p>
                        {doc.size ? (
                          <p className="text-[10px] text-gray-400">
                            {formatBytes(doc.size)}
                          </p>
                        ) : doc.type === 'link' ? (
                          <p className="text-[10px] text-blue-500 truncate max-w-[150px]">
                            {doc.url}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Graded Result Card (if graded) */}
          {isGraded && (
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Graded by Educator
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {submission.totalScore} / {maxMarks}
                </span>
              </div>
              {submission.feedback && (
                <div className="mt-2 text-sm text-emerald-900 dark:text-emerald-200 bg-white/60 dark:bg-black/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <span className="font-semibold block text-xs mb-1 text-emerald-800 dark:text-emerald-300">
                    Feedback & Comments:
                  </span>
                  {submission.feedback}
                </div>
              )}
            </div>
          )}

          {/* Existing Submission Details */}
          {submission && (
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold">
                <span>Submitted on {new Date(submission.submittedAt).toLocaleString()}</span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  {isGraded ? 'Completed' : 'Awaiting Grading'}
                </span>
              </div>
              {submission.fileR2Keys && submission.fileR2Keys.length > 0 && (
                <div className="space-y-1 pt-1">
                  {submission.fileR2Keys.map((key: string, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-[#161B26] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{key.split('/').pop()}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                        Uploaded
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* File Upload Section */}
          {!isGraded && (
            <form onSubmit={handleUploadAndSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="assignment-file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="assignment-file"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block">
                      {selectedFile ? selectedFile.name : 'Choose a file to upload'}
                    </span>
                    <span className="text-xs text-gray-400">
                      PDF, DOCX, ZIP, or images up to 50MB (Stored directly in Cloudflare R2)
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploading || isPastDeadline}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to R2 & Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submission ? 'Re-upload & Submit Solution' : 'Submit Assignment'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
