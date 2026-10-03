'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Star, Clock, ShoppingCart, ArrowRight, BookOpen, Loader2, Users } from 'lucide-react';

interface CatalogCourse {
  id: string;
  name: string;
  shortCode?: string | null;
  type: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  board?: string | null;
  grade?: string | null;
  urlSlug?: string | null;
  enrollmentCount: number;
}

export default function PublicStore() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'IGCSE', 'IB DP', 'CBSE', 'Mathematics', 'Computer Science'];

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (activeCategory !== 'All') params.set('category', activeCategory);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/v1/store/courses?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setCourses(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load store catalog:', err);
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(loadCatalog, searchQuery ? 250 : 0);
    return () => clearTimeout(t);
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D1117]">
      {/* Public Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#161B26]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">U</span>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">UnboundYou</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/consultation" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Book Consultation
            </Link>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white dark:bg-[#161B26] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
            Unlock your <span className="text-blue-600">potential</span> today.
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Discover world-class 1-on-1 and group courses designed to help you master international curricula with expert educators.
          </p>
          <div className="max-w-2xl mx-auto relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for subjects, curricula, or topics..." 
              className="w-full pl-12 pr-4 py-3.5 text-sm md:text-base bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900 dark:text-white shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-colors border shadow-sm ${
                activeCategory === cat 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white dark:bg-[#161B26] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {searchQuery ? `No courses found matching "${searchQuery}"` : 'Catalog updating soon'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Our academic team is actively scheduling new programs. You can book a free consultation to design a customized learning track.
            </p>
            <Link
              href="/consultation"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm"
            >
              Book Discovery Call <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div 
                key={course.id} 
                className="group bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300"
              >
                {/* Thumbnail / Header */}
                <div className="aspect-[16/9] bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/20 p-6 flex flex-col justify-between relative">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-full shadow-sm backdrop-blur-sm">
                      {course.type.replace('_', ' ')}
                    </span>
                    {course.board && (
                      <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-blue-600 text-white rounded-md shadow-sm">
                        {course.board}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <Users className="w-3.5 h-3.5" />
                    <span>{course.enrollmentCount} Active Learner{course.enrollmentCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                      {course.description || 'Personalized curriculum covering foundational and advanced concepts with interactive assessments and real-time mentor guidance.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {course.grade || 'All Grades'}
                    </span>
                    <Link
                      href="/consultation"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Book Free Trial <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
