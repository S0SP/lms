'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, UploadCloud, AlertCircle, CheckCircle2, Loader2, FileText, Users } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { validateEmail } from '@/lib/validation';

interface BulkLearnerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedLearner {
  name: string;
  email: string;
  phone?: string;
  grade?: string;
  board?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

interface ValidationError {
  row: number;
  message: string;
}

export function BulkLearnerImportModal({ isOpen, onClose, onSuccess }: BulkLearnerImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<{ value: string; label: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedLearners, setParsedLearners] = useState<ParsedLearner[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ created: number; enrolled: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFileName(null);
      setParsedLearners([]);
      setValidationErrors([]);
      setImportSuccess(null);
      setImportError(null);
      setImportProgress(null);

      // Load available courses
      setLoadingCourses(true);
      fetch('/api/v1/courses?perPage=100')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            const opts = json.data.map((c: any) => ({
              value: c.id,
              label: `${c.name} (${c.type})`,
            }));
            setCourses(opts);
          }
        })
        .catch((err) => console.error('Failed to load courses:', err))
        .finally(() => setLoadingCourses(false));
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const csvContent =
      'Name,Email,Phone,Grade,Board,ParentName,ParentEmail,ParentPhone\n' +
      'Aarav Sharma,aarav.sharma@example.com,+919876543210,Grade 10,IGCSE,Rajesh Sharma,rajesh.sharma@example.com,+919876543211\n' +
      'Ananya Patel,ananya.p@example.com,+919876543220,Grade 9,IB,Sunita Patel,sunita.p@example.com,+919876543221\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'learner_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper: Simple CSV line parser supporting quoted fields
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleProcessCsvText = (text: string, fName: string) => {
    setFileName(fName);
    setImportSuccess(null);
    setImportError(null);

    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length <= 1) {
      setValidationErrors([{ row: 1, message: 'CSV file is empty or contains only the header row.' }]);
      setParsedLearners([]);
      return;
    }

    const headers = parseCsvLine(rawLines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    const nameIdx = headers.findIndex((h) => h.includes('name') && !h.includes('parent'));
    const emailIdx = headers.findIndex((h) => h.includes('email') && !h.includes('parent'));
    const phoneIdx = headers.findIndex((h) => h.includes('phone') && !h.includes('parent'));
    const gradeIdx = headers.findIndex((h) => h.includes('grade'));
    const boardIdx = headers.findIndex((h) => h.includes('board'));
    const parentNameIdx = headers.findIndex((h) => h.includes('parentname'));
    const parentEmailIdx = headers.findIndex((h) => h.includes('parentemail'));
    const parentPhoneIdx = headers.findIndex((h) => h.includes('parentphone'));

    const errors: ValidationError[] = [];
    const validRows: ParsedLearner[] = [];

    for (let i = 1; i < rawLines.length; i++) {
      const rowNum = i + 1;
      const cols = parseCsvLine(rawLines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
      const email = emailIdx !== -1 ? cols[emailIdx] : cols[1];
      const phone = phoneIdx !== -1 ? cols[phoneIdx] : cols[2];
      const grade = gradeIdx !== -1 ? cols[gradeIdx] : undefined;
      const board = boardIdx !== -1 ? cols[boardIdx] : undefined;
      const parentName = parentNameIdx !== -1 ? cols[parentNameIdx] : undefined;
      const parentEmail = parentEmailIdx !== -1 ? cols[parentEmailIdx] : undefined;
      const parentPhone = parentPhoneIdx !== -1 ? cols[parentPhoneIdx] : undefined;

      if (!name || name.trim().length < 2) {
        errors.push({ row: rowNum, message: 'Missing or invalid student name (min 2 chars).' });
        continue;
      }

      if (!email || !validateEmail(email, { required: true }).isValid) {
        errors.push({ row: rowNum, message: `Invalid student email: "${email || ''}".` });
        continue;
      }

      if (parentEmail && !validateEmail(parentEmail, { required: false }).isValid) {
        errors.push({ row: rowNum, message: `Invalid parent email: "${parentEmail}".` });
        continue;
      }

      validRows.push({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || undefined,
        grade: grade?.trim() || undefined,
        board: board?.trim() || undefined,
        parentName: parentName?.trim() || undefined,
        parentEmail: parentEmail?.trim().toLowerCase() || undefined,
        parentPhone: parentPhone?.trim() || undefined,
      });
    }

    setValidationErrors(errors);
    setParsedLearners(validRows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessCsvText(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setImportError('Please upload a valid .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessCsvText(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmitImport = async () => {
    if (parsedLearners.length === 0) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setImportProgress({ current: 0, total: parsedLearners.length });

    let createdCount = 0;
    let enrolledCount = 0;

    try {
      for (let i = 0; i < parsedLearners.length; i++) {
        const learner = parsedLearners[i];
        setImportProgress({ current: i + 1, total: parsedLearners.length });

        // 1. Create Learner
        const res = await fetch('/api/v1/learners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(learner),
        });

        if (res.ok) {
          createdCount++;
          const json = await res.json().catch(() => ({}));
          const createdLearnerId = json.data?.id;

          // 2. Auto-enroll into target course if selected
          if (selectedCourseId && createdLearnerId) {
            const enrollRes = await fetch(`/api/v1/courses/${selectedCourseId}/enrollments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ learnerId: createdLearnerId }),
            });
            if (enrollRes.ok) {
              enrolledCount++;
            }
          }
        }
      }

      setImportSuccess({ created: createdCount, enrolled: enrolledCount });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Bulk import error:', err);
      setImportError(err.message || 'Error occurred during bulk learner import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#161B26] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#1E2535]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Bulk Import Learners
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Upload a CSV file to create multiple scholar accounts and optionally enroll them into a course.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {importSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-bold text-sm">Bulk Import Complete!</p>
                <p className="mt-1">
                  Successfully created <strong>{importSuccess.created}</strong> learner account{importSuccess.created === 1 ? '' : 's'}.
                  {importSuccess.enrolled > 0 && ` Auto-enrolled ${importSuccess.enrolled} into selected course.`}
                </p>
              </div>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {/* Step 1: Course Selection (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              1. Optional: Select Target Course for Enrollment
            </label>
            <CustomSelect
              value={selectedCourseId}
              onChange={(val) => setSelectedCourseId(val)}
              options={[{ value: '', label: 'None (Create learner accounts only)' }, ...courses]}
              placeholder={loadingCourses ? 'Loading courses...' : 'Choose a course or leave blank...'}
            />
          </div>

          {/* Step 2: Download Template */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800">
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Download Template</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Pre-formatted CSV with columns for Name, Email, Phone, Grade, and Parent details.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Step 3: Upload Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              2. Upload Completed CSV
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                {fileName ? fileName : 'Click to Browse or Drag CSV here'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Comma-separated .csv up to 5MB
              </p>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3.5 flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-red-600 dark:text-red-400 mb-1">
                  Validation Issues Found ({validationErrors.length})
                </h4>
                <ul className="list-disc list-inside text-red-600/90 dark:text-red-400/90 space-y-0.5 max-h-28 overflow-y-auto">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedLearners.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                <span>Ready to Import ({parsedLearners.length} scholars)</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Valid format
                </span>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3 py-1.5">Name</th>
                      <th className="px-3 py-1.5">Email</th>
                      <th className="px-3 py-1.5">Grade / Board</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {parsedLearners.slice(0, 10).map((l, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-medium text-gray-800 dark:text-gray-200">{l.name}</td>
                        <td className="px-3 py-1.5 text-gray-500">{l.email}</td>
                        <td className="px-3 py-1.5 text-gray-400">{[l.grade, l.board].filter(Boolean).join(' • ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedLearners.length > 10 && (
                <p className="text-[10px] text-gray-400 italic">
                  + {parsedLearners.length - 10} more learners ready for creation
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1E2535] flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {importProgress && (
              <span className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Importing {importProgress.current} of {importProgress.total}...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {importSuccess ? 'Close' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmitImport}
              disabled={importing || parsedLearners.length === 0}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Import {parsedLearners.length > 0 ? `${parsedLearners.length} Scholars` : 'CSV'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
