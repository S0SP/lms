'use client';

import React, { useState, forwardRef } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FeedbackButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Explicit status override ('idle' | 'loading' | 'success' | 'error') */
  status?: ButtonStatus;
  /** Boolean shortcuts */
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  /** Content to display in each state */
  loadingText?: React.ReactNode;
  successText?: React.ReactNode;
  errorText?: React.ReactNode;
  /** Optional icon to prepend in idle state */
  icon?: React.ReactNode;
  /** Custom success icon (defaults to Check) */
  successIcon?: React.ReactNode;
  /** Variant style */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'emerald';
  /** How long to show success state before resetting when using async onClick (ms) */
  successDuration?: number;
}

export const FeedbackButton = forwardRef<HTMLButtonElement, FeedbackButtonProps>(
  (
    {
      children,
      status: explicitStatus,
      loading = false,
      success = false,
      error = false,
      loadingText,
      successText = 'Done',
      errorText = 'Failed',
      icon,
      successIcon = <Check className="w-4 h-4 text-emerald-100 stroke-[2.5] animate-confirm-pop" />,
      variant = 'primary',
      className,
      disabled,
      onClick,
      successDuration = 1800,
      ...props
    },
    ref
  ) => {
    const [internalStatus, setInternalStatus] = useState<ButtonStatus>('idle');

    // Resolved status prioritizes explicit props, then internal state
    let currentStatus: ButtonStatus = internalStatus;
    if (explicitStatus) {
      currentStatus = explicitStatus;
    } else if (error) {
      currentStatus = 'error';
    } else if (success) {
      currentStatus = 'success';
    } else if (loading) {
      currentStatus = 'loading';
    }

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (currentStatus === 'loading' || currentStatus === 'success') {
        e.preventDefault();
        return;
      }

      if (onClick) {
        try {
          const result = onClick(e) as unknown;
          // If the onClick returns a promise, automatically manage state transitions
          if (result && typeof (result as Promise<any>).then === 'function') {
            setInternalStatus('loading');
            await (result as Promise<any>);
            setInternalStatus('success');
            setTimeout(() => {
              setInternalStatus('idle');
            }, successDuration);
          }
        } catch (err) {
          setInternalStatus('error');
          setTimeout(() => {
            setInternalStatus('idle');
          }, 2400);
        }
      }
    };

    const variantStyles: Record<string, string> = {
      primary:
        'bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-transparent',
      secondary:
        'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-700',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-transparent',
      ghost:
        'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      outline:
        'border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200',
      emerald:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent',
    };

    const statusStyles: Record<ButtonStatus, string> = {
      idle: '',
      loading: 'cursor-wait opacity-90',
      success:
        'bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-600 border-emerald-600 text-white shadow-md animate-confirm-pop',
      error:
        'bg-red-600 hover:bg-red-600 dark:bg-red-600 border-red-600 text-white shadow-md',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || currentStatus === 'loading'}
        onClick={handleClick}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all duration-200 select-none outline-none cursor-pointer',
          'active:scale-[0.96] active:translate-y-px',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant] || variantStyles.primary,
          statusStyles[currentStatus],
          className
        )}
        {...props}
      >
        {currentStatus === 'loading' && (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </span>
        )}

        {currentStatus === 'success' && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-white animate-confirm-pop">
            {successIcon}
            <span>{successText}</span>
          </span>
        )}

        {currentStatus === 'error' && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-100" />
            <span>{errorText}</span>
          </span>
        )}

        {currentStatus === 'idle' && (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

FeedbackButton.displayName = 'FeedbackButton';

/**
 * Lightweight hook to manage 3-state transitions for any button or form.
 */
export function useButtonFeedback(initialStatus: ButtonStatus = 'idle') {
  const [status, setStatus] = useState<ButtonStatus>(initialStatus);

  const startLoading = () => setStatus('loading');
  const setSuccess = (durationMs = 2000, onComplete?: () => void) => {
    setStatus('success');
    if (durationMs > 0) {
      setTimeout(() => {
        setStatus('idle');
        onComplete?.();
      }, durationMs);
    }
  };
  const setError = (durationMs = 2500) => {
    setStatus('error');
    if (durationMs > 0) {
      setTimeout(() => setStatus('idle'), durationMs);
    }
  };
  const reset = () => setStatus('idle');

  return {
    status,
    setStatus,
    startLoading,
    setSuccess,
    setError,
    reset,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}
