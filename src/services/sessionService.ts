import { sessionRepository, SessionQueryFilters } from '@/repositories/sessionRepository';
import { z } from 'zod';
import { createSessionSchema } from '@/validators/sessionValidator';
import { createMeeting, cancelMeeting, updateMeeting } from '@/lib/integrations/zoom';
import { scheduleJson, cancelJobs, isQstashEnabled } from '@/lib/integrations/qstash';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/integrations/googleCalendar';
import { config } from '@/config/unifiedConfig';
import { db } from '@/lib/drizzle';
import { sessionReminderJobs, users, courses, sessionAttendees, courseEnrollments, courseEducators, tags, orgs, parentProfiles } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sendSessionScheduledNotification, sendSessionUpdatedNotification, sendSessionCancelledNotification } from '@/lib/email';

async function scheduleSessionReminders(sessionId: string, scheduledAt: Date) {
  if (!isQstashEnabled()) return;

  const now = Date.now();
  const t_1h = scheduledAt.getTime() - 60 * 60 * 1000;
  const t_10m = scheduledAt.getTime() - 10 * 60 * 1000;
  const cronUrl = `${config.appUrl}/api/cron/session-reminder`;

  if (t_1h > now) {
    const delayMs = t_1h - now;
    const res = await scheduleJson({
      url: cronUrl,
      body: { sessionId, minutesBefore: 60 },
      delayMs,
      label: `reminder-1h-${sessionId}`,
    });
    if (res?.messageId) {
      await db
        .insert(sessionReminderJobs)
        .values({
          sessionId,
          qstashMessageId: res.messageId,
          type: 't_minus_1h',
          scheduledFor: new Date(t_1h),
        })
        .catch((err) => console.error('[sessionService] Failed to record 1h reminder job:', err));
    }
  }

  if (t_10m > now) {
    const delayMs = t_10m - now;
    const res = await scheduleJson({
      url: cronUrl,
      body: { sessionId, minutesBefore: 10 },
      delayMs,
      label: `reminder-10m-${sessionId}`,
    });
    if (res?.messageId) {
      await db
        .insert(sessionReminderJobs)
        .values({
          sessionId,
          qstashMessageId: res.messageId,
          type: 't_minus_10m',
          scheduledFor: new Date(t_10m),
        })
        .catch((err) => console.error('[sessionService] Failed to record 10m reminder job:', err));
    }
  }
}

async function cancelSessionReminders(sessionId: string) {
  try {
    const existingJobs = await db
      .select({ id: sessionReminderJobs.id, messageId: sessionReminderJobs.qstashMessageId })
      .from(sessionReminderJobs)
      .where(eq(sessionReminderJobs.sessionId, sessionId));

    if (existingJobs.length > 0) {
      const messageIds = existingJobs.map((j) => j.messageId);
      await cancelJobs(messageIds);
      await db.delete(sessionReminderJobs).where(eq(sessionReminderJobs.sessionId, sessionId));
    }
  } catch (err) {
    console.error('[sessionService] Failed to cancel reminder jobs:', err);
  }
}

async function notifySessionParties(opts: {
  type: 'scheduled' | 'updated' | 'cancelled';
  session: any;
  oldSession?: any;
  reason?: string;
}) {
  try {
    const { type, session, oldSession, reason } = opts;
    const [educator] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, session.educatorId))
      .limit(1);

    const [course] = await db
      .select({ name: courses.name })
      .from(courses)
      .where(eq(courses.id, session.courseId))
      .limit(1);

    const attendees = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(sessionAttendees)
      .innerJoin(users, eq(sessionAttendees.learnerId, users.id))
      .where(eq(sessionAttendees.sessionId, session.id));

    const studentNames = attendees.map((a) => a.name).filter(Boolean) as string[];
    const attendeeIds = attendees.map((a) => a.id);

    let parents: Array<{ name: string; email: string; learnerId: string }> = [];
    if (attendeeIds.length > 0) {
      parents = await db
        .select({
          name: parentProfiles.name,
          email: parentProfiles.email,
          learnerId: parentProfiles.learnerId,
        })
        .from(parentProfiles)
        .where(inArray(parentProfiles.learnerId, attendeeIds));
    }

    if (type === 'scheduled') {
      if (educator?.email) {
        await sendSessionScheduledNotification({
          to: educator.email,
          recipientName: educator.name || 'Educator',
          role: 'educator',
          sessionTitle: session.title,
          sessionTopic: session.topic,
          scheduledAt: new Date(session.scheduledAt),
          durationMin: session.durationMin,
          courseName: course?.name,
          studentNames,
          zoomUrl: session.zoomMeetingUrl,
        }).catch((err) => console.error('[sessionService] Failed to email educator:', err));
      }

      for (const attendee of attendees) {
        if (attendee.email) {
          await sendSessionScheduledNotification({
            to: attendee.email,
            recipientName: attendee.name || 'Learner',
            role: 'student',
            sessionTitle: session.title,
            sessionTopic: session.topic,
            scheduledAt: new Date(session.scheduledAt),
            durationMin: session.durationMin,
            courseName: course?.name,
            educatorName: educator?.name,
            zoomUrl: session.zoomMeetingUrl,
          }).catch((err) => console.error('[sessionService] Failed to email learner:', err));
        }
      }

      for (const parent of parents) {
        if (parent.email) {
          const learner = attendees.find((a) => a.id === parent.learnerId);
          await sendSessionScheduledNotification({
            to: parent.email,
            recipientName: parent.name || 'Parent',
            role: 'parent',
            sessionTitle: session.title,
            sessionTopic: session.topic,
            scheduledAt: new Date(session.scheduledAt),
            durationMin: session.durationMin,
            courseName: course?.name,
            educatorName: educator?.name,
            studentNames: learner ? [learner.name] : studentNames,
            zoomUrl: session.zoomMeetingUrl,
          }).catch((err) => console.error('[sessionService] Failed to email parent:', err));
        }
      }
    } else if (type === 'updated') {
      if (educator?.email) {
        await sendSessionUpdatedNotification({
          to: educator.email,
          recipientName: educator.name || 'Educator',
          role: 'educator',
          sessionTitle: session.title,
          sessionTopic: session.topic,
          scheduledAt: new Date(session.scheduledAt),
          durationMin: session.durationMin,
          courseName: course?.name,
          studentNames,
          zoomUrl: session.zoomMeetingUrl,
        }).catch((err) => console.error('[sessionService] Failed to email update to educator:', err));
      }

      for (const attendee of attendees) {
        if (attendee.email) {
          await sendSessionUpdatedNotification({
            to: attendee.email,
            recipientName: attendee.name || 'Learner',
            role: 'student',
            sessionTitle: session.title,
            sessionTopic: session.topic,
            scheduledAt: new Date(session.scheduledAt),
            durationMin: session.durationMin,
            courseName: course?.name,
            educatorName: educator?.name,
            zoomUrl: session.zoomMeetingUrl,
          }).catch((err) => console.error('[sessionService] Failed to email update to learner:', err));
        }
      }

      for (const parent of parents) {
        if (parent.email) {
          const learner = attendees.find((a) => a.id === parent.learnerId);
          await sendSessionUpdatedNotification({
            to: parent.email,
            recipientName: parent.name || 'Parent',
            role: 'parent',
            sessionTitle: session.title,
            sessionTopic: session.topic,
            scheduledAt: new Date(session.scheduledAt),
            durationMin: session.durationMin,
            courseName: course?.name,
            educatorName: educator?.name,
            studentNames: learner ? [learner.name] : studentNames,
            zoomUrl: session.zoomMeetingUrl,
          }).catch((err) => console.error('[sessionService] Failed to email update to parent:', err));
        }
      }
    } else if (type === 'cancelled') {
      const scheduledDate = new Date(session.scheduledAt || oldSession?.scheduledAt || Date.now());
      if (educator?.email) {
        await sendSessionCancelledNotification({
          to: educator.email,
          recipientName: educator.name || 'Educator',
          sessionTitle: session.title,
          scheduledAt: scheduledDate,
          reason,
        }).catch((err) => console.error('[sessionService] Failed to email cancel to educator:', err));
      }

      for (const attendee of attendees) {
        if (attendee.email) {
          await sendSessionCancelledNotification({
            to: attendee.email,
            recipientName: attendee.name || 'Learner',
            sessionTitle: session.title,
            scheduledAt: scheduledDate,
            reason,
          }).catch((err) => console.error('[sessionService] Failed to email cancel to learner:', err));
        }
      }

      for (const parent of parents) {
        if (parent.email) {
          await sendSessionCancelledNotification({
            to: parent.email,
            recipientName: parent.name || 'Parent',
            sessionTitle: session.title,
            scheduledAt: scheduledDate,
            reason,
          }).catch((err) => console.error('[sessionService] Failed to email cancel to parent:', err));
        }
      }
    }
  } catch (err) {
    console.error('[sessionService] notifySessionParties error:', err);
  }
}

export const sessionService = {
  async getSessions(filters: SessionQueryFilters) {
    return await sessionRepository.findMany(filters);
  },

  async createSession(data: z.infer<typeof createSessionSchema>) {
    // If learnerIds is empty, auto-link all active enrolled students of this course
    if ((!data.learnerIds || data.learnerIds.length === 0) && data.courseId) {
      const enrolledLearners = await db
        .select({ learnerId: courseEnrollments.learnerId })
        .from(courseEnrollments)
        .where(and(eq(courseEnrollments.courseId, data.courseId), eq(courseEnrollments.status, 'active')));
      if (enrolledLearners.length > 0) {
        data.learnerIds = enrolledLearners.map((l) => l.learnerId);
      }
    }

    // If educatorId is empty, auto-link the course educator
    if (!data.educatorId && data.courseId) {
      const [assigned] = await db
        .select({ educatorId: courseEducators.educatorId })
        .from(courseEducators)
        .where(eq(courseEducators.courseId, data.courseId))
        .limit(1);
      if (assigned?.educatorId) {
        data.educatorId = assigned.educatorId;
      }
    }

    let zoomMeetingId: string | null = null;
    let zoomMeetingUrl: string | null = null;

    if (data.createZoomMeeting !== false) {
      const zoom = await createMeeting({
        topic: data.title,
        agenda: data.topic,
        startTime: new Date(data.scheduledAt),
        durationMin: data.durationMin,
      });
      if (zoom) {
        zoomMeetingId = zoom.meetingId;
        zoomMeetingUrl = zoom.joinUrl;
      }
    }

    let googleCalendarEventId: string | null = null;
    const startTime = new Date(data.scheduledAt);
    const durationMin = data.durationMin || 60;
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);
    try {
      const calEvent = await createCalendarEvent(data.educatorId, {
        summary: data.title,
        description: data.topic,
        startTime,
        endTime,
        zoomJoinUrl: zoomMeetingUrl,
      });
      if (calEvent?.eventId) {
        googleCalendarEventId = calEvent.eventId;
      }
    } catch (err) {
      console.error('[sessionService] Google Calendar create event error:', err);
    }

    const sess = await sessionRepository.create({
      ...data,
      zoomMeetingId,
      zoomMeetingUrl,
      googleCalendarEventId,
    });

    // Save session tags dynamically to tags table
    if (data.tags && data.tags.length > 0) {
      const [firstOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
      const orgId = firstOrg?.id;
      if (orgId) {
        for (const rawTag of data.tags) {
          const tagName = rawTag.trim();
          if (!tagName) continue;
          const [existingTag] = await db
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.orgId, orgId), eq(tags.name, tagName)))
            .limit(1);
          if (!existingTag) {
            await db.insert(tags).values({
              orgId,
              name: tagName,
              category: 'custom',
              colorHex: '#3b82f6',
            }).catch(() => {});
          }
        }
      }
    }

    if (sess.status === 'scheduled') {
      await scheduleSessionReminders(sess.id, new Date(sess.scheduledAt));
      notifySessionParties({ type: 'scheduled', session: sess });
    }

    // If recurrence was specified, auto-create the recurring sessions series
    if (data.recurrence && data.recurrence.count > 1) {
      const { frequency, count } = data.recurrence;
      const baseDate = new Date(data.scheduledAt);

      for (let i = 1; i < count; i++) {
        const nextDate = new Date(baseDate);
        if (frequency === 'daily') {
          nextDate.setDate(nextDate.getDate() + i);
        } else if (frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + i * 7);
        } else if (frequency === 'biweekly') {
          nextDate.setDate(nextDate.getDate() + i * 14);
        } else if (frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + i);
        }

        let recZoomId = zoomMeetingId;
        let recZoomUrl = zoomMeetingUrl;
        if (data.createZoomMeeting !== false) {
          try {
            const zoomRec = await createMeeting({
              topic: `${data.title} (Session ${i + 1})`,
              agenda: data.topic,
              startTime: nextDate,
              durationMin: data.durationMin,
            });
            if (zoomRec) {
              recZoomId = zoomRec.meetingId;
              recZoomUrl = zoomRec.joinUrl;
            }
          } catch (zoomErr) {
            console.error('[sessionService] Zoom meeting creation error for recurring session:', zoomErr);
          }
        }

        const recurringSess = await sessionRepository.create({
          ...data,
          scheduledAt: nextDate.toISOString(),
          zoomMeetingId: recZoomId,
          zoomMeetingUrl: recZoomUrl,
          googleCalendarEventId: null,
        });

        if (recurringSess.status === 'scheduled') {
          await scheduleSessionReminders(recurringSess.id, nextDate);
        }
      }
    }

    return sess;
  },

  async getSessionById(id: string) {
    return await sessionRepository.findById(id);
  },

  async getSessionAttendees(sessionId: string) {
    return await sessionRepository.getAttendees(sessionId);
  },

  async getSessionFeedback(sessionId: string) {
    return await sessionRepository.getFeedback(sessionId);
  },

  async submitSessionFeedback(sessionId: string, data: any, educatorId: string, courseId: string) {
    const existing = await sessionRepository.getFeedback(sessionId);
    if (existing) {
      throw new Error('Feedback already submitted for this session');
    }
    return await sessionRepository.submitFeedback(sessionId, data, educatorId, courseId);
  },

  async updateSession(id: string, data: any) {
    const existing = await sessionRepository.findById(id);
    const updated = await sessionRepository.update(id, data);

    if (data.status === 'cancelled') {
      if (existing?.zoomMeetingId) {
        await cancelMeeting(existing.zoomMeetingId);
      }
      if (existing?.googleCalendarEventId && existing?.educatorId) {
        await deleteCalendarEvent(existing.educatorId, existing.googleCalendarEventId).catch((err) =>
          console.error('[sessionService] Google Calendar delete failed:', err),
        );
      }
      await cancelSessionReminders(id);
      notifySessionParties({
        type: 'cancelled',
        session: updated || existing,
        oldSession: existing,
        reason: data.cancellationReason,
      });
    } else {
      const isRescheduled =
        data.scheduledAt &&
        existing &&
        new Date(existing.scheduledAt).getTime() !== new Date(data.scheduledAt).getTime();
      const isContentChanged = Boolean(data.title || data.topic || data.durationMin);

      if (isRescheduled) {
        await cancelSessionReminders(id);
        if (updated?.status === 'scheduled') {
          await scheduleSessionReminders(id, new Date(data.scheduledAt));
        }
      }

      if (isRescheduled || isContentChanged) {
        notifySessionParties({
          type: 'updated',
          session: updated || existing,
          oldSession: existing,
        });
      }

      if (existing?.zoomMeetingId && (isRescheduled || isContentChanged)) {
        await updateMeeting(existing.zoomMeetingId, {
          topic: data.title ?? existing.title,
          agenda: data.topic !== undefined ? data.topic : existing.topic,
          startTime: data.scheduledAt ? new Date(data.scheduledAt) : new Date(existing.scheduledAt),
          durationMin: data.durationMin ?? existing.durationMin,
        }).catch((err) => console.error('[sessionService] Zoom updateMeeting failed:', err));
      }

      if (existing?.googleCalendarEventId && existing?.educatorId && (isRescheduled || isContentChanged)) {
        const newStart = data.scheduledAt ? new Date(data.scheduledAt) : new Date(existing.scheduledAt);
        const newDuration = data.durationMin ?? existing.durationMin ?? 60;
        const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000);
        await updateCalendarEvent(existing.educatorId, existing.googleCalendarEventId, {
          summary: data.title ?? existing.title,
          description: data.topic !== undefined ? data.topic : existing.topic,
          startTime: newStart,
          endTime: newEnd,
        }).catch((err) => console.error('[sessionService] Google Calendar update event failed:', err));
      }
    }

    return updated;
  },

  async deleteSession(id: string) {
    const existing = await sessionRepository.findById(id);
    if (existing?.zoomMeetingId) {
      await cancelMeeting(existing.zoomMeetingId);
    }
    if (existing?.googleCalendarEventId && existing?.educatorId) {
      await deleteCalendarEvent(existing.educatorId, existing.googleCalendarEventId).catch((err) =>
        console.error('[sessionService] Google Calendar delete failed:', err),
      );
    }
    await cancelSessionReminders(id);
    return await sessionRepository.delete(id);
  },
};
