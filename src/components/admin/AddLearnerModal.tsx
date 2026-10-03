'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar as CalendarIcon,
  ChevronDown,
  Edit2,
  Lock,
  Users,
} from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { validateEmail, validatePhone } from '@/lib/validation';

export interface AddLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddLearnerModal({ isOpen, onClose, onSuccess }: AddLearnerModalProps) {
  // Primary learner fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [loginPin, setLoginPin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTags, setShowTags] = useState(false);

  // Registration details (Learner-facing)
  const [showRegistration, setShowRegistration] = useState(true);
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [schoolCity, setSchoolCity] = useState('');

  // Parent details
  const [showParent, setShowParent] = useState(true);
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [showParentPhone, setShowParentPhone] = useState(false);

  // Admin Only
  const [showPrivateNote, setShowPrivateNote] = useState(false);
  const [privateNote, setPrivateNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setSuccess(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Learner Name is required');
      return;
    }

    if (email.trim()) {
      const emailVal = validateEmail(email, { required: false });
      if (!emailVal.isValid) {
        setError(emailVal.error || 'Please enter a valid learner email address');
        return;
      }
    }

    if (showPhone && phone) {
      const phoneVal = validatePhone(phone, { required: false });
      if (!phoneVal.isValid) {
        setError(phoneVal.error || 'Please enter a valid learner phone number');
        return;
      }
    }

    if (parentEmail.trim()) {
      const pEmailVal = validateEmail(parentEmail, { required: false });
      if (!pEmailVal.isValid) {
        setError(pEmailVal.error || 'Please enter a valid parent email address');
        return;
      }
    }

    setSubmitting(true);
    try {
      // If no learner email provided, create a unique placeholder or default
      const finalEmail = email.trim() || `learner.${Date.now()}@unboundyou.local`;

      const res = await fetch('/api/v1/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: finalEmail.toLowerCase(),
          phone: showPhone && phone ? phone : undefined,
          board: schoolCity ? `School: ${schoolCity}` : undefined,
          grade: age ? `Age: ${age}` : undefined,
          dob: dob || undefined,
          parentName: parentName.trim() || undefined,
          parentEmail: parentEmail.trim().toLowerCase() || undefined,
          parentPhone: showParentPhone && parentPhone ? parentPhone : undefined,
          privateNote: privateNote.trim() || undefined,
          loginPin: loginPin || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add learner / parent');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setShowPhone(false);
        setAge('');
        setDob('');
        setHobbies('');
        setSchoolCity('');
        setParentName('');
        setParentEmail('');
        setParentPhone('');
        setShowParentPhone(false);
        setPrivateNote('');
        setShowPrivateNote(false);
        setLoginPin(Math.floor(1000 + Math.random() * 9000).toString());
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while adding learner');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161B26] w-full max-w-[500px] max-h-[92vh] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Screenshot 1 */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Add Learner / Parent
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-2 overflow-y-auto space-y-4 no-scrollbar flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Learner / Parent added successfully! Closing...</span>
            </div>
          )}

          {/* Learner Name Field */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              Learner Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Learner Email Field (Optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              Learner Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Learner 4-Digit Login PIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                Learner Login PIN (4 digits)
              </label>
              <button
                type="button"
                onClick={() => setLoginPin(Math.floor(1000 + Math.random() * 9000).toString())}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Generate New PIN
              </button>
            </div>
            <input
              type="text"
              maxLength={4}
              value={loginPin}
              onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 8128"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono font-bold tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Used by the student to log in; will be sent in their welcome email.
            </p>
          </div>

          {/* Phone Field (if expanded) */}
          {showPhone && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Learner Phone
                </label>
                <button
                  type="button"
                  onClick={() => setShowPhone(false)}
                  className="text-[11px] text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
              <PhoneInputWithCountry
                value={phone}
                onChange={(val) => setPhone(val)}
                placeholder="Enter phone number"
              />
            </div>
          )}

          {/* Tags Field (if expanded) */}
          {showTags && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Learner Tags
                </label>
                <button
                  type="button"
                  onClick={() => setShowTags(false)}
                  className="text-[11px] text-gray-400 hover:text-red-500"
                >
                  Close
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="e.g. Grade 8, Science, Mathematics"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-xs font-semibold rounded-lg"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-medium border border-emerald-200 dark:border-emerald-900"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-emerald-800 dark:hover:text-emerald-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons: + Add phone & + Add tags */}
          <div className="flex items-center gap-2 pt-0.5">
            {!showPhone && (
              <button
                type="button"
                onClick={() => setShowPhone(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-gray-500" />
                <span>Add phone</span>
              </button>
            )}

            {!showTags && (
              <button
                type="button"
                onClick={() => setShowTags(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-gray-500" />
                <span>Add tags</span>
              </button>
            )}
          </div>

          {/* Section: LEARNER-FACING DETAILS */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              LEARNER-FACING DETAILS
            </p>

            {/* Accordion 1: Registration details */}
            <div className="border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden bg-white dark:bg-gray-800/40 mb-3 shadow-2xs">
              <div
                onClick={() => setShowRegistration((prev) => !prev)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/80 transition"
              >
                <div className="flex items-start gap-2.5">
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 mt-0.5 transition-transform ${
                      showRegistration ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      Registration details
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Skip to let the learner fill it after they enroll.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRegistration((prev) => !prev);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50"
                >
                  <Edit2 className="w-3 h-3 text-gray-400" />
                  <span>Edit fields</span>
                </button>
              </div>

              {showRegistration && (
                <div className="p-3.5 border-t border-gray-100 dark:border-gray-700/80 space-y-3 bg-gray-50/30 dark:bg-gray-900/30 animate-in fade-in-50">
                  {/* Age */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Age
                    </label>
                    <input
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter age"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Hobbies */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Hobbies
                    </label>
                    <input
                      type="text"
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder="Enter hobbies"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>

                  {/* School Name with City * */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      School Name with City *
                    </label>
                    <input
                      type="text"
                      value={schoolCity}
                      onChange={(e) => setSchoolCity(e.target.value)}
                      placeholder="Enter school name with city"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Parent details matching Screenshot 2 */}
            <div className="border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden bg-white dark:bg-gray-800/40 shadow-2xs">
              <div
                onClick={() => setShowParent((prev) => !prev)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/80 transition"
              >
                <div className="flex items-start gap-2.5">
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 mt-0.5 transition-transform ${
                      showParent ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      Parent details
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Add a parent or guardian for this learner.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowParent(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50"
                >
                  <span>Select Existing</span>
                </button>
              </div>

              {showParent && (
                <div className="p-3.5 border-t border-gray-100 dark:border-gray-700/80 space-y-3 bg-gray-50/30 dark:bg-gray-900/30 animate-in fade-in-50">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Parent name
                    </label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Enter name"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Parent email
                    </label>
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="Enter email"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>

                  {showParentPhone ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                          Parent phone
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowParentPhone(false)}
                          className="text-[10px] text-gray-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                      <PhoneInputWithCountry
                        value={parentPhone}
                        onChange={(val) => setParentPhone(val)}
                        placeholder="Enter phone number"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowParentPhone(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-500" />
                      <span>Add phone</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section: ADMIN ONLY matching Screenshot 2 */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              ADMIN ONLY
            </p>

            <div className="border border-gray-200 dark:border-gray-700/80 rounded-xl p-3 bg-white dark:bg-gray-800/40 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      Private Note
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Admin-only notes. Not visible to the learner or parent.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrivateNote((prev) => !prev)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                >
                  <Plus className={`w-4 h-4 transition-transform ${showPrivateNote ? 'rotate-45' : ''}`} />
                </button>
              </div>

              {showPrivateNote && (
                <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700 animate-in fade-in-50">
                  <textarea
                    rows={3}
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Enter internal administrative notes about this student or family..."
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons matching Screenshot 1 & 2 */}
          <div className="pt-4 pb-2 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95 text-center shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#1A2234] hover:bg-[#121826] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition active:scale-95 text-center shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
