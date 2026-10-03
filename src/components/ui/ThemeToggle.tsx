'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = (resolvedTheme || 'light') === 'dark' ? 'light' : 'dark';

    // Get click coordinates (center of button as fallback)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX > 0 ? e.clientX : rect.left + rect.width / 2;
    const y = e.clientY > 0 ? e.clientY : rect.top + rect.height / 2;

    // Furthest corner distance so the circle blankets the entire screen
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // ── View Transitions API (modern approach – no empty overlay) ──────────
    // The browser takes a snapshot of the current page, applies the new theme
    // to produce the new page, then clips the new page in with a circle wipe.
    if (!document.startViewTransition) {
      // Graceful fallback for browsers without View Transitions support
      setTheme(nextTheme);
      return;
    }

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    // Once the browser has both snapshots ready, animate the clip-path
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          // Animate the *incoming* (new-theme) snapshot layer
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${className || ''}`}
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5 opacity-0" />
      </button>
    );
  }

  const isDark = (resolvedTheme || 'light') === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 shrink-0 cursor-pointer overflow-hidden ${className || ''}`}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Moon — shown in light mode */}
      <div
        className={`transition-all duration-500 ease-out flex items-center justify-center ${
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
      >
        <Moon className="w-5 h-5 text-gray-700" />
      </div>

      {/* Sun — shown in dark mode */}
      <div
        className={`absolute transition-all duration-500 ease-out flex items-center justify-center ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        }`}
      >
        <Sun className="w-5 h-5 text-amber-400" />
      </div>
    </button>
  );
}

export default ThemeToggle;
