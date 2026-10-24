'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StoreCourseCardActionsProps {
  courseId: string;
  courseType: string;
  initialStatus: string;
  urlSlug?: string | null;
}

export function StoreCourseCardActions({
  courseId,
  courseType,
  initialStatus,
  urlSlug,
}: StoreCourseCardActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isPublished = status === 'published';

  const toggleStatus = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setLoading(true);
      const nextStatus = isPublished ? 'draft' : 'published';
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setStatus(nextStatus);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setLoading(false);
    }
  };

  const workspaceHref =
    courseType === 'one_on_one'
      ? `/admin/courses/1-on-1/${courseId}`
      : `/admin/courses/${courseId}`;

  return (
    <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
      <button
        onClick={toggleStatus}
        disabled={loading}
        title={isPublished ? 'Click to set to Draft' : 'Click to Publish on Storefront'}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all active:scale-95 ${
          isPublished
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
        }`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isPublished ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
        <span>{isPublished ? 'Live' : 'Draft'}</span>
      </button>

      <div className="flex items-center gap-1.5">
        <Link
          href={workspaceHref}
          className="px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition-colors"
        >
          Workspace →
        </Link>
        {urlSlug && (
          <Link
            href={`/courses/${urlSlug}`}
            target="_blank"
            title="View public landing page"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
