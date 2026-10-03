'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  User,
  Link as LinkIcon,
  Bell,
  Shield,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { validateEmail, validatePhone } from '@/lib/validation';

/** Portal a settings workspace is being rendered for. */
export type SettingsRole = 'student' | 'parent' | 'educator' | 'admin';

/** Minimal profile shape seeded from the server so there is no empty first paint. */
export interface SettingsProfile {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

/**
 * A learner that is genuinely linked to a parent, resolved server-side.
 * Read-only: there is no endpoint that lets a parent create or delete a link.
 */
export interface LinkedChild {
  /** parent_profiles.id */
  linkId: string;
  /** users.id of the learner */
  learnerId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  relationship: string | null;
  grade: string | null;
  board: string | null;
}

interface SettingsWorkspaceClientProps {
  role: SettingsRole;
  /** Server-rendered profile. Omitted for roles that hydrate from the API. */
  initialProfile?: SettingsProfile | null;
  /** Server-resolved children. Only meaningful when role === 'parent'. */
  linkedChildren?: LinkedChild[];
}

type TabId = 'profile' | 'parent' | 'linked' | 'notifications' | 'security';

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
  description: string;
}

const initialsOf = (value: string | null | undefined, fallback: string) => {
  const letters = (value || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  return letters || fallback;
};

export function SettingsWorkspaceClient({ role, initialProfile, linkedChildren }: SettingsWorkspaceClientProps) {
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile Form state
  const [firstName, setFirstName] = useState(() => (initialProfile?.name || '').split(' ')[0] || '');
  const [lastName, setLastName] = useState(() => (initialProfile?.name || '').split(' ').slice(1).join(' '));
  const [email, setEmail] = useState(initialProfile?.email || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile?.avatarUrl || null);

  // UI Feedback & Loading states
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Parent Linking state (learner direction only)
  const [linkedParents, setLinkedParents] = useState<any[]>([]);
  const [parentEmail, setParentEmail] = useState('');
  const [parentRelationship, setParentRelationship] = useState('parent');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [parentMsg, setParentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState({
    courseAnnouncements: true,
    sessionReminders: true,
    directMessages: false,
    browserPush: false,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * /api/v1/user/parent-linking is learner-direction only: GET filters on
   * parent_profiles.learner_id = session id and POST inserts a row whose
   * learner_id is the caller. Both are wrong for a parent, so the linking
   * section is only ever rendered for role === 'student'. A parent receives
   * their real children as the `linkedChildren` prop instead.
   */
  const isLearner = role === 'student';
  const isParent = role === 'parent';

  const children = useMemo(() => (isParent ? linkedChildren ?? [] : []), [isParent, linkedChildren]);

  const tabs = useMemo<TabDef[]>(() => {
    const list: TabDef[] = [
      {
        id: 'profile',
        label: isLearner ? 'Learner Profile' : 'My Profile',
        icon: User,
        description: 'Manage your personal information',
      },
    ];

    if (isLearner) {
      list.push({
        id: 'parent',
        label: 'Parent Linking',
        icon: LinkIcon,
        description: 'Connect with your parent or guardian',
      });
    }

    if (isParent) {
      list.push({
        id: 'linked',
        label: 'Linked Learners',
        icon: LinkIcon,
        description: 'Children linked to your account',
      });
    }

    list.push(
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        description: 'Configure email and push alerts',
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
        description: 'Password and authentication',
      }
    );

    return list;
  }, [isLearner, isParent]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && tabs.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, tabs]);

  // Load User Data & Parent Data
  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        // Load Profile
        const res = await fetch('/api/v1/user/profile');
        if (res.ok) {
          const json = await res.json();
          const u = json.data;
          if (u) {
            const nameParts = (u.name || '').split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
            setEmail(u.email || session?.user?.email || '');
            setPhone(u.phone || '');
            setAvatarUrl(u.avatarUrl || null);
          }
        } else if (session?.user) {
          const nameParts = (session.user.name || '').split(' ');
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
          setEmail(session.user.email || '');
          setAvatarUrl(session.user.image || null);
        }

        // Load Linked Parents (learner direction only)
        if (isLearner) {
          const parentRes = await fetch('/api/v1/user/parent-linking');
          if (parentRes.ok) {
            const parentJson = await parentRes.json();
            setLinkedParents(parentJson.data || []);
          }
        }

        // Load Notifications
        const notifRes = await fetch('/api/v1/user/notifications');
        if (notifRes.ok) {
          const notifJson = await notifRes.json();
          setNotifications(notifJson.data || notifications);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [session, isLearner]);

  // Initials computation
  const userFullName = `${firstName} ${lastName}`.trim() || session?.user?.name || '';
  const initials = initialsOf(userFullName, 'US');

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    const fullName = `${firstName} ${lastName}`.trim();

    // Validate phone number if provided
    if (phone) {
      const phoneVal = validatePhone(phone);
      if (!phoneVal.isValid) {
        setProfileMsg({ type: 'error', text: phoneVal.error || 'Please enter a valid phone number' });
        setSavingProfile(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          phone,
          avatarUrl,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update profile');
      }

      await updateSession({
        name: fullName,
        image: avatarUrl,
      });

      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Avatar File Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'File size must be under 2MB' });
      return;
    }

    setUploadingImage(true);
    setProfileMsg(null);

    try {
      // 1. Request presigned URL or use base64 data URL
      const presignedRes = await fetch('/api/v1/uploads/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'avatars',
        }),
      });

      let newAvatarUrl = '';

      if (presignedRes.ok) {
        const { data } = await presignedRes.json();
        const uploadUrl = data.uploadUrl;
        newAvatarUrl = data.publicUrl;

        // Upload to S3 / Cloudflare R2
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
      } else {
        // Fallback to base64 Data URL if R2 storage isn't configured
        newAvatarUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setAvatarUrl(newAvatarUrl);

      // Save directly to profile
      const patchRes = await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: newAvatarUrl }),
      });

      if (patchRes.ok) {
        await updateSession({ image: newAvatarUrl });
        setProfileMsg({ type: 'success', text: 'Profile picture updated!' });
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setProfileMsg({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Remove Avatar
  const handleRemoveAvatar = async () => {
    setUploadingImage(true);
    setProfileMsg(null);
    try {
      setAvatarUrl(null);
      await fetch('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });
      await updateSession({ image: null });
      setProfileMsg({ type: 'success', text: 'Profile picture removed.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to remove picture.' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Parent Invite
  const handleSendParentInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentEmail) return;

    const emailVal = validateEmail(parentEmail, { required: true });
    if (!emailVal.isValid) {
      setParentMsg({ type: 'error', text: emailVal.error || 'Please enter a valid parent email address' });
      return;
    }

    setSendingInvite(true);
    setParentMsg(null);

    try {
      const res = await fetch('/api/v1/user/parent-linking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parentEmail, relationship: parentRelationship }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send invite');

      setLinkedParents((prev) => [...prev, json.data]);
      setParentEmail('');
      setParentMsg({ type: 'success', text: `Invitation sent to ${parentEmail}!` });
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 2200);
    } catch (err: any) {
      setParentMsg({ type: 'error', text: err.message || 'Failed to send invitation' });
    } finally {
      setSendingInvite(false);
    }
  };

  // Handle Notification Toggle
  const handleNotifToggle = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setSavingNotifs(true);

    try {
      await fetch('/api/v1/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to save notification preferences', err);
    } finally {
      setSavingNotifs(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setUpdatingPassword(true);

    try {
      const res = await fetch('/api/v1/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update password');

      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2200);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-6xl mx-auto">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg transition-all text-left whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500/50 ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-[#1E2535] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161B26]/50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {tabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-8 max-w-2xl">
                {profileMsg && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300 border border-green-200 dark:border-green-500/20' : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300 border border-red-200 dark:border-red-500/20'}`}>
                    {profileMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                  <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-700 overflow-hidden relative group shrink-0 bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={userFullName || 'Profile picture'} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                    
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Profile Picture</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">JPG, GIF or PNG. 2MB max.</p>
                    <div className="flex gap-2">
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
                        className="px-4 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        Upload new
                      </button>
                      {avatarUrl && (
                        <button 
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingImage}
                          className="px-4 py-2 text-red-600 dark:text-red-400 text-sm font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="firstName">First Name</label>
                    <input 
                      type="text" 
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="lastName">Last Name</label>
                    <input 
                      type="text" 
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="email">Email Address</label>
                    <input 
                      type="email" 
                      id="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#080D16] border border-gray-200 dark:border-gray-800 rounded-md text-gray-500 dark:text-gray-500 text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Email address cannot be changed directly. Contact support for assistance.</p>
                  </div>
                  <div className="md:col-span-2">
                    <PhoneInputWithCountry
                      label="Phone Number"
                      value={phone}
                      onChange={setPhone}
                      placeholder="Add a contact number"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <FeedbackButton 
                    type="submit"
                    loading={savingProfile}
                    success={profileSaved}
                    loadingText="Saving Changes..."
                    successText="Changes Saved ✓"
                    className="px-5 py-2.5 font-medium"
                  >
                    Save Changes
                  </FeedbackButton>
                </div>
              </form>
            )}

            {/* Parent Linking Tab (learners only) */}
            {activeTab === 'parent' && isLearner && (
              <div className="space-y-8 max-w-2xl">
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-4 flex gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Why link a parent?</h3>
                    <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mt-1">Linking a parent allows them to view your progress reports, pay for course fees and add credits, and receive important updates from educators. They cannot take assessments on your behalf.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Linked Parents</h3>
                  {linkedParents.length > 0 ? (
                    <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                      {linkedParents.map((parent) => (
                        <div key={parent.id} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                              {initialsOf(parent.name, 'P')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{parent.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{parent.email}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                            Active
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-[#161B26] border border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No parent or guardian linked yet.</p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1.5">Invite a Parent / Guardian</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">We will send them an email invitation with instructions on how to set up their Parent Portal account.</p>
                  
                  {parentMsg && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 text-sm mb-4 ${parentMsg.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300 border border-green-200 dark:border-green-500/20' : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300 border border-red-200 dark:border-red-500/20'}`}>
                      {parentMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                      <span>{parentMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendParentInvite} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="sr-only" htmlFor="parentEmail">Parent Email Address</label>
                      <input 
                        type="email" 
                        id="parentEmail"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="Email address of your parent or guardian"
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div className="sm:w-44">
                      <label className="sr-only" htmlFor="parentRelationship">Relationship</label>
                      <CustomSelect
                        value={parentRelationship}
                        onChange={setParentRelationship}
                        options={[
                          { value: 'parent', label: 'Parent' },
                          { value: 'guardian', label: 'Guardian' },
                          { value: 'sponsor', label: 'Sponsor' },
                        ]}
                        placeholder="Relationship"
                        size="sm"
                      />
                    </div>
                    <FeedbackButton 
                      type="submit"
                      loading={sendingInvite}
                      success={inviteSent}
                      loadingText="Sending..."
                      successText="Invite Sent ✓"
                      className="px-4 py-2 font-medium whitespace-nowrap"
                    >
                      Send Invite
                    </FeedbackButton>
                  </form>
                </div>
              </div>
            )}

            {/* Linked Learners Tab (parents only, read-only) */}
            {activeTab === 'linked' && isParent && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-4 flex gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">About linked learners</h3>
                    <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mt-1">These are the learner accounts currently connected to your parent profile. Links are created and removed by an administrator, so this list is read-only. Contact your school administrator to add or remove a child.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Linked Learners</h3>
                  {children.length > 0 ? (
                    <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                      {children.map((child) => (
                        <div key={child.linkId} className="flex items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                              {child.avatarUrl ? (
                                <img src={child.avatarUrl} alt={child.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                initialsOf(child.name, 'L')
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{child.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {[child.grade, child.board].filter(Boolean).join(' · ') || 'No grade or board on record'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{child.email}</p>
                            </div>
                          </div>
                          {child.relationship && (
                            <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20 capitalize">
                              {child.relationship}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-[#161B26] border border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No children linked yet.</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ask your school administrator to link a learner account to your profile.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</h3>
                    </div>
                    {savingNotifs && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-start mt-0.5">
                        <input 
                          type="checkbox" 
                          className="peer sr-only" 
                          checked={notifications.courseAnnouncements}
                          onChange={() => handleNotifToggle('courseAnnouncements')}
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Course Announcements</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Updates from your educators about syllabus, exams, and classes.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-start mt-0.5">
                        <input 
                          type="checkbox" 
                          className="peer sr-only" 
                          checked={notifications.sessionReminders}
                          onChange={() => handleNotifToggle('sessionReminders')}
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Session Reminders</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Receive an email 1 hour before a live session starts.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-start mt-0.5">
                        <input 
                          type="checkbox" 
                          className="peer sr-only" 
                          checked={notifications.directMessages}
                          onChange={() => handleNotifToggle('directMessages')}
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Direct Messages</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Email me when I receive a new chat message and I'm offline.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <Smartphone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</h3>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Browser Notifications</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Get notified instantly in your browser when you have the app open.</p>
                    </div>
                    <button 
                      onClick={() => handleNotifToggle('browserPush')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm cursor-pointer ${
                        notifications.browserPush 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-white dark:bg-[#1E2535] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {notifications.browserPush ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Change Password</h3>
                  
                  {passwordMsg && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 text-sm mb-4 ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300 border border-green-200 dark:border-green-500/20' : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300 border border-red-200 dark:border-red-500/20'}`}>
                      {passwordMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                      <span>{passwordMsg.text}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="currentPassword">Current Password</label>
                      <input 
                        type="password" 
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="newPassword">New Password</label>
                      <input 
                        type="password" 
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="confirmPassword">Confirm New Password</label>
                      <input 
                        type="password" 
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <FeedbackButton 
                      type="submit"
                      loading={updatingPassword}
                      success={passwordSaved}
                      loadingText="Updating Password..."
                      successText="Password Updated ✓"
                      className="px-5 py-2.5 font-medium"
                    >
                      Update Password
                    </FeedbackButton>
                  </div>
                </div>
              </form>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsWorkspaceClient;
