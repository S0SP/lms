/**
 * Drizzle Relations — enables db.query.* with nested `with` includes.
 * Every table that participates in a relational query needs a relations() definition.
 */
import { relations } from 'drizzle-orm';

// ─── Schema imports ────────────────────────────────────────────────────────────
import { orgs } from './orgs';
import { users, educatorProfiles, learnerProfiles, parentProfiles, deviceTokens } from './users';
import { tags, courseTags, educatorTags, learnerTags } from './tags';
import {
  courses,
  courseEnrollments,
  courseEducators,
  credits,
  paymentPlans,
  courseSellingPages,
  coupons,
  courseReviews,
} from './courses';
import {
  sessions,
  sessionAttendees,
  sessionFeedback,
  sessionReports,
  confidentialFeedbackEducator,
  confidentialFeedbackLearner,
  sessionReminderJobs,
} from './sessions';
import { availabilityProfiles, leaves, sessionConflicts } from './availability';
import { zoomAttendance } from './attendance';
import { payouts, payoutSessionLinks } from './payouts';
import { monthlyReports } from './reports';
import { storeSettings, paymentTransactions, consultations } from './store';
import { googleCalendarTokens, googleCalendarChannels } from './calendar';
import { notificationLog, notificationPreferences } from './notifications';
import { emailLog } from './email';
import { chatThreads, chatMembers, chatMessages } from './chat';
import {
  contentSections,
  contentResources,
  videoAssets,
  fileAssets,
  learnerContentProgress,
} from './content';
import { tests, testQuestions, testQuestionOptions, testAttempts, testAnswers } from './testing';
import { assessments, assessmentCriteria, assessmentSubmissions, assessmentScores } from './assessments';
import { timelinePosts, polls, pollOptions, pollResponses, timelineComments } from './timeline';

// ─── Org relations ─────────────────────────────────────────────────────────────
export const orgsRelations = relations(orgs, ({ many }) => ({
  users: many(users),
  courses: many(courses),
  tags: many(tags),
  storeSettings: many(storeSettings),
  consultations: many(consultations),
}));

// ─── User relations ────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  org: one(orgs, { fields: [users.orgId], references: [orgs.id] }),
  educatorProfile: one(educatorProfiles, { fields: [users.id], references: [educatorProfiles.userId] }),
  learnerProfile: one(learnerProfiles, { fields: [users.id], references: [learnerProfiles.userId] }),
  parentProfiles: many(parentProfiles),
  deviceTokens: many(deviceTokens),
  courseEnrollments: many(courseEnrollments),
  courseEducators: many(courseEducators),
  educatorTags: many(educatorTags),
  learnerTags: many(learnerTags),
  sessionsAsEducator: many(sessions),
  sessionAttendees: many(sessionAttendees),
  payouts: many(payouts),
  notificationLogs: many(notificationLog),
  notificationPreferences: many(notificationPreferences),
  chatMembers: many(chatMembers),
  chatMessages: many(chatMessages),
}));

export const educatorProfilesRelations = relations(educatorProfiles, ({ one }) => ({
  user: one(users, { fields: [educatorProfiles.userId], references: [users.id] }),
  calendarToken: one(googleCalendarTokens, { fields: [educatorProfiles.userId], references: [googleCalendarTokens.educatorId] }),
}));

export const learnerProfilesRelations = relations(learnerProfiles, ({ one }) => ({
  user: one(users, { fields: [learnerProfiles.userId], references: [users.id] }),
}));

export const parentProfilesRelations = relations(parentProfiles, ({ one }) => ({
  user: one(users, { fields: [parentProfiles.userId], references: [users.id] }),
  learner: one(users, { fields: [parentProfiles.learnerId], references: [users.id] }),
}));

// ─── Course relations ──────────────────────────────────────────────────────────
export const coursesRelations = relations(courses, ({ one, many }) => ({
  org: one(orgs, { fields: [courses.orgId], references: [orgs.id] }),
  enrollments: many(courseEnrollments),
  educators: many(courseEducators),
  credits: many(credits),
  paymentPlans: many(paymentPlans),
  sellingPage: one(courseSellingPages, { fields: [courses.id], references: [courseSellingPages.courseId] }),
  coupons: many(coupons),
  reviews: many(courseReviews),
  tags: many(courseTags),
  sessions: many(sessions),
  contentSections: many(contentSections),
  chatThreads: many(chatThreads),
  timelinePosts: many(timelinePosts),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  learner: one(users, { fields: [courseEnrollments.learnerId], references: [users.id] }),
}));

export const courseEducatorsRelations = relations(courseEducators, ({ one }) => ({
  course: one(courses, { fields: [courseEducators.courseId], references: [courses.id] }),
  educator: one(users, { fields: [courseEducators.educatorId], references: [users.id] }),
}));

// ─── Session relations ─────────────────────────────────────────────────────────
export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  course: one(courses, { fields: [sessions.courseId], references: [courses.id] }),
  educator: one(users, { fields: [sessions.educatorId], references: [users.id] }),
  attendees: many(sessionAttendees),
  feedback: one(sessionFeedback, { fields: [sessions.id], references: [sessionFeedback.sessionId] }),
  reports: many(sessionReports),
  conflicts: many(sessionConflicts),
  zoomAttendance: many(zoomAttendance),
  reminderJobs: many(sessionReminderJobs),
}));

export const sessionAttendeesRelations = relations(sessionAttendees, ({ one }) => ({
  session: one(sessions, { fields: [sessionAttendees.sessionId], references: [sessions.id] }),
  learner: one(users, { fields: [sessionAttendees.learnerId], references: [users.id] }),
}));

export const sessionFeedbackRelations = relations(sessionFeedback, ({ one }) => ({
  session: one(sessions, { fields: [sessionFeedback.sessionId], references: [sessions.id] }),
  educator: one(users, { fields: [sessionFeedback.educatorId], references: [users.id] }),
}));

export const sessionReportsRelations = relations(sessionReports, ({ one }) => ({
  session: one(sessions, { fields: [sessionReports.sessionId], references: [sessions.id] }),
  learner: one(users, { fields: [sessionReports.learnerId], references: [users.id] }),
}));

// ─── Content relations ─────────────────────────────────────────────────────────
export const contentSectionsRelations = relations(contentSections, ({ one, many }) => ({
  course: one(courses, { fields: [contentSections.courseId], references: [courses.id] }),
  resources: many(contentResources),
}));

export const contentResourcesRelations = relations(contentResources, ({ one }) => ({
  section: one(contentSections, { fields: [contentResources.sectionId], references: [contentSections.id] }),
  videoAsset: one(videoAssets, { fields: [contentResources.id], references: [videoAssets.resourceId] }),
  fileAsset: one(fileAssets, { fields: [contentResources.id], references: [fileAssets.resourceId] }),
  test: one(tests, { fields: [contentResources.id], references: [tests.resourceId] }),
  assessment: one(assessments, { fields: [contentResources.id], references: [assessments.resourceId] }),
}));

// ─── Payout relations ──────────────────────────────────────────────────────────
export const payoutsRelations = relations(payouts, ({ one, many }) => ({
  educator: one(users, { fields: [payouts.educatorId], references: [users.id] }),
  sessionLinks: many(payoutSessionLinks),
}));

export const payoutSessionLinksRelations = relations(payoutSessionLinks, ({ one }) => ({
  payout: one(payouts, { fields: [payoutSessionLinks.payoutId], references: [payouts.id] }),
  session: one(sessions, { fields: [payoutSessionLinks.sessionId], references: [sessions.id] }),
}));

// ─── Timeline relations ────────────────────────────────────────────────────────
export const timelinePostsRelations = relations(timelinePosts, ({ one, many }) => ({
  course: one(courses, { fields: [timelinePosts.courseId], references: [courses.id] }),
  author: one(users, { fields: [timelinePosts.authorId], references: [users.id] }),
  poll: one(polls, { fields: [timelinePosts.id], references: [polls.postId] }),
  comments: many(timelineComments),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  post: one(timelinePosts, { fields: [polls.postId], references: [timelinePosts.id] }),
  options: many(pollOptions),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, { fields: [pollOptions.pollId], references: [polls.id] }),
  responses: many(pollResponses),
}));

// ─── Chat relations ────────────────────────────────────────────────────────────
export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  course: one(courses, { fields: [chatThreads.courseId], references: [courses.id] }),
  createdBy: one(users, { fields: [chatThreads.createdBy], references: [users.id] }),
  members: many(chatMembers),
  messages: many(chatMessages),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  thread: one(chatThreads, { fields: [chatMembers.threadId], references: [chatThreads.id] }),
  user: one(users, { fields: [chatMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, { fields: [chatMessages.threadId], references: [chatThreads.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
}));
