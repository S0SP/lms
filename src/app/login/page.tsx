'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  BookOpen,
  Users,
  Shield,
  Check,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { validateEmail } from '@/lib/validation';

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student@unboundyou.com', pin: '1234', path: '/student/dashboard', icon: GraduationCap },
  { role: 'Educator', email: 'educator@unboundyou.com', path: '/educator/calendar', icon: BookOpen },
  { role: 'Parent', email: 'parent@unboundyou.com', path: '/parent/dashboard', icon: Users },
  { role: 'Admin', email: 'admin@unboundyou.com', path: '/admin/dashboard', icon: Shield },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const urlError = searchParams.get('error');

  const [view, setView] = useState<'main' | 'email'>('main');
  const [email, setEmail] = useState('');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendingPin, setResendingPin] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemoPortals, setShowDemoPortals] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);
  const [demoSuccessRole, setDemoSuccessRole] = useState<string | null>(null);

  // Check URL error parameter on mount
  useEffect(() => {
    if (urlError === 'NotWhitelisted') {
      setError('Access restricted: Your Google email is not whitelisted. Please contact your UnboundYou administrator to get access.');
    } else if (urlError === 'OAuthSignin' || urlError === 'OAuthCallback') {
      setError('Could not complete Google Sign-In. Please try again.');
    } else if (urlError === 'AccessDenied') {
      setError('Access was denied for this account. Please verify with administration.');
    }
  }, [urlError]);

  const fullPin = pinDigits.join('');
  const isPinComplete = fullPin.length === 4;

  // Handle single digit input
  const handlePinChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const updated = [...pinDigits];
      updated[index] = '';
      setPinDigits(updated);
      return;
    }

    const lastChar = clean.slice(-1);
    const updated = [...pinDigits];
    updated[index] = lastChar;
    setPinDigits(updated);

    if (index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste of 4-digit PIN
  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const digits = pasted.split('');
    const updated = ['', '', '', ''];
    digits.forEach((d, i) => {
      if (i < 4) updated[i] = d;
    });
    setPinDigits(updated);

    const nextIndex = Math.min(digits.length, 3);
    pinRefs.current[nextIndex]?.focus();
  };

  // Handle Email + PIN Login
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(null);

    const emailCheck = validateEmail(email, { fieldName: 'Email' });
    if (!emailCheck.isValid) {
      setError(emailCheck.error || 'Please enter a valid email address');
      return;
    }

    if (!isPinComplete) {
      setError('Please enter all 4 digits of your PIN');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password: fullPin,
        pin: fullPin,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or PIN. Please check your 4-digit PIN or request a new code below.');
        setLoading(false);
      } else {
        router.push(callbackUrl || '/student/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Handle Resend PIN / Request Code
  const handleResendPin = async () => {
    setError(null);
    setResendSuccess(null);

    const emailCheck = validateEmail(email, { fieldName: 'Email' });
    if (!emailCheck.isValid) {
      setError('Please enter your email above before requesting a PIN');
      return;
    }

    setResendingPin(true);

    try {
      const res = await fetch('/api/v1/auth/resend-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend PIN');
      }

      setResendSuccess(data.message || 'Your login PIN has been emailed to you.');
    } catch (err: any) {
      setError(err.message || 'Failed to send PIN. Please try again.');
    } finally {
      setResendingPin(false);
    }
  };

  // Google SSO Handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: callbackUrl || undefined });
    } catch {
      setError('Failed to initiate Google sign-in.');
      setGoogleLoading(false);
    }
  };

  // Handle Demo One-Click Login
  const handleDemoLogin = async (demoEmail: string, targetPath: string, roleName: string, demoPin?: string) => {
    setDemoLoadingRole(roleName);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email: demoEmail,
        password: demoPin || 'demopassword123',
        pin: demoPin || '1234',
        redirect: false,
      });

      if (res?.error) {
        setError(`Failed to sign in as ${roleName}.`);
        setDemoLoadingRole(null);
      } else {
        setDemoSuccessRole(roleName);
        setTimeout(() => {
          router.push(targetPath);
          router.refresh();
        }, 500);
      }
    } catch {
      setError('Failed to log into demo portal.');
      setDemoLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D16] flex flex-col justify-between transition-colors duration-200 relative overflow-hidden font-sans select-none">
      
      {/* ─── Ambient Vector Graphics (Matches Screenshot Background) ───────── */}
      {/* Globe Wireframe Background Graphic */}
      <div className="absolute -top-12 right-1/2 translate-x-1/2 md:translate-x-0 md:right-1/4 w-[360px] h-[360px] opacity-25 dark:opacity-10 pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-slate-600 w-full h-full">
          <circle cx="100" cy="100" r="90" strokeWidth="1.2" />
          <path d="M10 100h180M100 10v180" strokeWidth="1.2" />
          <ellipse cx="100" cy="100" rx="45" ry="90" strokeWidth="1.2" />
          <ellipse cx="100" cy="100" rx="90" ry="45" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Subtle Arc / Spark Background Elements */}
      <div className="absolute bottom-4 right-1/4 w-[280px] h-[280px] opacity-20 dark:opacity-10 pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-slate-600 w-full h-full">
          <circle cx="100" cy="100" r="80" strokeWidth="16" />
        </svg>
      </div>
      <div className="absolute top-1/3 right-1/6 text-slate-400 dark:text-slate-700 opacity-40 text-2xl font-light pointer-events-none">
        +
      </div>
      <div className="absolute top-20 right-1/4 text-slate-400 dark:text-slate-700 opacity-40 text-xl font-light pointer-events-none">
        ✳
      </div>

      {/* Header with Theme Toggle */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-end z-20">
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-[420px] bg-white dark:bg-[#161B26] border border-gray-100 dark:border-gray-800 rounded-2xl p-8 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] relative transition-all">
          
          {/* Error Message Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {resendSuccess && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{resendSuccess}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              VIEW 1: Main Login (Screenshot 2: input_file_1.png)
              ══════════════════════════════════════════════════════════════════════ */}
          {view === 'main' ? (
            <div className="animate-in fade-in duration-150">
              {/* UnboundYou Brand Logo Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 relative flex items-center justify-center">
                  <Image
                    src="/logos/logo_icon.png"
                    alt="UnboundYou"
                    width={56}
                    height={56}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight mb-8">
                Login
              </h1>

              {/* Google SSO Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E2535] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Google</span>
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                  Or
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              {/* Continue with Email Button */}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('email');
                }}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E2535] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer"
              >
                <Mail className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <span>Continue with Email</span>
              </button>

              {/* Footer: Create Account */}
              <div className="mt-8 text-center text-xs text-gray-600 dark:text-gray-400">
                Are you a new user?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-gray-900 dark:text-white hover:underline"
                >
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════
               VIEW 2: Login with Email & PIN (Screenshot 1: input_file_0.png)
               ══════════════════════════════════════════════════════════════════════ */
            <div className="animate-in fade-in duration-150">
              {/* Back to main button */}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResendSuccess(null);
                  setView('main');
                }}
                className="flex items-center gap-2.5 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-7 group cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="text-xl font-bold tracking-tight">Login with Email</span>
              </button>

              <form onSubmit={handlePinLogin} className="space-y-5">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-blue-100 dark:border-gray-700 bg-[#EEF4FD] dark:bg-[#1C2333] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Enter 4-digit PIN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Enter PIN
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          pinRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={pinDigits[idx]}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(idx, e)}
                        onPaste={handlePinPaste}
                        className="w-full h-14 text-center text-2xl font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#121620] text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
                      />
                    ))}
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading || !isPinComplete || !email}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                    isPinComplete && email
                      ? 'bg-[#707B8C] hover:bg-[#5C6675] text-white active:scale-[0.99]'
                      : 'bg-[#98A2B3] text-white/90 cursor-not-allowed'
                  }`}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Login</span>
                </button>

                {/* Forgot PIN / Resend PIN */}
                <div className="pt-2 text-center text-xs text-gray-600 dark:text-gray-400">
                  Forgot PIN?{' '}
                  <button
                    type="button"
                    onClick={handleResendPin}
                    disabled={resendingPin}
                    className="font-medium text-gray-900 dark:text-gray-200 underline hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer disabled:opacity-50"
                  >
                    {resendingPin ? 'Sending PIN...' : 'Resend PIN / Request Code'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── Demo Portals Quick Switcher (For Development & QA) ──────── */}
          <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowDemoPortals(!showDemoPortals)}
              className="w-full text-center text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Quick Demo Portals</span>
              <span>{showDemoPortals ? '▴' : '▾'}</span>
            </button>

            {showDemoPortals && (
              <div className="grid grid-cols-2 gap-2 mt-3 animate-in fade-in">
                {DEMO_ACCOUNTS.map((demo) => {
                  const RoleIcon = demo.icon;
                  const isThisLoading = demoLoadingRole === demo.role;
                  const isThisSuccess = demoSuccessRole === demo.role;
                  return (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => handleDemoLogin(demo.email, demo.path, demo.role, demo.pin)}
                      disabled={loading || !!demoLoadingRole || !!demoSuccessRole}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isThisSuccess
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#121620] hover:border-blue-500/40 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold">{demo.role}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {demo.pin ? `PIN: ${demo.pin}` : 'Google / Direct'}
                        </p>
                      </div>
                      {isThisLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0 ml-1" />}
                      {isThisSuccess && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 dark:text-gray-600 font-normal z-10">
        &copy; {new Date().getFullYear()} UnboundYou. All rights reserved.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#080D16]">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
