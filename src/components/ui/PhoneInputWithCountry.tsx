'use client';

import React, { useState, useEffect } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { validatePhone } from '@/lib/validation';

export interface PhoneInputWithCountryProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (phone: string, isValid: boolean) => void;
  defaultCountry?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  hint?: string;
}

export function PhoneInputWithCountry({
  id,
  name,
  label,
  value,
  onChange,
  defaultCountry = 'in',
  placeholder = 'Enter phone number',
  required = false,
  disabled = false,
  error: externalError,
  className = '',
  hint,
}: PhoneInputWithCountryProps) {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const handlePhoneChange = (newPhone: string) => {
    // Check validation via libphonenumber-js
    const res = validatePhone(newPhone, { required });
    if (touched) {
      setInternalError(res.isValid ? null : (res.error || 'Invalid phone number'));
    }
    onChange(newPhone, res.isValid);
  };

  const handleBlur = () => {
    setTouched(true);
    const res = validatePhone(value, { required });
    setInternalError(res.isValid ? null : (res.error || 'Invalid phone number'));
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

      <div className="relative phone-input-unified-wrapper">
        <PhoneInput
          defaultCountry={defaultCountry}
          value={value}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          inputProps={{
            id,
            name,
            required,
            className: `w-full !h-10 !text-sm !font-sans !bg-white dark:!bg-[#111113] !text-gray-900 dark:!text-gray-100 !border !rounded-r-lg !transition-all ${
              displayError 
                ? '!border-red-500 focus:!ring-1 focus:!ring-red-500' 
                : '!border-gray-300 dark:!border-neutral-800 focus:!border-blue-500 focus:!ring-1 focus:!ring-blue-500'
            }`,
          }}
          countrySelectorStyleProps={{
            buttonClassName: `!h-10 !px-2.5 !bg-gray-50 dark:!bg-[#141416] !border-y !border-l !rounded-l-lg ${
              displayError 
                ? '!border-red-500' 
                : '!border-gray-300 dark:!border-neutral-800'
            }`,
            dropdownStyleProps: {
              className: '!bg-white dark:!bg-[#0D0D0E] !text-gray-900 dark:!text-gray-100 !border !border-gray-200 dark:!border-neutral-800 !rounded-xl !shadow-xl !max-h-60 !z-50',
              listItemClassName: 'hover:!bg-blue-50 dark:hover:!bg-neutral-800 !text-sm !py-2 !px-3 !transition-colors',
            },
          }}
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
