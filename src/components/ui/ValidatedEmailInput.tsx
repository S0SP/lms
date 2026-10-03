'use client';

import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { validateEmail } from '@/lib/validation';

export interface ValidatedEmailInputProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (email: string, isValid: boolean) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  requireGmail?: boolean;
  error?: string;
  className?: string;
  hint?: string;
}

export function ValidatedEmailInput({
  id,
  name,
  label = 'Email Address',
  value,
  onChange,
  placeholder = 'name@gmail.com',
  required = true,
  disabled = false,
  requireGmail = false,
  error: externalError,
  className = '',
  hint,
}: ValidatedEmailInputProps) {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const res = validateEmail(val, { requireGmail, fieldName: label });
    if (touched) {
      setInternalError(res.isValid ? null : (res.error || 'Invalid email address'));
    }
    onChange(val, res.isValid);
  };

  const handleBlur = () => {
    setTouched(true);
    const res = validateEmail(value, { requireGmail, fieldName: label });
    setInternalError(res.isValid ? null : (res.error || 'Invalid email address'));
  };

  const displayError = externalError || internalError;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
          displayError ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
        }`} />
        <input
          id={id}
          name={name}
          type="email"
          value={value}
          onChange={handleEmailChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#111113] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none transition-all ${
            displayError 
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
              : 'border-gray-300 dark:border-neutral-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
          }`}
        />
      </div>

      {displayError ? (
        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
          <span>⚠</span> {displayError}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
