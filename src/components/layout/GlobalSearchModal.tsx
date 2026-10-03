'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, Code, Calculator, X, Loader2, BookOpen, User, GraduationCap } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResults {
  learners: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    grade?: string | null;
    board?: string | null;
  }>;
  courses: Array<{
    id: string;
    name: string;
    shortCode?: string | null;
    type: string;
    board?: string | null;
    grade?: string | null;
    status: string;
    thumbnailUrl?: string | null;
  }>;
  educators: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  }>;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    learners: [],
    courses: [],
    educators: [],
  });

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ learners: [], courses: [], educators: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data || { learners: [], courses: [], educators: [] });
        }
      } catch (err) {
        console.error('Search fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setResults({ learners: [], courses: [], educators: [] });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const hasAnyResults =
    results.learners.length > 0 ||
    results.courses.length > 0 ||
    results.educators.length > 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[10vh] transition-opacity"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-[#161B26] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          {loading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0 mr-3" />
          ) : (
            <Search className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 text-base outline-none"
            placeholder="Search learners, courses, or educators..."
            type="text"
          />
          <div className="flex items-center ml-3 shrink-0 gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {!query.trim() && (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Type anything to search across learners, courses, and educators...
            </div>
          )}

          {query.trim() && !loading && !hasAnyResults && (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Learners */}
          {results.learners.length > 0 && (
            <section className="px-2 pt-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Learners
              </h3>
              <div className="space-y-1">
                {results.learners.map((learner) => (
                  <div
                    key={learner.id}
                    onClick={() => handleSelect(`/admin/users/learners`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {learner.avatarUrl ? (
                        <img
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          src={learner.avatarUrl}
                          alt={learner.name}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                          {learner.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {learner.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {learner.email}
                          {learner.grade && ` • ${learner.grade}`}
                        </span>
                      </div>
                    </div>
                    <CornerDownLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Courses */}
          {results.courses.length > 0 && (
            <section className="px-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Courses
              </h3>
              <div className="space-y-1">
                {results.courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => handleSelect(`/educator/courses/${course.id}`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:border-blue-200 dark:group-hover:border-blue-800 group-hover:text-blue-600 transition-colors">
                        <Code className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {course.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {course.shortCode || course.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {course.status}
                      </span>
                      <CornerDownLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Educators */}
          {results.educators.length > 0 && (
            <section className="px-2 pb-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Educators
              </h3>
              <div className="space-y-1">
                {results.educators.map((educator) => (
                  <div
                    key={educator.id}
                    onClick={() => handleSelect(`/admin/users/educators`)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {educator.avatarUrl ? (
                        <img
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          src={educator.avatarUrl}
                          alt={educator.name}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                          {educator.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {educator.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {educator.email}
                        </span>
                      </div>
                    </div>
                    <CornerDownLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-sans shadow-sm">
                ESC
              </kbd>{' '}
              to close
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
