'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { 
  Lock, 
  Mail, 
  User, 
  Phone,
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Users,
  Shield,
  Loader2
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { validateEmail, validatePhone } from '@/lib/validation';

type UserRole = 'learner' | 'educator' | 'parent' | 'admin';

const ROLES: { id: UserRole; title: string; desc: string; icon: React.ComponentType<any> }[] = [
  { id: 'learner', title: 'Student', desc: 'Access courses & live sessions', icon: GraduationCap },
  { id: 'educator', title: 'Educator', desc: 'Teach & manage schedule', icon: BookOpen },
  { id: 'parent', title: 'Parent', desc: 'Track child progress & reports', icon: Users },
  { id: 'admin', title: 'Admin', desc: 'Full organization management', icon: Shield },
];

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [role, setRole] = useState<UserRole>('learner');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Email validation using library
    const emailValidation = validateEmail(email, { fieldName: 'Email' });
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please enter a valid email');
      return;
    }

    // Phone validation using library if entered
    if (phone.trim()) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        setError(phoneValidation.error || 'Please enter a valid phone number');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create account');
      }

      setSuccess(true);

      // Auto sign-in after registration
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.ok) {
        const roleHome = getRoleHome(role);
        router.push(roleHome);
        router.refresh();
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
      setLoading(false);
    }
  };

  const getRoleHome = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return '/admin/dashboard';
      case 'educator':
        return '/educator/calendar';
      case 'parent':
        return '/parent/dashboard';
      case 'learner':
      default:
        return '/student/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] dark:bg-[#080D16] flex flex-col justify-between transition-colors duration-200 relative overflow-hidden font-sans">
      
      {/* Background Glow */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-end z-10">
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-lg bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl relative transition-all">
          
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-5">
              <BrandLogo size="lg" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Create Your Account
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select your role and get started with UnboundYou
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Account created successfully! Redirecting...</span>
            </div>
          )}

          {/* Role Selector Grid */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">
              Select Account Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const selected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      selected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#080D16]/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`p-2 rounded-md ${selected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {r.title}
                      </div>
                      <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#080D16] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#080D16] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#080D16] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Phone Number (Optional)
              </label>
              <PhoneInputWithCountry
                value={phone}
                onChange={(p, valid) => {
                  setPhone(p);
                  setIsPhoneValid(valid);
                }}
                defaultCountry="in"
                placeholder="Enter mobile number"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Register {ROLES.find(r => r.id === role)?.title} Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Navigation Link */}
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 dark:text-gray-600 font-medium">
        &copy; {new Date().getFullYear()} UnboundYou. All rights reserved.
      </footer>
    </div>
  );
}
