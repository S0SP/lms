'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Mic,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Code,
  Strikethrough,
  ListOrdered,
  List,
  Subscript,
  Superscript,
  FunctionSquare,
  RemoveFormatting,
  Square,
  Play,
  Pause,
  Trash2,
  Loader2,
  FileText,
} from 'lucide-react';

interface CreateChitChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onCreated?: (newPost: any) => void;
}

export function CreateChitChatModal({
  isOpen,
  onClose,
  courseId,
  onCreated,
}: CreateChitChatModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [disableLearnerComments, setDisableLearnerComments] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // File Uploads
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size: number }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Form submission
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Audio recording access error:', err);
      setErrorMsg('Microphone access denied or not available in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const discardRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAudioBlobUrl(null);
    setRecordSeconds(0);
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFiles(true);
      setErrorMsg(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/v1/uploads/local', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          setUploadedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              url: json.data?.url || URL.createObjectURL(file),
              size: file.size,
            },
          ]);
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to upload files.');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Text formatting helpers for rich textarea
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = description.substring(start, end);
    const replacement = prefix + selected + suffix;
    setDescription(description.substring(0, start) + replacement + description.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const handleSubmit = async () => {
    if (!title.trim() && !description.trim()) {
      setErrorMsg('Please enter a title or description for your chit chat.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/v1/courses/${courseId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isChitChat: true,
          title: title.trim(),
          description: description.trim(),
          audioUrl: audioBlobUrl,
          attachments: uploadedFiles,
          disableLearnerComments,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        onCreated?.(json.data);
        onClose();
      } else {
        const json = await res.json();
        setErrorMsg(json.error || 'Failed to create chit chat.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating chit chat.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Create a Chit chat
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter chit chat title"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Description & Rich Toolbar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:border-blue-500 transition shadow-2xs">
              {/* Rich text formatting toolbar */}
              <div className="p-2 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/40 flex flex-wrap items-center gap-1 text-gray-600 dark:text-gray-300">
                <button
                  type="button"
                  title="Bold"
                  onClick={() => wrapSelection('**')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <Bold className="w-3.5 h-3.5 font-bold" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => wrapSelection('*')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Underline"
                  onClick={() => wrapSelection('<u>', '</u>')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Code snippet"
                  onClick={() => wrapSelection('`')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough"
                  onClick={() => wrapSelection('~~')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => wrapSelection('\n1. ')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => wrapSelection('\n- ')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

                <button
                  type="button"
                  title="Subscript"
                  onClick={() => wrapSelection('_{', '}')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition text-[11px] font-bold"
                >
                  x₂
                </button>
                <button
                  type="button"
                  title="Superscript"
                  onClick={() => wrapSelection('^{', '}')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition text-[11px] font-bold"
                >
                  x²
                </button>
                <button
                  type="button"
                  title="Formula"
                  onClick={() => wrapSelection('$$', '$$')}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition text-[11px] font-serif italic"
                >
                  fx
                </button>

                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

                <span className="text-[11px] font-semibold text-gray-500 px-1">
                  Normal
                </span>
                <button
                  type="button"
                  title="Clear formatting"
                  onClick={() => setDescription(description.replace(/[*_~`]/g, ''))}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition text-[11px]"
                >
                  Tx
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full p-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Audio Recording Section / Button */}
          {isRecording ? (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Mic className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Recording audio...
                  </div>
                  <div className="text-xs font-mono text-rose-600 dark:text-rose-400 font-bold">
                    {formatTimer(recordSeconds)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={discardRecording}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  title="Discard recording"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          ) : audioBlobUrl ? (
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center cursor-pointer"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Recorded Audio Voice Note
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Duration: {formatTimer(recordSeconds)}
                  </div>
                </div>
                <audio
                  ref={audioPlayerRef}
                  src={audioBlobUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="hidden"
                />
              </div>

              <button
                type="button"
                onClick={discardRecording}
                className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="Delete voice note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startRecording}
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Mic className="w-4 h-4 text-gray-500" />
                <span>Record audio</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles}
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                {uploadingFiles ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <Paperclip className="w-4 h-4 text-gray-500" />
                )}
                <span>Upload Files</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Attached Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Attachments ({uploadedFiles.length})
              </span>
              <div className="space-y-1">
                {uploadedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs"
                  >
                    <span className="truncate max-w-[280px] font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disable learner comments */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              Disable learner comments
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={disableLearnerComments}
              onClick={() => setDisableLearnerComments(!disableLearnerComments)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                disableLearnerComments ? 'bg-[#0F172A] dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  disableLearnerComments ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Chit chat</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
