'use client';

import React, { useEffect, useState } from 'react';
import { X, Phone, Mail, Calendar, Trash2, Code, Lock, ChevronDown, BookOpen, Loader2, Save, Check } from 'lucide-react';

interface LearnerProfileModalProps {
  isOpen: boolean;
  learnerId: string | null;
  onClose: () => void;
}

export function LearnerProfileModal({ isOpen, learnerId, onClose }: LearnerProfileModalProps) {
  const [learner, setLearner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'courses' | 'notes' | 'credits'>('courses');
  const [privateNote, setPrivateNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !learnerId) {
      setLearner(null);
      return;
    }

    async function loadLearner() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/learners/${learnerId}`);
        if (res.ok) {
          const json = await res.json();
          setLearner(json.data);
          setPrivateNote(json.data.privateNote || '');
        }
      } catch (err) {
        console.error('Failed to load learner details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLearner();
  }, [isOpen, learnerId]);

  const handleSaveNote = async () => {
    if (!learnerId) return;
    try {
      setSavingNote(true);
      setNoteSaved(false);
      const res = await fetch(`/api/v1/learners/${learnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateNote }),
      });
      if (res.ok) {
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save private note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-[#080D16] shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : !learner ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Learner information could not be retrieved.
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex gap-6 items-start">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xl ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm shrink-0">
                    {learner.avatarUrl ? (
                      <img className="w-full h-full object-cover" src={learner.avatarUrl} alt={learner.name} />
                    ) : (
                      learner.name?.charAt(0) || 'U'
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{learner.name}</h2>
                      <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {learner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-gray-500 dark:text-gray-400 text-xs">
                      {learner.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{learner.email}</span>
                        </div>
                      )}
                      {learner.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{learner.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{learner.grade ? `${learner.grade} • ` : ''}{learner.board || 'Curriculum'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex items-center gap-6 mt-6 border-b border-gray-200 dark:border-gray-800">
                <button 
                  onClick={() => setActiveTab('courses')}
                  className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                    activeTab === 'courses' 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span>Enrolled Courses</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {learner.enrollments?.length || 0}
                  </span>
                  {activeTab === 'courses' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('credits')}
                  className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                    activeTab === 'credits' 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span>Credits Balance</span>
                  {activeTab === 'credits' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                    activeTab === 'notes' 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Notes</span>
                  {activeTab === 'notes' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#080D16]">
              {activeTab === 'courses' && (
                <div className="space-y-4">
                  {!learner.enrollments?.length ? (
                    <div className="p-8 text-center bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-400">
                      No active enrollments for this learner.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {learner.enrollments.map((enr: any) => (
                        <div 
                          key={enr.courseId} 
                          className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 truncate">
                                {enr.courseName}
                              </h3>
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                                {enr.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'credits' && (
                <div className="space-y-4">
                  {!learner.credits?.length ? (
                    <div className="p-8 text-center bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-400">
                      No session credit balances recorded.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {learner.credits.map((cr: any) => (
                        <div 
                          key={cr.id} 
                          className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              Total Balance: {cr.totalCredits} Credits
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Consumed: {cr.consumedCredits} | Available: {parseFloat(cr.totalCredits) - parseFloat(cr.consumedCredits)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Internal Administrator Note</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confidential</span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This note is strictly confidential and visible only to system administrators. It is never exposed to students or educators.
                  </p>

                  <textarea
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    rows={6}
                    placeholder="Record background information, parent discussions, academic challenges, or internal observations..."
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      disabled={savingNote}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : noteSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {noteSaved ? 'Saved!' : 'Save Note'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
