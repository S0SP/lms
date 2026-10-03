import React, { useEffect } from 'react';
import { X, Download, UploadCloud, AlertCircle } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface BulkLearnerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkLearnerImportModal({ isOpen, onClose }: BulkLearnerImportModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#161B26] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#1E2535]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Learners</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Upload a CSV to bulk enroll students into a course.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* Step 1: Course Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900 dark:text-gray-100">1. Select Target Course</label>
            <CustomSelect
              value=""
              onChange={() => {}}
              options={[
                { value: 'cs101', label: 'Introduction to Computer Science (CS101)' },
                { value: 'math201', label: 'Advanced Calculus (MATH201)' },
                { value: 'lit305', label: 'Modern Literature (LIT305)' },
              ]}
              placeholder="Choose a course..."
            />
          </div>

          {/* Step 2: Download Template */}
          <div className="flex flex-col gap-2 items-start">
            <label className="text-sm font-bold text-gray-900 dark:text-gray-100">2. Prepare Data</label>
            <button className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
          </div>

          {/* Step 3: Upload Area */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900 dark:text-gray-100">3. Upload CSV</label>
            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Drag CSV here or Browse files</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Max file size: 10MB</p>
            </div>

            {/* Validation Errors Example */}
            <div className="mt-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Validation Errors Found</h4>
                <ul className="list-disc list-inside text-red-600/80 dark:text-red-400/80 text-sm space-y-1">
                  <li>Row 4: invalid email format ('john.doe@')</li>
                  <li>Row 12: missing required field 'Last Name'</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1E2535] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold"
          >
            Cancel
          </button>
          <button className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm opacity-50 cursor-not-allowed">
            Submit Import
          </button>
        </div>
      </div>
    </div>
  );
}
