'use client';

import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl?: string | null;
  date?: string;
  educatorName?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  date,
  educatorName,
}: VideoPlayerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div>
            <h2 className="text-base font-semibold text-white truncate max-w-xl">
              {title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
              {date && <span>{date}</span>}
              {educatorName && (
                <>
                  <span>•</span>
                  <span>Conducted by {educatorName}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Screen */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            >
              Your browser does not support HTML5 video.
            </video>
          ) : (
            <div className="text-center p-8 text-neutral-500">
              <p className="text-sm font-medium">Recording is currently being processed or unavailable.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
