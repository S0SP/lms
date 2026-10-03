'use client';

import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  src?: string | null;
  alt: string;
  initials: string;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ 
  src, 
  alt, 
  initials, 
  className = '', 
  fallbackClassName = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
}: UserAvatarProps) {
  const [error, setError] = useState(false);
  const cleanSrc = src && typeof src === 'string' && src.trim() !== '' && src !== 'null' && src !== 'undefined' ? src.trim() : null;

  useEffect(() => {
    setError(false);
  }, [cleanSrc]);

  if (!cleanSrc || error) {
    return (
      <div className={`flex items-center justify-center font-bold select-none ${fallbackClassName} ${className}`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );
}
