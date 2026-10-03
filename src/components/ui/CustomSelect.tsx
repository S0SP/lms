'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: string | boolean;
  name?: string;
  id?: string;
  align?: 'left' | 'right';
  width?: string;
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  size = 'md',
  error,
  name,
  id: customId,
  align = 'left',
  width,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const id = customId || autoId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            const opt = options[highlightedIndex];
            if (!opt.disabled) {
              onChange(opt.value);
              setIsOpen(false);
            }
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) => {
            const next = prev < options.length - 1 ? prev + 1 : 0;
            return options[next].disabled ? (next < options.length - 1 ? next + 1 : 0) : next;
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(options.length - 1);
        } else {
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1;
            return options[next].disabled ? (next > 0 ? next - 1 : options.length - 1) : next;
          });
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  };

  // Keep highlighted item in view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && menuRef.current) {
      const activeEl = menuRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Sync highlighted index when opened
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, options, value]);

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg min-h-[32px]',
    md: 'px-3.5 py-2.5 text-xs rounded-xl min-h-[40px]',
    lg: 'px-4 py-3 text-sm rounded-xl min-h-[46px]',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${width ? width : 'w-full'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Hidden input for HTML form submission */}
      {name && <input type="hidden" name={name} value={String(value)} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`group w-full flex items-center justify-between gap-2.5 font-medium transition-all duration-200 border cursor-pointer select-none text-left active:scale-[0.99] ${
          sizeStyles[size]
        } ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-[#111722]'
            : 'border-gray-200 dark:border-gray-700/80 bg-white dark:bg-[#111722] hover:border-gray-300 dark:hover:border-gray-600'
        } ${
          error
            ? 'border-red-500 ring-2 ring-red-500/20'
            : ''
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            : 'shadow-2xs'
        } ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-gray-500 dark:text-gray-400">
              {selectedOption.icon}
            </span>
          )}
          <span
            className={`truncate font-semibold ${
              selectedOption
                ? 'text-gray-950 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.subLabel && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
              {selectedOption.subLabel}
            </span>
          )}
        </span>

        {/* Chevron with Button-in-Button micro wrapper */}
        <span
          className={`w-5 h-5 rounded-md flex items-center justify-center text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 ${
            isOpen ? 'rotate-180 text-blue-500 dark:text-blue-400' : ''
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-opt-${highlightedIndex}` : undefined
          }
          className={`absolute mt-1.5 min-w-full max-h-64 overflow-y-auto rounded-xl p-1.5 z-50 bg-white/95 dark:bg-[#151C28]/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-700/80 shadow-2xl focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
          style={{
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={String(option.value)}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors duration-150 ${
                  option.disabled
                    ? 'opacity-40 cursor-not-allowed text-gray-400'
                    : isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                    : isHighlighted
                    ? 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-950 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && (
                    <span className="shrink-0 text-gray-400 dark:text-gray-400">
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                  {option.subLabel && (
                    <span className="text-[10px] text-gray-400 font-normal">
                      {option.subLabel}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
