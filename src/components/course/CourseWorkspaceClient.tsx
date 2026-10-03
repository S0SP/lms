'use client';

import React, { useState } from 'react';
import { Calendar, FileText, CheckCircle2, ChevronRight, Clock, MapPin, Users, MessageSquare, PlayCircle, Download, Award, CheckSquare, Upload } from 'lucide-react';
import StudentAssignmentModal from '@/components/course/modals/StudentAssignmentModal';
import StudentQuizModal from '@/components/course/modals/StudentQuizModal';

interface CourseProps {
  id: string;
  name: string;
  code: string;
  educator: string;
  creditsUsed: number;
  creditsTotal: number;
  nextSession: {
    id: string;
    title: string;
    scheduledAtLabel: string;
    provider: string;
    joinUrl: string | null;
  } | null;
}

interface TimelinePost {
  id: string;
  body: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  commentCount: number;
  poll: {
    question: string;
    showResults: boolean;
    totalVotes: number;
    options: { id: string; body: string; pct: number }[];
  } | null;
}

interface ContentResource {
  id: string;
  title: string;
  type: string;
  externalUrl: string | null;
  sortOrder: number;
  durationSeconds: number | null;
  completed: boolean;
  progressPct: number;
  assessment?: {
    id: string;
    description: string | null;
    maxMarks: number;
    endsOn: string | null;
    submission?: {
      id: string;
      submittedAt: string;
      fileR2Keys: string[] | null;
      totalScore: number | null;
      feedback: string | null;
      gradedAt: string | null;
    } | null;
  } | null;
  test?: {
    id: string;
    timeLimitSeconds: number | null;
    attemptsCount: number;
    latestScore: number | null;
  } | null;
}

interface ContentSection {
  id: string;
  title: string;
  sortOrder: number;
  resources: ContentResource[];
  completedCount: number;
  resourceCount: number;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function CourseWorkspaceClient({
  course,
  timeline,
  content,
}: {
  course: CourseProps;
  timeline: TimelinePost[];
  content: ContentSection[];
}) {
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'content'>('home');
  const [localContent, setLocalContent] = useState<ContentSection[]>(content);
  const [selectedAssignment, setSelectedAssignment] = useState<ContentResource | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<ContentResource | null>(null);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-[#0D1117] p-8">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <span>Courses</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">{course.code}</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">Computer Science</span>
            <span className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">1-on-1</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.name}</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Educator: <span className="font-medium text-gray-700 dark:text-gray-300">{course.educator}</span>
          </p>
        </div>

        {/* Credits Widget */}
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm min-w-[240px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Course Credits</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{course.creditsUsed} / {course.creditsTotal}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(course.creditsUsed / course.creditsTotal) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mb-8">
        {[
          { id: 'home', label: 'Home' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'content', label: 'Content' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
              activeTab === t.id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span>{t.label}</span>
            {activeTab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'home' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content: Next Session & Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Upcoming Session</h2>

              {course.nextSession ? (
                <>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {course.nextSession.title}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" /> {course.nextSession.scheduledAtLabel}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4" /> {course.nextSession.provider}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {course.nextSession.joinUrl ? (
                      <a
                        href={course.nextSession.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Join Session
                      </a>
                    ) : (
                      <span className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-semibold rounded-md cursor-not-allowed">
                        Join link not available yet
                      </span>
                    )}
                    <button className="px-4 py-2 bg-white dark:bg-[#1E2535] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-sm font-semibold rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm">
                      Reschedule
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No upcoming session is scheduled for this course.
                </p>
              )}
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Graph Theory Basics completed</h4>
                  <p className="text-xs text-gray-500">Yesterday • 1 credit used</p>
                </div>
              </div>
              <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
                <FileText className="w-5 h-5 text-purple-500" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New material uploaded</h4>
                  <p className="text-xs text-gray-500">2 days ago • Big-O Notation Cheat Sheet</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Self-Booking & Educator */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Book a Session</h3>
              <p className="text-sm text-gray-500 mb-4">Select an available slot with {course.educator} to use a credit.</p>
              
              <div className="space-y-3 mb-6">
                <button className="w-full flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-md hover:border-blue-500 dark:hover:border-blue-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Thu, Sep 9</span>
                    <span className="text-xs text-gray-500">4:00 PM - 5:00 PM</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </button>
                <button className="w-full flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-md hover:border-blue-500 dark:hover:border-blue-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fri, Sep 10</span>
                    <span className="text-xs text-gray-500">2:00 PM - 3:00 PM</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </button>
              </div>
              
              <button className="w-full py-2 text-sm font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                View Full Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {timeline.length === 0 ? (
            <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No posts in this course yet.
              </p>
            </div>
          ) : (
            timeline.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm"
              >
                <div className="flex gap-4 mb-4">
                  {post.authorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.authorAvatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                      {post.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {post.authorName}
                    </h4>
                    <p className="text-xs text-gray-500">{relativeTime(post.createdAt)}</p>
                  </div>
                </div>

                {post.body && !post.poll && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 whitespace-pre-wrap">
                    {post.body}
                  </p>
                )}

                {post.poll && (
                  <>
                    {post.poll.question && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                        {post.poll.question}
                      </p>
                    )}
                    <div className="space-y-2 mb-4">
                      {post.poll.options.length === 0 ? (
                        <p className="text-sm text-gray-500">This poll has no options.</p>
                      ) : (
                        post.poll.options.map((opt) => (
                          <div
                            key={opt.id}
                            className="p-3 border border-gray-200 dark:border-gray-800 rounded-md flex justify-between transition-colors relative overflow-hidden"
                          >
                            {post.poll!.showResults && post.poll!.totalVotes > 0 && (
                              <div
                                className="absolute top-0 left-0 h-full bg-blue-100 dark:bg-blue-900/30"
                                style={{ width: `${opt.pct}%` }}
                              />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300 relative z-10">
                              {opt.body}
                            </span>
                            {post.poll!.showResults && post.poll!.totalVotes > 0 && (
                              <span className="text-sm font-bold text-blue-600 relative z-10">
                                {opt.pct}%
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {post.commentCount > 0 && (
                  <div className="flex items-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4" /> {post.commentCount} Comment
                      {post.commentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'content' && (
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Course Modules</h2>

          {localContent.filter((s) => s.resourceCount > 0).length === 0 ? (
            <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
              <FileText className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No published content is available for this course yet.
              </p>
            </div>
          ) : (
            localContent
              .filter((s) => s.resourceCount > 0)
              .map((section) => {
                const allDone =
                  section.completedCount === section.resourceCount && section.resourceCount > 0;
                return (
                  <div
                    key={section.id}
                    className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-[#1E2535] border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">{section.title}</h3>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          allDone
                            ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                            : section.completedCount > 0
                              ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
                              : 'text-gray-500 bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        {allDone
                          ? 'Completed'
                          : section.completedCount > 0
                            ? `${section.completedCount}/${section.resourceCount}`
                            : 'Not started'}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {section.resources.map((res) => {
                        const duration = formatDuration(res.durationSeconds);
                        const isAssignment = res.type === 'assessment';
                        const isQuiz = res.type === 'test' || res.type === 'quiz';

                        let Icon = res.completed ? CheckCircle2 : PlayCircle;
                        if (isAssignment) Icon = Award;
                        if (isQuiz) Icon = CheckSquare;

                        const isGraded = res.assessment?.submission?.totalScore !== null && res.assessment?.submission?.totalScore !== undefined;
                        const isSubmitted = res.assessment?.submission !== null && res.assessment?.submission !== undefined;
                        const hasAttempt = (res.test?.attemptsCount ?? 0) > 0;

                        return (
                          <div
                            key={res.id}
                            onClick={() => {
                              if (isAssignment) setSelectedAssignment(res);
                              if (isQuiz) setSelectedQuiz(res);
                            }}
                            className={`p-4 flex items-center justify-between transition-colors group ${
                              isAssignment || isQuiz ? 'cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-900/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                res.completed || isGraded || hasAttempt
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                  : isAssignment
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                                    : isQuiz
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                                  {res.title}
                                </span>
                                {isAssignment && res.assessment?.endsOn && (
                                  <span className="text-[11px] text-gray-400 block mt-0.5">
                                    Due: {new Date(res.assessment.endsOn).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 border border-gray-200 dark:border-gray-800 px-1.5 py-0.5 rounded shrink-0">
                                {res.type.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              {/* Assignment status badge */}
                              {isAssignment && (
                                <>
                                  {isGraded ? (
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg">
                                      Score: {res.assessment!.submission!.totalScore} / {res.assessment!.maxMarks}
                                    </span>
                                  ) : isSubmitted ? (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                                      Submitted
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                      <Upload className="w-3 h-3" /> Submit
                                    </span>
                                  )}
                                </>
                              )}

                              {/* Quiz status badge */}
                              {isQuiz && (
                                <>
                                  {hasAttempt ? (
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg">
                                      Score: {res.test!.latestScore ?? 'Graded'}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                                      Take Quiz
                                    </span>
                                  )}
                                </>
                              )}

                              {duration && (
                                <span className="text-xs text-gray-500">{duration}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Student Assignment Submission Modal */}
      {selectedAssignment && (
        <StudentAssignmentModal
          isOpen={true}
          resourceId={selectedAssignment.id}
          resourceTitle={selectedAssignment.title}
          assessmentData={selectedAssignment.assessment}
          onClose={() => setSelectedAssignment(null)}
          onSubmitted={(newSub) => {
            setLocalContent((prev) =>
              prev.map((sec) => ({
                ...sec,
                resources: sec.resources.map((r) =>
                  r.id === selectedAssignment.id
                    ? {
                        ...r,
                        assessment: {
                          ...(r.assessment || { id: selectedAssignment.id, maxMarks: 100, description: null, endsOn: null }),
                          submission: newSub,
                        },
                      }
                    : r
                ),
              }))
            );
          }}
        />
      )}

      {/* Student Quiz Runner Modal */}
      {selectedQuiz && (
        <StudentQuizModal
          isOpen={true}
          resourceId={selectedQuiz.id}
          resourceTitle={selectedQuiz.title}
          onClose={() => setSelectedQuiz(null)}
          onCompleted={(result) => {
            setLocalContent((prev) =>
              prev.map((sec) => ({
                ...sec,
                resources: sec.resources.map((r) =>
                  r.id === selectedQuiz.id
                    ? {
                        ...r,
                        completed: true,
                        test: {
                          ...(r.test || { id: selectedQuiz.id, timeLimitSeconds: null, attemptsCount: 1, latestScore: result.autoScore }),
                          attemptsCount: (r.test?.attemptsCount ?? 0) + 1,
                          latestScore: result.autoScore,
                        },
                      }
                    : r
                ),
              }))
            );
          }}
        />
      )}
    </div>
  );
}
