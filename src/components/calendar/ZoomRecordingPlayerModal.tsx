'use client';

import React from 'react';
import { X, Video, ExternalLink, Download, Maximize2 } from 'lucide-react';

interface ZoomRecordingPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl?: string | null;
  downloadUrl?: string | null;
  durationMin?: number;
  scheduledAt?: string;
  educatorName?: string;
}

export function ZoomRecordingPlayerModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  downloadUrl,
  durationMin = 60,
  scheduledAt,
  educatorName,
}: ZoomRecordingPlayerModalProps) {
  if (!isOpen) return null;

  const defaultVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const streamUrl = videoUrl || defaultVideo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#0A0D14] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white truncate max-w-[480px]">
                {title} · Session Recording
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {educatorName ? `Hosted by ${educatorName} · ` : ''}
                {scheduledAt
                  ? new Date(scheduledAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Download Recording"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Close Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player / Cloud Stream */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {streamUrl.includes('zoom.us/rec/') && !streamUrl.toLowerCase().includes('.mp4') ? (
            <iframe
              src={streamUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              title="Zoom Cloud Recording"
            />
          ) : (
            <video
              src={streamUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            >
              Your browser does not support playing this Zoom recording video.
            </video>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3.5 bg-[#111622] border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-gray-300">Cloud Recording · 1080p HD</span>
            <span className="text-gray-600">|</span>
            <span>Duration: ~{durationMin} mins</span>
          </div>

          <a
            href={streamUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            <span>Open in Zoom Cloud</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
