'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  ChevronDown,
} from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { validateEmail, validatePhone } from '@/lib/validation';

export interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR' },
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'AED', symbol: 'د.إ', label: 'AED' },
];

export function AddAdminModal({ isOpen, onClose, onSuccess }: AddAdminModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhone, setShowPhone] = useState(false);

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);

  const [showPayout, setShowPayout] = useState(false);
  const [payoutRate, setPayoutRate] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

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
      setError('Name is required');
      return;
    }

    const emailVal = validateEmail(email, { required: true });
    if (!emailVal.isValid) {
      setError(emailVal.error || 'Please enter a valid admin email address');
      return;
    }

    if (showPhone && phone) {
      const phoneVal = validatePhone(phone, { required: false });
      if (!phoneVal.isValid) {
        setError(phoneVal.error || 'Please enter a valid phone number');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: showPhone && phone ? phone : undefined,
          tags: tags.length > 0 ? tags : undefined,
          payoutDefaultRate: showPayout && payoutRate ? parseFloat(payoutRate) || 0 : undefined,
          payoutCurrency: showPayout ? selectedCurrency.code : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add admin');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setName('');
        setEmail('');
        setPhone('');
        setShowPhone(false);
        setTags([]);
        setShowTags(false);
        setPayoutRate('');
        setShowPayout(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while adding admin');
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
        className="bg-white dark:bg-[#161B26] w-full max-w-[480px] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Screenshot 5 */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Add Admin
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-3 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Admin added successfully! Closing...</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              Name *
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

          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Phone Field (if expanded) */}
          {showPhone ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Phone number
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
          ) : null}

          {/* Tags Field (if expanded) */}
          {showTags && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Admin Tags
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
                  placeholder="e.g. Operations, Lead, Academic Head"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-md text-xs font-medium border border-purple-200 dark:border-purple-900"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-purple-800 dark:hover:text-purple-200"
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

          {/* An invite will be sent subtext */}
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
            An invite will be sent over email or Whatsapp to the admin
          </p>

          {/* Payout Details Section matching Screenshot 5 */}
          {!showPayout ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPayout(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-gray-500" />
                <span>Add Payout Details</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-1 animate-in fade-in-50">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                    Payout Amount per Session Credit
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPayout(false)}
                    className="text-[11px] text-gray-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-2xs focus-within:border-blue-500">
                  <span className="pl-3.5 pr-1 text-sm font-semibold text-gray-500 select-none">
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payoutRate}
                    onChange={(e) => setPayoutRate(e.target.value)}
                    placeholder="Amount"
                    className="w-full py-2.5 px-2 bg-transparent text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                  />

                  {/* Currency Picker Dropdown */}
                  <div className="w-24 shrink-0 border-l border-gray-200 dark:border-gray-700">
                    <CustomSelect
                      value={selectedCurrency.code}
                      onChange={(val) => {
                        const found = CURRENCIES.find((c) => c.code === val);
                        if (found) setSelectedCurrency(found);
                      }}
                      options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700/80 rounded-xl p-3 bg-gray-50/70 dark:bg-gray-900/40 flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                <p>
                  Admin will be allocated {selectedCurrency.symbol} for management credits
                </p>
              </div>
            </div>
          )}

          {/* Footer Buttons matching Screenshot 5 */}
          <div className="pt-4 flex items-center gap-3">
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
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#64748B] hover:bg-[#475569] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition active:scale-95 text-center shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Add Admin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
