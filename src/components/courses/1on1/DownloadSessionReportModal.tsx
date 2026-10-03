'use client';

import React, { useState } from 'react';
import { X, Download, Calendar, Loader2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface DownloadSessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName?: string;
}

export function DownloadSessionReportModal({
  isOpen,
  onClose,
  courseId,
}: DownloadSessionReportModalProps) {
  const [selectedRange, setSelectedRange] = useState('this_month');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const dateOptions = [
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'all_time', label: 'All time' },
  ];

  const handleDownload = () => {
    setIsDownloading(true);
    const url = `/api/v1/sessions/report?courseId=${courseId}&range=${selectedRange}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-report-${selectedRange}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Download Session Report
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Select dates
            </label>
            <CustomSelect
              value={selectedRange}
              onChange={(val) => setSelectedRange(val)}
              options={dateOptions}
              className="w-full"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
              Max range allowed is 180 days
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Report...</span>
                </>
              ) : (
                <span>Download</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
