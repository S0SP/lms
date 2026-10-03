'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { validateEmail, validatePhone } from '@/lib/validation';

export default function AddParentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'Mother',
    learnerId: '',
  });

  const [learners, setLearners] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadLearners() {
      try {
        const res = await fetch('/api/v1/learners?perPage=100');
        if (res.ok) {
          const json = await res.json();
          setLearners(json.data || []);
          if (json.data?.length > 0) {
            setFormData((prev) => ({ ...prev, learnerId: json.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load learners:', err);
      } finally {
        setLoadingLearners(false);
      }
    }
    loadLearners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Email validation
    const emailVal = validateEmail(formData.email, { required: true });
    if (!emailVal.isValid) {
      setError(emailVal.error || 'Please enter a valid email address');
      setSubmitting(false);
      return;
    }

    // Phone validation
    if (formData.phone) {
      const phoneVal = validatePhone(formData.phone);
      if (!phoneVal.isValid) {
        setError(phoneVal.error || 'Please enter a valid phone number');
        setSubmitting(false);
        return;
      }
    }

    try {
      if (!formData.learnerId) {
        throw new Error('Please select a learner to link this parent with');
      }

      const res = await fetch('/api/v1/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add parent');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/users/parents');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/users/parents"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parents
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-600" />
          Add New Parent
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Link a parent to an enrolled learner. This gives them access to reports, progress tracking, and schedules.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Parent linked successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Parent Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="priya@example.com"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <PhoneInputWithCountry
                label="Phone Number (optional)"
                value={formData.phone}
                onChange={(val) => setFormData({ ...formData, phone: val })}
                placeholder="Enter parent phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Relationship
              </label>
              <CustomSelect
                value={formData.relationship}
                onChange={(v) => setFormData({ ...formData, relationship: v })}
                options={[
                  { value: 'Mother', label: 'Mother' },
                  { value: 'Father', label: 'Father' },
                  { value: 'Guardian', label: 'Guardian' },
                  { value: 'Parent', label: 'Parent' },
                  { value: 'Other', label: 'Other' },
                ]}
                placeholder="Select relationship"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Link to Learner (Child) <span className="text-red-500">*</span>
            </label>
            {loadingLearners ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Loading learners list...
              </div>
            ) : learners.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                No learners found. Please <Link href="/admin/users/learners/add" className="underline font-semibold">create a learner</Link> first.
              </div>
            ) : (
              <CustomSelect
                value={formData.learnerId}
                onChange={(v) => setFormData({ ...formData, learnerId: v })}
                options={learners.map((learner) => ({
                  value: learner.id,
                  label: learner.name,
                  subLabel: learner.email,
                }))}
                placeholder="Select a learner / child..."
              />
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <Link
              href="/admin/users/parents"
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Link>
            <FeedbackButton
              type="submit"
              disabled={learners.length === 0}
              loading={submitting}
              success={success}
              loadingText="Linking Parent..."
              successText="Parent Linked Successfully ✓"
              className="px-6 py-2.5 font-semibold"
            >
              Add Parent
            </FeedbackButton>
          </div>
        </form>
      </div>
    </div>
  );
}
