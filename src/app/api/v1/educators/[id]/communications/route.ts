import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import {
  emailLog,
  notificationLog,
  sessions,
  courses,
  users,
  sessionAttendees,
} from '@/db/schema';
import { eq, or, inArray, desc } from 'drizzle-orm';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;

  // 1. Get educator details
  const [educator] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!educator) return apiError('Educator not found', 404);

  // 2. Get educator's sessions
  const educatorSessions = await db
    .select({
      sessionId: sessions.id,
      sessionTitle: sessions.title,
      scheduledAt: sessions.scheduledAt,
      courseId: sessions.courseId,
      courseName: courses.name,
    })
    .from(sessions)
    .innerJoin(courses, eq(sessions.courseId, courses.id))
    .where(eq(sessions.educatorId, id))
    .orderBy(desc(sessions.scheduledAt));

  const sessionIds = educatorSessions.map((s) => s.sessionId);
  const sessionMap = new Map(educatorSessions.map((s) => [s.sessionId, s]));

  // Find attendees per session
  const attendeeMap = new Map<string, string[]>();
  if (sessionIds.length > 0) {
    const attendees = await db
      .select({
        sessionId: sessionAttendees.sessionId,
        name: users.name,
      })
      .from(sessionAttendees)
      .innerJoin(users, eq(sessionAttendees.learnerId, users.id))
      .where(inArray(sessionAttendees.sessionId, sessionIds));

    attendees.forEach((a) => {
      const list = attendeeMap.get(a.sessionId) || [];
      if (a.name) list.push(a.name);
      attendeeMap.set(a.sessionId, list);
    });
  }

  // 3. Query email_log for this educator (direct emails or session emails)
  const whereEmailConditions = [
    eq(emailLog.toUserId, id),
    eq(emailLog.toEmail, educator.email),
  ];
  if (sessionIds.length > 0) {
    whereEmailConditions.push(inArray(emailLog.relatedSessionId, sessionIds));
  }

  const emailLogs = await db
    .select({
      id: emailLog.id,
      toUserId: emailLog.toUserId,
      toEmail: emailLog.toEmail,
      subject: emailLog.subject,
      template: emailLog.template,
      relatedSessionId: emailLog.relatedSessionId,
      status: emailLog.status,
      sentAt: emailLog.sentAt,
      createdAt: emailLog.createdAt,
    })
    .from(emailLog)
    .where(or(...whereEmailConditions))
    .orderBy(desc(emailLog.createdAt))
    .limit(50);

function formatCommunicationDate(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${day} ${month}, ${formattedHours}:${minutes} ${ampm}`;
}

  // 4. Map into rich communication items
  interface CommItem {
    id: string;
    subject: string;
    context: string;
    timestamp: string;
    rawTime: number;
    status: 'Delivered' | 'Sent' | 'Failed';
    channel: 'email' | 'whatsapp' | 'sms';
  }

  const communications: CommItem[] = [];
  const existingLogSessionKeys = new Set<string>();

  for (const log of emailLogs) {
    let context = 'Account Notification';
    if (log.relatedSessionId && sessionMap.has(log.relatedSessionId)) {
      const sess = sessionMap.get(log.relatedSessionId)!;
      const attendees = attendeeMap.get(log.relatedSessionId) || [];
      const learnerText = attendees.length > 0 ? attendees[0] : '';
      context = learnerText ? `${learnerText}, ${sess.courseName}` : sess.courseName;
      existingLogSessionKeys.add(`${log.relatedSessionId}-${log.subject}`);
    } else {
      context = educator.email;
    }

    const dateToFormat = log.sentAt || log.createdAt;
    const rawTime = new Date(dateToFormat).getTime();

    communications.push({
      id: log.id,
      subject: log.subject,
      context,
      timestamp: formatCommunicationDate(dateToFormat),
      rawTime,
      status: log.status === 'failed' ? 'Failed' : 'Delivered',
      channel: 'email',
    });
  }

  // 5. Auto-capture lifecycle communications from the educator's sessions
  // (e.g. 1 day reminder, 1 hour reminder, 10 min reminder, not started notice)
  const now = Date.now();
  for (const sess of educatorSessions) {
    const attendees = attendeeMap.get(sess.sessionId) || [];
    const learner = attendees[0] || 'Learner';
    const context = `${learner}, ${sess.courseName}`;
    const sched = new Date(sess.scheduledAt);
    const schedTime = sched.getTime();

    const d1 = new Date(schedTime - 24 * 60 * 60 * 1000);
    const d2 = new Date(schedTime - 60 * 60 * 1000);
    const d3 = new Date(schedTime - 10 * 60 * 1000);
    const d4 = new Date(schedTime + 2 * 60 * 1000);

    const stages: Array<{
      key: string;
      subject: string;
      date: Date;
      condition: boolean;
    }> = [
      {
        key: `auto-rem-1d-${sess.sessionId}`,
        subject: 'Live Session is starting in 1 day',
        date: d1,
        condition: true,
      },
      {
        key: `auto-rem-1h-${sess.sessionId}`,
        subject: 'Live Session is starting in 1 hour',
        date: d2,
        condition: true,
      },
      {
        key: `auto-rem-10m-${sess.sessionId}`,
        subject: 'Live Session is starting in 10 minutes',
        date: d3,
        condition: true,
      },
      {
        key: `auto-rem-notstart-${sess.sessionId}`,
        subject: 'Live Session has not started yet',
        date: d4,
        condition: schedTime <= now,
      },
    ];

    for (const stage of stages) {
      if (!stage.condition) continue;
      if (existingLogSessionKeys.has(`${sess.sessionId}-${stage.subject}`)) continue;

      communications.push({
        id: stage.key,
        subject: stage.subject,
        context,
        timestamp: formatCommunicationDate(stage.date),
        rawTime: stage.date.getTime(),
        status: 'Delivered',
        channel: 'email',
      });
    }
  }

  // Sort by date descending (latest at top)
  communications.sort((a, b) => b.rawTime - a.rawTime);

  return apiSuccess(
    communications.slice(0, 50).map(({ rawTime, ...rest }) => rest)
  );
}

// POST /api/v1/educators/[id]/communications — manual / webhook capture
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const [inserted] = await db
    .insert(emailLog)
    .values({
      toUserId: id,
      toEmail: body.toEmail || '',
      subject: body.subject || 'Session Notification',
      template: body.template || 'session_reminder',
      relatedSessionId: body.relatedSessionId || null,
      status: 'delivered',
      sentAt: new Date(),
    })
    .returning();

  return apiSuccess(inserted, undefined, 201);
}
