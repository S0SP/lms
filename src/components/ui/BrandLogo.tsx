import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'sidebar' | 'full';
  showText?: boolean;
  iconOnly?: boolean;
  width?: number;
  height?: number;
}

export function BrandLogo({ className = '', size = 'md', showText = true, iconOnly = false, width, height }: BrandLogoProps) {
  const isIcon = iconOnly || !showText;

  const dimensions = isIcon
    ? {
        sm: { width: 34, height: 34, text: 'text-lg' },
        md: { width: 44, height: 44, text: 'text-2xl' },
        lg: { width: 56, height: 56, text: 'text-3xl' },
        xl: { width: 72, height: 72, text: 'text-4xl' },
        sidebar: { width: 36, height: 36, text: 'text-lg' },
        full: { width: 56, height: 56, text: 'text-3xl' },
      }[size]
    : {
        sm: { width: 110, height: 21, text: 'text-lg' },
        md: { width: 140, height: 27, text: 'text-2xl' },
        sidebar: { width: 185, height: 36, text: 'text-2xl' },
        lg: { width: 220, height: 42, text: 'text-3xl' },
        xl: { width: 280, height: 54, text: 'text-4xl' },
        full: { width: 185, height: 36, text: 'text-2xl' },
      }[size];

  const finalWidth = width || dimensions.width;
  const finalHeight = height || dimensions.height;

  return (
    <div className={`flex items-center select-none ${className}`}>
      <div className="relative flex items-center shrink-0 w-full">
        <Image 
          src={isIcon ? "/logos/logo_icon.png" : "/logos/image_wide.png"} 
          alt="Brand Logo" 
          width={finalWidth} 
          height={finalHeight}
          className={`object-contain drop-shadow-sm ${isIcon ? 'w-auto' : 'w-full max-w-[190px] h-auto'}`}
          priority
        />
      </div>

      {!isIcon && showText && (
        <span className={`font-extrabold tracking-tight ${dimensions.text} font-heading leading-none hidden`}>
          <span className="text-[#00B4D8] dark:text-[#38BDF8]">Unbound</span>
          <span className="text-[#3A86FF] dark:text-[#60A5FA]">You</span>
        </span>
      )}
    </div>
  );
}
