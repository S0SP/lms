'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Video, CheckCircle2, Play, Pause, RotateCcw } from 'lucide-react';

interface StudentVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  resource: {
    id: string;
    title: string;
    externalUrl?: string | null;
    durationSeconds?: number | null;
    progressPct?: number;
    completed?: boolean;
  } | null;
  onProgressUpdate?: (resourceId: string, progressPct: number, completed: boolean) => void;
}

export default function StudentVideoModal({
  isOpen,
  onClose,
  courseId,
  resource,
  onProgressUpdate,
}: StudentVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const [currentProgress, setCurrentProgress] = useState(resource?.progressPct || 0);
  const [isCompleted, setIsCompleted] = useState(Boolean(resource?.completed));

  useEffect(() => {
    if (resource) {
      setCurrentProgress(resource.progressPct || 0);
      setIsCompleted(Boolean(resource.completed));
    }
  }, [resource]);

  const syncProgressToBackend = useCallback(async (pct: number, positionSec: number, completed: boolean) => {
    if (!resource || !courseId) return;

    try {
      await fetch(`/api/v1/courses/${courseId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: resource.id,
          progressPct: Math.min(100, Math.max(0, pct)),
          lastPositionSeconds: Math.floor(positionSec),
          completed,
        }),
      });

      if (onProgressUpdate) {
        onProgressUpdate(resource.id, pct, completed);
      }
    } catch (err) {
      console.error('[VideoProgress] Sync error:', err);
    }
  }, [resource, courseId, onProgressUpdate]);

  if (!isOpen || !resource) return null;

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const currentTime = video.currentTime;
    const duration = video.duration;
    const pct = Math.min(100, (currentTime / duration) * 100);

    setCurrentProgress(Math.round(pct));

    // Debounce progress sync every 15 seconds
    const now = Date.now();
    if (now - lastSyncTimeRef.current >= 15000) {
      lastSyncTimeRef.current = now;
      syncProgressToBackend(pct, currentTime, pct >= 95);
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    const duration = video?.duration || 0;
    setIsCompleted(true);
    setCurrentProgress(100);
    syncProgressToBackend(100, duration, true);
  };

  const videoUrl = resource.externalUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161B26] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{resource.title}</h3>
              <p className="text-xs text-gray-400">Lesson Video Stream</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
                </>
              ) : (
                <span>{currentProgress}% Watched</span>
              )}
            </div>
            <button
              onClick={() => {
                // Final sync on close
                if (videoRef.current) {
                  syncProgressToBackend(currentProgress, videoRef.current.currentTime, isCompleted);
                }
                onClose();
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative bg-black flex items-center justify-center aspect-video">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <span>Watch progress is synced automatically every 15 seconds.</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Progress: {currentProgress}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
