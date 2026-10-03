'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BellOff,
  Download,
  FileText,
  MessageSquare,
  Users,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Square,
  Trash2,
  X,
  Loader2,
  Plus,
  Search,
  Check,
  MoreVertical,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { MessageView, ThreadSummary } from '@/repositories/chatRepository';

export interface ChatWorkspaceClientProps {
  threads: ThreadSummary[];
  activeThreadId: string | null;
  messages: MessageView[];
  viewerId: string;
  viewerRole: string;
  emptyTitle: string;
  emptyBody: string;
}

const DISPLAY_TIME_ZONE = 'Asia/Kolkata';

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const dayLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: DISPLAY_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const threadDateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function initials(name: string | null | undefined): string {
  if (!name) return 'U';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'U'
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${exp === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[exp]}`;
}

function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

function formatDayLabel(iso: string): string {
  const day = new Date(iso);
  return dayLabelFormatter.format(day);
}

function formatThreadDate(iso: string): string {
  const day = new Date(iso);
  return threadDateFormatter.format(day);
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function isUnread(thread: ThreadSummary): boolean {
  if (!thread.lastMessageAt) return false;
  if (!thread.viewerLastReadAt) return true;
  return new Date(thread.lastMessageAt) > new Date(thread.viewerLastReadAt);
}

function getThreadDisplayName(thread: ThreadSummary): string {
  if (thread.title?.trim()) return thread.title;
  const names = thread.participants.map((p) => p.displayName).filter((n): n is string => Boolean(n));
  if (names.length > 0) return names.join(', ');
  return thread.courseName ?? (thread.type === 'direct' ? 'Direct chat' : 'Conversation');
}

function getThreadDisplayRole(thread: ThreadSummary): string | null {
  if (thread.type === 'course_group') return 'Course Group';
  const other = thread.participants[0];
  if (other?.role) {
    return other.role.charAt(0).toUpperCase() + other.role.slice(1);
  }
  return 'Direct chat';
}

interface MessageGroup {
  key: string;
  label: string;
  messages: MessageView[];
}

// ─── Voice / Audio Player Component ──────────────────────────────────────────
function AudioMessagePlayer({
  url,
  isMe,
}: {
  url: string;
  isMe: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3.5 rounded-2xl text-xs shadow-xs min-w-[240px] max-w-sm ${
        isMe
          ? 'bg-[#1e293b] text-white rounded-tr-xs'
          : 'bg-gray-100 dark:bg-[#161B26] text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/60 rounded-tl-xs'
      }`}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs ${
          isMe
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Waveform / Progress Slider */}
        <div className="relative flex items-center h-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 ${
              isMe ? 'bg-gray-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          />
        </div>
        <div className={`flex justify-between text-[10px] font-medium ${isMe ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
          <span>{formatSeconds(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Mic className="w-2.5 h-2.5 opacity-70" />
            <span>{duration > 0 ? formatSeconds(duration) : 'Voice note'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Attachment Card ─────────────────────────────────────────────────────────
function AttachmentCard({ message, isMe }: { message: MessageView; isMe: boolean }) {
  const attachment = message.attachment;
  if (!attachment) return null;

  const isImage = attachment.mime?.startsWith('image/');
  const isAudio = attachment.mime?.startsWith('audio/') || attachment.name.endsWith('.webm') || attachment.name.endsWith('.mp3') || attachment.name.endsWith('.wav') || attachment.name.endsWith('.ogg');

  if (isAudio) {
    return <AudioMessagePlayer url={attachment.url} isMe={isMe} />;
  }

  if (isImage) {
    return (
      <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-sm my-1">
        <a href={attachment.url} target="_blank" rel="noreferrer" className="block group relative">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-auto max-h-64 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
            <Download className="w-4 h-4" /> Download ({formatBytes(attachment.size)})
          </div>
        </a>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.name}
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors max-w-sm my-1 ${
        isMe
          ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800 hover:bg-gray-100 text-gray-900 dark:text-gray-100'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isMe ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
      }`}>
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold truncate">{attachment.name}</div>
        <div className={`text-[10px] ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
          {formatBytes(attachment.size)}
        </div>
      </div>
      <Download className={`w-4 h-4 shrink-0 ${isMe ? 'text-white/70' : 'text-gray-400'}`} />
    </a>
  );
}

export function ChatWorkspaceClient({
  threads,
  activeThreadId,
  messages: initialMessages,
  viewerId,
  viewerRole,
  emptyTitle,
  emptyBody,
}: ChatWorkspaceClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messageList, setMessageList] = useState<MessageView[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    previewUrl?: string;
  } | null>(null);

  // Audio / Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [startingChat, setStartingChat] = useState<string | null>(null);

  // Sync initial messages when activeThread changes
  useEffect(() => {
    setMessageList(initialMessages);
  }, [initialMessages, activeThreadId]);

  // Scroll to bottom on messages change
  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messageList, scrollToBottom]);

  // Mark active thread as read on mount and change
  useEffect(() => {
    if (!activeThreadId) return;
    fetch(`/api/v1/chat/threads/${activeThreadId}/read`, { method: 'POST' }).catch(() => {});
  }, [activeThreadId]);

  // Real-time polling fallback: checks for new messages every 3.5 seconds
  useEffect(() => {
    if (!activeThreadId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages?limit=100`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            setMessageList(json.data);
          }
        }
      } catch (err) {
        // quiet fallback
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeThreadId]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter((t) => {
      const name = getThreadDisplayName(t).toLowerCase();
      const lastMsg = (t.lastMessagePreview || '').toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [threads, searchQuery]);

  const groups = useMemo<MessageGroup[]>(() => {
    const map = new Map<string, MessageView[]>();
    for (const msg of messageList) {
      const key = dayKeyFormatter.format(new Date(msg.createdAt));
      const list = map.get(key) ?? [];
      list.push(msg);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, msgs]) => ({
      key,
      label: formatDayLabel(msgs[0].createdAt),
      messages: msgs,
    }));
  }, [messageList]);

  // Open New Chat Modal
  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    setLoadingRecipients(true);
    try {
      const res = await fetch('/api/v1/chat/recipients');
      if (res.ok) {
        const json = await res.json();
        setRecipients(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load recipients:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleStartDirectChat = async (recipientId: string) => {
    try {
      setStartingChat(recipientId);
      const res = await fetch('/api/v1/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      if (res.ok) {
        const json = await res.json();
        setShowNewChatModal(false);
        router.push(`${pathname}?thread=${encodeURIComponent(json.data.id)}`);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
    } finally {
      setStartingChat(null);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }
    setAttachedFile({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Voice Note Recording Handlers ──────────────────────────────────────────
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !activeThreadId) return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recorder = mediaRecorderRef.current;
    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      await uploadAndSendMessage(audioFile, '');
    };

    recorder.stop();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Upload file & send message
  const uploadAndSendMessage = async (fileToSend?: File, textBody = '') => {
    if (!activeThreadId || sending) return;

    setSending(true);

    try {
      let attachmentPayload = null;

      if (fileToSend) {
        setUploading(true);
        const presignRes = await fetch('/api/v1/uploads/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileToSend.name,
            contentType: fileToSend.type || 'application/octet-stream',
            folder: 'chat',
          }),
        });

        if (presignRes.ok) {
          const presignJson = await presignRes.json();
          const { uploadUrl, publicUrl, key } = presignJson.data;

          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': fileToSend.type || 'application/octet-stream' },
            body: fileToSend,
          });

          attachmentPayload = {
            key,
            url: publicUrl,
            name: fileToSend.name,
            size: fileToSend.size,
            mime: fileToSend.type || 'application/octet-stream',
          };
        } else {
          // Fallback to base64 Data URL
          const base64Url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(fileToSend);
          });
          attachmentPayload = {
            key: `chat-${Date.now()}`,
            url: base64Url,
            name: fileToSend.name,
            size: fileToSend.size,
            mime: fileToSend.type || 'application/octet-stream',
          };
        }
        setUploading(false);
      }

      const optimisticId = `temp-${Date.now()}`;
      const optimisticMsg: MessageView = {
        id: optimisticId,
        threadId: activeThreadId,
        senderId: viewerId,
        senderName: 'You',
        senderAvatarUrl: null,
        kind: attachmentPayload ? 'file' : 'text',
        body: textBody,
        attachment: attachmentPayload,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      setMessageList((prev) => [...prev, optimisticMsg]);
      setInputText('');
      setAttachedFile(null);
      setTimeout(() => scrollToBottom(true), 50);

      const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: textBody,
          kind: attachmentPayload ? 'file' : 'text',
          attachment: attachmentPayload,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMessageList((prev) =>
          prev.map((m) => (m.id === optimisticId ? json.data : m)),
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    uploadAndSendMessage(attachedFile?.file, inputText.trim());
  };

  const threadHref = (threadId: string) =>
    `${pathname}${pathname.includes('?') ? '&' : '?'}thread=${encodeURIComponent(threadId)}`;

  const otherParticipant = activeThread?.participants[0];
  const activeRoleBadge = getThreadDisplayRole(activeThread || ({} as any));

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] p-3 md:p-6 bg-[#faf8ff] dark:bg-[#080D16] overflow-hidden" data-viewer-role={viewerRole}>
      {/* Top Header bar with Chats title and + New chat button (Matching Image 1) */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-1">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Chats
        </h1>
        <button
          onClick={handleOpenNewChat}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] hover:bg-[#1e293b] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>New chat</span>
        </button>
      </div>

      {/* Main Dual-Pane Card Layout (Matching Image 1) */}
      <div className="flex-1 min-h-0 bg-white dark:bg-[#121824] border border-gray-200/90 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden flex">
        {/* Left Side: Chat List (Image 1) */}
        <aside
          className={`flex-col border-r border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#121824] min-h-0 shrink-0 ${
            activeThreadId ? 'hidden md:flex md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'
          }`}
        >
          {/* Search Chat Input (Image 1) */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800/80">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Chat"
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#080D16] border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Threads List */}
          {filteredThreads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{emptyTitle}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{emptyBody}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
              {filteredThreads.map((thread) => {
                const active = thread.id === activeThreadId;
                const unread = isUnread(thread);
                const title = getThreadDisplayName(thread);
                const displayInit = initials(title);

                return (
                  <Link
                    key={thread.id}
                    href={threadHref(thread.id)}
                    scroll={false}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50/70 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    {/* Circle Avatar (Image 1: grey circle with letter) */}
                    <div className="w-10 h-10 rounded-full bg-[#94a3b8] dark:bg-gray-700 text-white font-medium flex items-center justify-center text-sm shrink-0 overflow-hidden">
                      {thread.participants[0]?.avatarUrl ? (
                        <img
                          src={thread.participants[0].avatarUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{displayInit}</span>
                      )}
                    </div>

                    {/* Thread Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                          {title}
                        </h3>
                        {thread.lastMessageAt && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                            {formatThreadDate(thread.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {thread.lastMessagePreview ? (
                            thread.lastMessagePreview
                          ) : (
                            <span className="text-gray-400 italic">No messages</span>
                          )}
                        </p>
                        {unread && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Side: Active Chat Panel (Image 1) */}
        <main
          className={`flex-1 flex-col bg-white dark:bg-[#121824] min-h-0 ${
            activeThreadId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeThread ? (
            <>
              {/* Header (Image 1: Avatar, Name, Role badge, Direct chat sub-badge, vertical dots) */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between shrink-0 bg-white dark:bg-[#121824]">
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href={pathname}
                    className="md:hidden p-1.5 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>

                  {/* Avatar (Image 1) */}
                  <div className="w-10 h-10 rounded-full bg-[#94a3b8] dark:bg-gray-700 text-white font-medium flex items-center justify-center text-sm shrink-0 overflow-hidden">
                    {otherParticipant?.avatarUrl ? (
                      <img
                        src={otherParticipant.avatarUrl}
                        alt={getThreadDisplayName(activeThread)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials(getThreadDisplayName(activeThread))}</span>
                    )}
                  </div>

                  {/* Contact Info & Badges (Image 1) */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {getThreadDisplayName(activeThread)}
                      </h2>
                      {activeRoleBadge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {activeRoleBadge}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5">
                      <span className="inline-block text-[10px] text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-800">
                        {activeThread.type === 'direct' ? 'Direct chat' : activeThread.courseName || 'Course Group'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Menu (Image 1: 3 vertical dots) */}
                <div className="flex items-center gap-1 text-gray-400">
                  <button
                    type="button"
                    title="Chat options"
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Transcript (Image 1) */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white dark:bg-[#121824]">
                {messageList.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-xs">
                    No messages yet. Type below to start the conversation!
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.key} className="space-y-4">
                      {/* Date Pill Divider (Image 1: 30 Jul 2026) */}
                      <div className="relative flex items-center justify-center my-4">
                        <span className="bg-gray-50 dark:bg-[#080D16] border border-gray-200/80 dark:border-gray-700/60 px-3.5 py-1 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-300 shadow-xs">
                          {group.label}
                        </span>
                      </div>

                      {/* Messages in Group */}
                      {group.messages.map((message) => {
                        const isMe = message.senderId === viewerId;

                        if (message.kind === 'system') {
                          return (
                            <div key={message.id} className="text-center py-1">
                              <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-gray-800/60 px-3 py-1 rounded-full">
                                {message.body}
                              </span>
                            </div>
                          );
                        }

                        // Outgoing Message (Image 1: Navy bubble on right with timestamp below)
                        if (isMe) {
                          return (
                            <div key={message.id} className="flex flex-col items-end gap-1">
                              <div className="max-w-[75%] space-y-1">
                                {message.attachment && <AttachmentCard message={message} isMe={true} />}
                                {message.body && (
                                  <div className="bg-[#1e293b] text-white px-4 py-2 rounded-2xl rounded-tr-xs text-xs shadow-xs whitespace-pre-wrap break-words">
                                    {message.body}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 mr-1">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                          );
                        }

                        // Incoming Message (Left aligned with white bubble and timestamp below)
                        return (
                          <div key={message.id} className="flex flex-col items-start gap-1 max-w-[75%]">
                            <div className="space-y-1">
                              {message.attachment && <AttachmentCard message={message} isMe={false} />}
                              {message.isDeleted ? (
                                <p className="text-xs italic text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2">
                                  Message deleted
                                </p>
                              ) : (
                                message.body && (
                                  <div className="bg-gray-100 dark:bg-[#161B26] text-gray-900 dark:text-gray-100 px-4 py-2 rounded-2xl rounded-tl-xs shadow-xs border border-gray-200/60 dark:border-gray-700 text-xs whitespace-pre-wrap break-words">
                                    {message.body}
                                  </div>
                                )
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 ml-1">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Chip */}
              {attachedFile && (
                <div className="px-4 py-2 bg-blue-50/80 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 truncate">
                    <Paperclip className="w-4 h-4 shrink-0" />
                    <span className="font-semibold truncate">{attachedFile.file.name}</span>
                    <span className="text-[10px] opacity-75">
                      ({formatBytes(attachedFile.file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Bottom Input Composer Bar (Image 1: input, paperclip, mic, Send button) */}
              <div className="p-3 md:p-4 bg-white dark:bg-[#121824] border-t border-gray-100 dark:border-gray-800/80">
                {isRecordingVoice ? (
                  // Live Recording UI Bar
                  <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl animate-pulse">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-rose-600 rounded-full animate-ping" />
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                        Recording voice note... ({formatSeconds(recordingSeconds)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                        title="Discard recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={stopAndSendVoiceRecording}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send voice</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Standard Message Composer Form
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 bg-white dark:bg-[#080D16] focus-within:ring-1 focus-within:ring-blue-500 transition-all"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message"
                      disabled={sending}
                      className="flex-1 px-3 py-1.5 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                    />

                    {/* Paperclip Attachment Button (Image 1) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || uploading}
                      title="Attach file"
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Microphone Voice Note Button (Image 1) */}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      disabled={sending || uploading}
                      title="Record Voice Note"
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Send Button with Paper Plane icon (Image 1: [ Send 🚀 ]) */}
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !attachedFile) || sending || uploading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#64748b] hover:bg-[#475569] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                    >
                      {sending || uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-gray-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Select a conversation
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Choose a chat on the left to start messaging, or start a new chat.
              </p>
              <button
                onClick={handleOpenNewChat}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] hover:bg-[#1e293b] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New chat</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                New Conversation
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search user by name, role or email..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-50 dark:divide-gray-800/40">
              {loadingRecipients ? (
                <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Loading users...
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No contacts found.
                </div>
              ) : (
                recipients
                  .filter(
                    (r) =>
                      r.name?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                      r.email?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                      r.role?.toLowerCase().includes(recipientSearch.toLowerCase()),
                  )
                  .map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartDirectChat(user.id)}
                      disabled={startingChat === user.id}
                      className="w-full p-2.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#94a3b8] dark:bg-gray-700 text-white font-semibold flex items-center justify-center text-xs shrink-0">
                          {initials(user.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-gray-400">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {user.role}
                        </span>
                        {startingChat === user.id && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWorkspaceClient;
