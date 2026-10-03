'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  User,
  Key,
  Settings as SettingsIcon,
  Pencil,
  Copy,
  RotateCw,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Save,
  Trash2,
} from 'lucide-react';
import { validatePhone } from '@/lib/validation';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';

type SettingsTab = 'profile' | 'pin' | 'preferences';

export default function EducatorSettings() {
  const { data: session, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tagline, setTagline] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Login PIN States
  const [loginPin, setLoginPin] = useState('2880');
  const [pinCopied, setPinCopied] = useState(false);
  const [resettingPin, setResettingPin] = useState(false);

  // Preferences States
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('Asia/Kolkata (GMT +05:30)');
  const [minNotice, setMinNotice] = useState('1 hour');
  const [bufferTime, setBufferTime] = useState('0 mins');
  const [limitFuture, setLimitFuture] = useState('30 days');
  const [restrictAdjacent, setRestrictAdjacent] = useState(false);

  // UI / Feedback States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load educator profile and preferences from DB
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/user/profile');
        if (res.ok) {
          const json = await res.json();
          const u = json.data;
          if (u) {
            setName(u.name || session?.user?.name || '');
            setPhone(u.phone || '');
            setEmail(u.email || session?.user?.email || '');
            setAvatarUrl(u.avatarUrl || session?.user?.image || null);
            if (u.loginPin) setLoginPin(u.loginPin);

            const p = u.profileDetails || {};
            setTagline(u.tagline || p.tagline || '');
            setYoutubeUrl(u.youtubeUrl || p.youtubeUrl || '');
            setAbout(u.about || p.about || '');

            const prefs = u.bookingPreferences || p.bookingPreferences || {};
            if (prefs.minNotice) setMinNotice(prefs.minNotice);
            if (prefs.bufferTime) setBufferTime(prefs.bufferTime);
            if (prefs.limitFuture) setLimitFuture(prefs.limitFuture);
            if (prefs.restrictAdjacent !== undefined) setRestrictAdjacent(Boolean(prefs.restrictAdjacent));
            if (prefs.language) setLanguage(prefs.language);
            if (prefs.timezone) setTimezone(prefs.timezone);
          }
        } else if (session?.user) {
          setName(session.user.name || '');
          setEmail(session.user.email || '');
          setAvatarUrl(session.user.image || null);
        }
      } catch (err) {
        console.error('Error loading educator profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [session]);

  // Handle Save Profile & Preferences
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg(null);

    // Validate phone if provided
    if (phone) {
      const phoneVal = validatePhone(phone);
      if (!phoneVal.isValid) {
        setMsg({ type: 'error', text: phoneVal.error || 'Please enter a valid phone number' });
        setSaving(false);
        return;
      }
    }

    try {
      const payload: Record<string, any> = {
        name,
        phone,
        avatarUrl,
        tagline,
        youtubeUrl,
        about,
        bookingPreferences: {
          minNotice,
          bufferTime,
          limitFuture,
          restrictAdjacent,
          language,
          timezone,
        },
      };

      const res = await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save changes');

      await updateSession({
        name,
        image: avatarUrl,
      });

      setMsg({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image size must be under 2MB' });
      return;
    }

    setUploadingImage(true);
    setMsg(null);

    try {
      const presignedRes = await fetch('/api/v1/uploads/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'avatars',
        }),
      });

      let newUrl = '';

      if (presignedRes.ok) {
        const { data } = await presignedRes.json();
        await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        newUrl = data.publicUrl;
      } else {
        newUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setAvatarUrl(newUrl);

      const patchRes = await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: newUrl }),
      });

      if (patchRes.ok) {
        await updateSession({ image: newUrl });
        setMsg({ type: 'success', text: 'Profile picture updated!' });
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to upload image.' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Remove Avatar
  const handleRemoveAvatar = async () => {
    setUploadingImage(true);
    try {
      setAvatarUrl(null);
      await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });
      await updateSession({ image: null });
      setMsg({ type: 'success', text: 'Profile picture removed.' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to remove picture.' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Copy PIN
  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(loginPin);
      setPinCopied(true);
      setMsg({ type: 'success', text: `PIN ${loginPin} copied to clipboard!` });
      setTimeout(() => {
        setPinCopied(false);
        setMsg(null);
      }, 2500);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to copy PIN.' });
    }
  };

  // Handle Reset PIN
  const handleResetPin = async () => {
    setResettingPin(true);
    setMsg(null);
    try {
      const res = await fetch('/api/v1/user/pin/reset', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reset PIN');

      const newPin = json.data.loginPin;
      setLoginPin(newPin);
      setMsg({ type: 'success', text: `New login PIN generated: ${newPin}` });
      setTimeout(() => setMsg(null), 3500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to reset PIN' });
    } finally {
      setResettingPin(false);
    }
  };

  const pinDigits = (loginPin || '2880').padEnd(4, '0').slice(0, 4).split('');

  const initials = (name || 'Educator')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'ED';

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-8 bg-[#faf8ff] dark:bg-[#080D16]">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
        </div>

        {/* Feedback Alert */}
        {msg && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm transition-all shadow-sm ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Main Settings Card */}
        <div className="bg-white dark:bg-[#121824] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm min-h-[560px] flex flex-col md:flex-row overflow-hidden">
          {/* Left Vertical Navigation */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800/80 p-3 md:p-4 shrink-0 bg-white dark:bg-[#121824]">
            <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {/* Profile Settings Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-blue-50/70 dark:bg-blue-900/20 text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${activeTab === 'profile' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`} />
                <span>Profile Settings</span>
                {activeTab === 'profile' && (
                  <span className="hidden md:block absolute right-0 top-2 bottom-2 w-1 bg-gray-900 dark:bg-blue-500 rounded-l" />
                )}
              </button>

              {/* Login PIN Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('pin')}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                  activeTab === 'pin'
                    ? 'bg-blue-50/70 dark:bg-blue-900/20 text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Key className={`w-4 h-4 shrink-0 ${activeTab === 'pin' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`} />
                <span>Login PIN</span>
                {activeTab === 'pin' && (
                  <span className="hidden md:block absolute right-0 top-2 bottom-2 w-1 bg-gray-900 dark:bg-blue-500 rounded-l" />
                )}
              </button>

              {/* Preferences Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                  activeTab === 'preferences'
                    ? 'bg-blue-50/70 dark:bg-blue-900/20 text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <SettingsIcon className={`w-4 h-4 shrink-0 ${activeTab === 'preferences' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`} />
                <span>Preferences</span>
                {activeTab === 'preferences' && (
                  <span className="hidden md:block absolute right-0 top-2 bottom-2 w-1 bg-gray-900 dark:bg-blue-500 rounded-l" />
                )}
              </button>
            </nav>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-gray-400 gap-2 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                Loading settings...
              </div>
            ) : (
              <>
                {/* 1. Profile Settings */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                    {/* Avatar with Edit Pen Icon */}
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-gray-400 dark:bg-gray-700 text-white font-semibold text-xl flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm overflow-hidden">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-white/90" />
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/png, image/jpeg, image/gif, image/webp"
                          onChange={handleAvatarUpload}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          title="Change Profile Picture"
                          className="absolute bottom-0 right-0 p-1.5 bg-[#1e1b4b] dark:bg-blue-600 text-white rounded-full border-2 border-white dark:border-[#121824] hover:bg-black transition-colors shadow-sm cursor-pointer"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Pencil className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingImage}
                          className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Sumit-Tech-Demo ID"
                          required
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#080D16] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
                        <PhoneInputWithCountry
                          value={phone}
                          onChange={(val) => setPhone(val)}
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email</label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          placeholder="sumitchourasia63@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>

                      {/* Tagline */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tagline</label>
                        <input
                          type="text"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          placeholder="Enter your Tagline"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#080D16] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* Youtube Link */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Youtube Link</label>
                        <input
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="Enter your Youtube Video URL"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#080D16] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* About */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">About</label>
                        <textarea
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          placeholder="Describe yourself"
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#080D16] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex justify-start">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. Login PIN */}
                {activeTab === 'pin' && (
                  <div className="space-y-6 max-w-md">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Current PIN
                      </h3>
                      {/* 4 Digit Boxes */}
                      <div className="flex items-center gap-3">
                        {pinDigits.map((digit, idx) => (
                          <div
                            key={idx}
                            className="w-14 h-16 bg-gray-50/80 dark:bg-[#080D16] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-800 dark:text-gray-100 shadow-xs"
                          >
                            {digit}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors shadow-xs cursor-pointer"
                      >
                        {pinCopied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                        <span>{pinCopied ? 'Copied PIN' : 'Copy PIN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetPin}
                        disabled={resettingPin}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {resettingPin ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                          <RotateCw className="w-4 h-4 text-gray-500" />
                        )}
                        <span>Reset PIN</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Preferences */}
                {activeTab === 'preferences' && (
                  <form onSubmit={handleSave} className="space-y-5 max-w-xl">
                    {/* Language */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Language</label>
                      <CustomSelect
                        value={language}
                        onChange={(val) => setLanguage(val)}
                        options={[
                          { value: 'English', label: 'English' },
                          { value: 'Spanish', label: 'Spanish' },
                          { value: 'French', label: 'French' },
                          { value: 'German', label: 'German' },
                          { value: 'Hindi', label: 'Hindi' },
                          { value: 'Arabic', label: 'Arabic' },
                          { value: 'Mandarin', label: 'Mandarin' },
                        ]}
                      />
                    </div>

                    {/* Your Timezone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Your Timezone</label>
                      <CustomSelect
                        value={timezone}
                        onChange={(val) => setTimezone(val)}
                        options={[
                          { value: 'Asia/Kolkata (GMT +05:30)', label: 'Asia/Kolkata (GMT +05:30)' },
                          { value: 'UTC (GMT +00:00)', label: 'UTC (GMT +00:00)' },
                          { value: 'America/New_York (GMT -05:00)', label: 'America/New_York (GMT -05:00)' },
                          { value: 'America/Los_Angeles (GMT -08:00)', label: 'America/Los_Angeles (GMT -08:00)' },
                          { value: 'America/Chicago (GMT -06:00)', label: 'America/Chicago (GMT -06:00)' },
                          { value: 'Europe/London (GMT +00:00)', label: 'Europe/London (GMT +00:00)' },
                          { value: 'Europe/Paris (GMT +01:00)', label: 'Europe/Paris (GMT +01:00)' },
                          { value: 'Asia/Dubai (GMT +04:00)', label: 'Asia/Dubai (GMT +04:00)' },
                          { value: 'Asia/Singapore (GMT +08:00)', label: 'Asia/Singapore (GMT +08:00)' },
                          { value: 'Asia/Tokyo (GMT +09:00)', label: 'Asia/Tokyo (GMT +09:00)' },
                          { value: 'Australia/Sydney (GMT +11:00)', label: 'Australia/Sydney (GMT +11:00)' },
                        ]}
                      />
                    </div>

                    {/* Minimum Notice for Session Booking */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Minimum Notice for Session Booking
                      </label>
                      <CustomSelect
                        value={minNotice}
                        onChange={(val) => setMinNotice(val)}
                        options={[
                          { value: '15 mins', label: '15 mins' },
                          { value: '30 mins', label: '30 mins' },
                          { value: '1 hour', label: '1 hour' },
                          { value: '2 hours', label: '2 hours' },
                          { value: '4 hours', label: '4 hours' },
                          { value: '24 hours', label: '24 hours' },
                          { value: '48 hours', label: '48 hours' },
                        ]}
                      />
                    </div>

                    {/* Buffer Time Between Session Bookings */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Buffer Time Between Session Bookings
                      </label>
                      <CustomSelect
                        value={bufferTime}
                        onChange={(val) => setBufferTime(val)}
                        options={[
                          { value: '0 mins', label: '0 mins' },
                          { value: '5 mins', label: '5 mins' },
                          { value: '10 mins', label: '10 mins' },
                          { value: '15 mins', label: '15 mins' },
                          { value: '30 mins', label: '30 mins' },
                          { value: '45 mins', label: '45 mins' },
                          { value: '60 mins', label: '60 mins' },
                        ]}
                      />
                    </div>

                    {/* Limit future bookings */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Limit future bookings
                      </label>
                      <CustomSelect
                        value={limitFuture}
                        onChange={(val) => setLimitFuture(val)}
                        options={[
                          { value: '7 days', label: '7 days' },
                          { value: '14 days', label: '14 days' },
                          { value: '30 days', label: '30 days' },
                          { value: '60 days', label: '60 days' },
                          { value: '90 days', label: '90 days' },
                          { value: '180 days', label: '180 days' },
                          { value: '365 days', label: '365 days' },
                        ]}
                      />
                    </div>

                    {/* Restrict Bookings to Adjacent Slots */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Restrict Bookings to Adjacent Slots
                      </span>
                      <button
                        type="button"
                        onClick={() => setRestrictAdjacent(!restrictAdjacent)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          restrictAdjacent ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        role="switch"
                        aria-checked={restrictAdjacent}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            restrictAdjacent ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex justify-start">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
