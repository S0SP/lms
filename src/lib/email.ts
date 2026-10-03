import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '@/config/unifiedConfig';
import { db } from '@/lib/drizzle';
import { emailLog } from '@/db/schema';
import { formatInTimeZone } from 'date-fns-tz';

export const FROM = config.email.from || 'UnboundYou <team@unboundyou.com>';

let transporter: Transporter | null = null;

/**
 * Lazily builds the SMTP transport. Returns null when SMTP is unconfigured so
 * callers can log-and-continue instead of crashing a background job.
 */
function getTransporter(): Transporter | null {
  if (!config.email.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpPort === 465,
      auth: { user: config.email.smtpUser, pass: config.email.smtpPass },
    });
  }
  return transporter;
}

/** Records an outbound email attempt so admins can audit deliverability. */
async function logEmail(opts: {
  to: string;
  template: string;
  subject: string;
  status: 'sent' | 'skipped' | 'failed';
  messageId?: string;
  error?: string;
}) {
  await db
    .insert(emailLog)
    .values({
      toEmail: opts.to,
      subject: opts.subject,
      template: opts.template,
      status: opts.status,
      messageId: opts.messageId,
      error: opts.error,
      sentAt: opts.status === 'sent' ? new Date() : null,
    })
    .catch((error) => console.error('[email] failed to write log:', error));
}

/**
 * Sends an email. Never throws — a failed notification must not roll back the
 * business transaction that triggered it. Returns true when actually sent.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  meta: { template?: string } = {},
): Promise<boolean> {
  const template = meta.template ?? 'generic';
  const smtp = getTransporter();

  if (!smtp) {
    console.log(`[email skipped — SMTP unconfigured] To: ${to} | Subject: ${subject}`);
    await logEmail({ to, subject, template, status: 'skipped' });
    return false;
  }

  try {
    const info = await smtp.sendMail({ from: FROM, to, subject, html });
    await logEmail({ to, subject, template, status: 'sent', messageId: info.messageId });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[email error]', message);
    await logEmail({ to, subject, template, status: 'failed', error: message });
    return false;
  }
}

// ─── Branded Template Helpers ──────────────────────────────────────────────────

function emailHeader(appUrl: string): string {
  return `
    <div style="margin-bottom: 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <img src="${appUrl}/logos/logo_icon.png" width="40" height="40" alt="UnboundYou" style="display: block; border: 0; outline: none; border-radius: 8px;" />
          </td>
          <td style="vertical-align: middle;">
            <span style="font-size: 22px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">
              <span style="color: #0284c7;">Unbound</span><span style="color: #2563eb;">You</span>
            </span>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function layout(opts: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  accountBox?: string;
  buttonUrl?: string;
  buttonLabel?: string;
  footerNote?: string;
}): string {
  const appUrl = config.appUrl || 'https://learn.unboundyou.com';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${opts.title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); text-align: left;">
            <tr>
              <td style="padding: 36px 36px 32px 36px;">
                ${emailHeader(appUrl)}

                <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.02em;">
                  ${opts.title}
                </h1>
                ${opts.subtitle ? `<p style="font-size: 15px; color: #475569; margin: 0 0 24px 0;">${opts.subtitle}</p>` : '<div style="margin-bottom: 20px;"></div>'}

                <div style="font-size: 14px; line-height: 1.65; color: #334155;">
                  ${opts.bodyHtml}
                </div>

                ${opts.accountBox ? `
                  <div style="border-top: 1px solid #e2e8f0; margin: 28px 0 24px 0;"></div>
                  ${opts.accountBox}
                ` : ''}

                ${opts.buttonUrl && opts.buttonLabel ? `
                  <div style="margin: 28px 0 24px 0;">
                    <a href="${opts.buttonUrl}" style="display: block; text-align: center; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.01em;">
                      ${opts.buttonLabel}
                    </a>
                  </div>
                ` : ''}

                <div style="border-top: 1px solid #e2e8f0; margin: 24px 0 20px 0;"></div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size: 14px; font-weight: 700; color: #0f172a;">
                      UnboundYou
                    </td>
                    <td align="right" style="font-size: 12px; color: #94a3b8;">
                      ${opts.footerNote || 'Personalised IGCSE Learning'}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Renders a timestamp in the recipient's timezone, falling back to UTC. */
function formatWhen(date: Date, timezone?: string | null): string {
  try {
    return formatInTimeZone(date, timezone || 'UTC', "EEE, d MMM yyyy 'at' h:mm a zzz");
  } catch {
    return date.toISOString();
  }
}

// ─── Typed Templates ──────────────────────────────────────────────────────────

/**
 * Learner Onboarding Email (Matching Screenshot 3)
 */
export async function sendLearnerInvite(opts: {
  to: string;
  name: string;
  phone?: string | null;
  pin: string;
  loginUrl?: string;
  parentName?: string | null;
}) {
  const platformUrl = opts.loginUrl || `${config.appUrl}/login`;
  const subject = 'UnboundYou added you as Learner';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">We're glad to have you onboard!</p>
    <p style="margin: 0 0 16px 0;">Welcome to UnboundYou your personalised learning partner for IGCSE success.</p>
    <p style="margin: 0 0 16px 0;">Here, it's 1 Educator : 1 Scholar every session is tailored to the learner's pace, goals, and Cambridge curriculum needs. No distractions, just focused learning that delivers real results.</p>
    <p style="margin: 0 0 16px 0;">Parents, expect structured guidance, individual attention, and measurable progress. Scholars, this is your space to ask freely, think critically, and master your subjects with confidence.</p>
    <p style="margin: 0 0 16px 0;"><strong>This is IGCSE learning done right.</strong></p>
    <p style="margin: 0 0 20px 0;">
      Let's begin the journey,<br/>
      <strong>Team UnboundYou</strong>
    </p>
    <p style="margin: 0; color: #475569;">Your <strong>Learner</strong> account on our platform is ready.</p>
  `;

  const accountBox = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #0284c7; text-transform: uppercase; margin: 0 0 16px 0;">LEARNER ACCOUNT</p>

      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Email</span>
        <span style="font-size: 14px; font-weight: 600; color: #0284c7;">${opts.to}</span>
      </div>

      ${opts.phone ? `
      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Phone Number</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${opts.phone}</span>
      </div>
      ` : ''}

      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login PIN</span>
        <div style="display: inline-block; background-color: #ffffff; border: 2px solid #0284c7; border-radius: 8px; padding: 6px 16px; font-size: 22px; font-weight: 800; letter-spacing: 4px; color: #0f172a;">
          ${opts.pin}
        </div>
      </div>

      <div>
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Platform URL</span>
        <a href="${platformUrl}" style="font-size: 14px; font-weight: 500; color: #0284c7; text-decoration: underline;">${platformUrl}</a>
      </div>
    </div>
  `;

  const html = layout({
    title: 'Welcome to UnboundYou',
    subtitle: `You've been added as <span style="font-weight: 600; color: #0284c7;">Learner</span>`,
    bodyHtml,
    accountBox,
    buttonUrl: platformUrl,
    buttonLabel: 'Get Started',
  });

  return sendEmail(opts.to, subject, html, { template: 'learner_invite' });
}

/**
 * Educator Onboarding Email (Matching Screenshot 4)
 */
export async function sendEducatorInvite(opts: {
  to: string;
  name: string;
  phone?: string | null;
  loginUrl?: string;
  tempPassword?: string;
}) {
  const platformUrl = opts.loginUrl || `${config.appUrl}/login`;
  const subject = 'UnboundYou added you as Educator';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">We're glad to have you onboard!</p>
    <p style="margin: 0 0 20px 0;">Your <strong>Educator</strong> account on our platform is ready.</p>
    <p style="margin: 0; color: #475569;">Your Gmail address (${opts.to}) has been whitelisted. You can log in directly using <strong>Google Sign-In</strong>. No PIN is required.</p>
  `;

  const accountBox = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #059669; text-transform: uppercase; margin: 0 0 16px 0;">EDUCATOR ACCOUNT</p>

      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Email</span>
        <span style="font-size: 14px; font-weight: 600; color: #059669;">${opts.to}</span>
      </div>

      ${opts.phone ? `
      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Phone Number</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${opts.phone}</span>
      </div>
      ` : ''}

      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Access</span>
        <span style="font-size: 13px; font-weight: 600; color: #0f172a;">Google Sign In (Whitelisted Email)</span>
      </div>

      <div>
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Platform URL</span>
        <a href="${platformUrl}" style="font-size: 14px; font-weight: 500; color: #059669; text-decoration: underline;">${platformUrl}</a>
      </div>
    </div>
  `;

  const html = layout({
    title: 'Welcome to UnboundYou',
    subtitle: `You've been added as <span style="font-weight: 600; color: #059669;">Educator</span>`,
    bodyHtml,
    accountBox,
    buttonUrl: platformUrl,
    buttonLabel: 'Get Started',
  });

  return sendEmail(opts.to, subject, html, { template: 'educator_invite' });
}

/**
 * Parent Onboarding Email
 */
export async function sendParentInvite(opts: {
  to: string;
  name: string;
  phone?: string | null;
  learnerName?: string | null;
  loginUrl?: string;
}) {
  const platformUrl = opts.loginUrl || `${config.appUrl}/login`;
  const subject = 'UnboundYou added you as Parent';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">We're glad to have you onboard!</p>
    <p style="margin: 0 0 16px 0;">Your <strong>Parent</strong> account on our platform is ready${opts.learnerName ? ` for monitoring <strong>${opts.learnerName}</strong>'s learning progress` : ''}.</p>
    <p style="margin: 0; color: #475569;">Your Gmail address (${opts.to}) has been whitelisted. You can sign in easily with <strong>Google Sign-In</strong> to track your scholar's classes, attendance, reports, and session feedback.</p>
  `;

  const accountBox = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #7c3aed; text-transform: uppercase; margin: 0 0 16px 0;">PARENT ACCOUNT</p>

      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Email</span>
        <span style="font-size: 14px; font-weight: 600; color: #7c3aed;">${opts.to}</span>
      </div>

      ${opts.phone ? `
      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Phone Number</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${opts.phone}</span>
      </div>
      ` : ''}

      ${opts.learnerName ? `
      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Scholar</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${opts.learnerName}</span>
      </div>
      ` : ''}

      <div style="margin-bottom: 14px;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Login Access</span>
        <span style="font-size: 13px; font-weight: 600; color: #0f172a;">Google Sign In (Whitelisted Email)</span>
      </div>

      <div>
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 3px;">Platform URL</span>
        <a href="${platformUrl}" style="font-size: 14px; font-weight: 500; color: #7c3aed; text-decoration: underline;">${platformUrl}</a>
      </div>
    </div>
  `;

  const html = layout({
    title: 'Welcome to UnboundYou',
    subtitle: `You've been added as <span style="font-weight: 600; color: #7c3aed;">Parent</span>`,
    bodyHtml,
    accountBox,
    buttonUrl: platformUrl,
    buttonLabel: 'Get Started',
  });

  return sendEmail(opts.to, subject, html, { template: 'parent_invite' });
}

/**
 * Resend / Request PIN Email for Learners
 */
export async function sendPinReminderEmail(opts: {
  to: string;
  name: string;
  pin: string;
  loginUrl?: string;
}) {
  const platformUrl = opts.loginUrl || `${config.appUrl}/login`;
  const subject = 'Your UnboundYou Login PIN';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Dear <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Here is your 4-digit PIN to sign in to your UnboundYou learner account:</p>
  `;

  const accountBox = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
      <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.05em; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 12px;">YOUR LOGIN PIN</span>
      <div style="display: inline-block; background-color: #ffffff; border: 2px solid #0284c7; border-radius: 12px; padding: 10px 24px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin-bottom: 16px;">
        ${opts.pin}
      </div>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Enter this 4-digit PIN on the login screen to access your portal.</p>
    </div>
  `;

  const html = layout({
    title: 'Your Login PIN',
    subtitle: 'UnboundYou Student Access',
    bodyHtml,
    accountBox,
    buttonUrl: platformUrl,
    buttonLabel: 'Login to Portal',
    footerNote: 'If you did not request this, please contact support.',
  });

  return sendEmail(opts.to, subject, html, { template: 'pin_reminder' });
}

/**
 * Session Scheduled Notification (Educator, Learner, Parent)
 */
export async function sendSessionScheduledNotification(opts: {
  to: string;
  recipientName: string;
  role: 'student' | 'educator' | 'parent';
  sessionTitle: string;
  sessionTopic?: string | null;
  scheduledAt: Date;
  durationMin: number;
  courseName?: string | null;
  educatorName?: string | null;
  studentNames?: string[];
  zoomUrl?: string | null;
  timezone?: string | null;
}) {
  const when = formatWhen(opts.scheduledAt, opts.timezone);
  const subject =
    opts.role === 'educator'
      ? `New Session Scheduled: ${opts.sessionTitle} (${when})`
      : opts.role === 'parent'
      ? `New Class Scheduled for ${opts.recipientName}: ${opts.sessionTitle} (${when})`
      : `New Class Scheduled: ${opts.sessionTitle} (${when})`;

  const portalUrl = `${config.appUrl}/${opts.role === 'educator' ? 'educator/calendar' : 'student/calendar'}`;

  const detailsHtml = `
    <table role="presentation" cellpadding="8" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;width:100%;">
      ${opts.courseName ? `<tr><td style="color:#64748b;width:130px;font-size:13px;font-weight:600;">Course</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.courseName}</td></tr>` : ''}
      <tr><td style="color:#64748b;width:130px;font-size:13px;font-weight:600;">Date &amp; Time</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${when}</td></tr>
      <tr><td style="color:#64748b;font-size:13px;font-weight:600;">Duration</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.durationMin} minutes</td></tr>
      ${opts.educatorName ? `<tr><td style="color:#64748b;font-size:13px;font-weight:600;">Educator</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.educatorName}</td></tr>` : ''}
      ${opts.studentNames && opts.studentNames.length > 0 ? `<tr><td style="color:#64748b;font-size:13px;font-weight:600;">Scholar(s)</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.studentNames.join(', ')}</td></tr>` : ''}
      ${opts.sessionTopic ? `<tr><td style="color:#64748b;font-size:13px;font-weight:600;">Topic</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.sessionTopic}</td></tr>` : ''}
    </table>
  `;

  const heading = opts.role === 'educator' ? 'New Teaching Session Scheduled' : 'New Class Scheduled';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">A new ${opts.role === 'educator' ? 'teaching session' : 'class'} has been scheduled on your UnboundYou calendar:</p>
    ${detailsHtml}
    ${opts.zoomUrl ? `
      <div style="margin: 20px 0 16px 0;">
        <a href="${opts.zoomUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 13px; font-weight: 600;">
          Join Zoom Meeting
        </a>
      </div>
    ` : '<p style="font-size: 13px; color: #64748b;"><em>The meeting link will be accessible directly inside your portal.</em></p>'}
  `;

  const html = layout({
    title: heading,
    subtitle: opts.sessionTitle,
    bodyHtml,
    buttonUrl: portalUrl,
    buttonLabel: 'View in Calendar',
  });

  return sendEmail(opts.to, subject, html, { template: 'session_scheduled' });
}

/**
 * Session Updated / Rescheduled Notification
 */
export async function sendSessionUpdatedNotification(opts: {
  to: string;
  recipientName: string;
  role: 'student' | 'educator' | 'parent';
  sessionTitle: string;
  sessionTopic?: string | null;
  scheduledAt: Date;
  durationMin: number;
  courseName?: string | null;
  educatorName?: string | null;
  studentNames?: string[];
  zoomUrl?: string | null;
  timezone?: string | null;
  changeNote?: string;
}) {
  const when = formatWhen(opts.scheduledAt, opts.timezone);
  const subject = `Session Rescheduled: ${opts.sessionTitle} (${when})`;
  const portalUrl = `${config.appUrl}/${opts.role === 'educator' ? 'educator/calendar' : 'student/calendar'}`;

  const detailsHtml = `
    <table role="presentation" cellpadding="8" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;width:100%;">
      ${opts.courseName ? `<tr><td style="color:#64748b;width:130px;font-size:13px;font-weight:600;">Course</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.courseName}</td></tr>` : ''}
      <tr><td style="color:#64748b;width:130px;font-size:13px;font-weight:600;">New Date &amp; Time</td><td style="font-weight:700;font-size:14px;color:#2563eb;">${when}</td></tr>
      <tr><td style="color:#64748b;font-size:13px;font-weight:600;">Duration</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.durationMin} minutes</td></tr>
      ${opts.educatorName ? `<tr><td style="color:#64748b;font-size:13px;font-weight:600;">Educator</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.educatorName}</td></tr>` : ''}
      ${opts.studentNames && opts.studentNames.length > 0 ? `<tr><td style="color:#64748b;font-size:13px;font-weight:600;">Scholar(s)</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.studentNames.join(', ')}</td></tr>` : ''}
      ${opts.sessionTopic ? `<tr><td style="color:#64748b;font-size:13px;font-weight:600;">Topic</td><td style="font-weight:600;font-size:14px;color:#0f172a;">${opts.sessionTopic}</td></tr>` : ''}
    </table>
  `;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">The following session has been <strong>rescheduled/updated</strong>:</p>
    ${detailsHtml}
    ${opts.changeNote ? `<p style="font-size: 13px; color: #475569; margin: 12px 0;"><strong>Update note:</strong> ${opts.changeNote}</p>` : ''}
    ${opts.zoomUrl ? `
      <div style="margin: 20px 0 16px 0;">
        <a href="${opts.zoomUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 13px; font-weight: 600;">
          Join Zoom Meeting
        </a>
      </div>
    ` : ''}
  `;

  const html = layout({
    title: 'Session Rescheduled',
    subtitle: opts.sessionTitle,
    bodyHtml,
    buttonUrl: portalUrl,
    buttonLabel: 'View in Calendar',
  });

  return sendEmail(opts.to, subject, html, { template: 'session_updated' });
}

/**
 * Session Cancelled Notification
 */
export async function sendSessionCancelledNotification(opts: {
  to: string;
  recipientName: string;
  sessionTitle: string;
  scheduledAt: Date;
  timezone?: string | null;
  reason?: string;
}) {
  const when = formatWhen(opts.scheduledAt, opts.timezone);
  const subject = `Session Cancelled: ${opts.sessionTitle}`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.recipientName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Please note that the following session originally scheduled for <strong>${when}</strong> has been cancelled:</p>
    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="font-size: 14px; font-weight: 600; color: #991b1b; margin: 0 0 4px 0;">${opts.sessionTitle}</p>
      ${opts.reason ? `<p style="font-size: 13px; color: #b91c1c; margin: 0;">Reason: ${opts.reason}</p>` : ''}
    </div>
    <p style="font-size: 13px; color: #64748b; margin: 0;">If you have any questions or would like to reschedule, please contact your coordinator.</p>
  `;

  const html = layout({
    title: 'Session Cancelled',
    bodyHtml,
    buttonUrl: `${config.appUrl}/login`,
    buttonLabel: 'Open Platform',
  });

  return sendEmail(opts.to, subject, html, { template: 'session_cancelled' });
}

/**
 * User Account Changes Notification
 */
export async function sendUserUpdatedNotification(opts: {
  to: string;
  name: string;
  role: string;
  changesSummary: string;
}) {
  const subject = 'Your UnboundYou account details were updated';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">This is a notification that administrative updates have been made to your <strong>${opts.role}</strong> account:</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; color: #334155;">
      ${opts.changesSummary}
    </div>
    <p style="font-size: 13px; color: #64748b; margin: 0;">If you did not expect these changes or notice any discrepancy, please contact UnboundYou support immediately.</p>
  `;

  const html = layout({
    title: 'Account Updated',
    bodyHtml,
    buttonUrl: `${config.appUrl}/login`,
    buttonLabel: 'Go to Portal',
  });

  return sendEmail(opts.to, subject, html, { template: 'user_updated' });
}

export async function sendSessionReminder(opts: {
  to: string;
  name: string;
  sessionTitle: string;
  sessionTopic?: string | null;
  scheduledAt: Date;
  zoomUrl: string | null;
  minutesBefore: number;
  timezone?: string | null;
}) {
  const when = formatWhen(opts.scheduledAt, opts.timezone);
  const subject = `Reminder: ${opts.sessionTitle} starts in ${opts.minutesBefore} min`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Your session <strong>${opts.sessionTitle}</strong>${opts.sessionTopic ? ` (${opts.sessionTopic})` : ''} is starting in <strong>${opts.minutesBefore} minutes</strong> (${when}).</p>
    ${opts.zoomUrl ? `
      <div style="margin: 20px 0 16px 0;">
        <a href="${opts.zoomUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 13px; font-weight: 600;">
          Join Zoom Meeting
        </a>
      </div>
    ` : '<p style="font-size: 13px; color: #64748b;"><em>Meeting link is available in your portal.</em></p>'}
  `;

  const html = layout({
    title: `Session Starting in ${opts.minutesBefore} Minutes`,
    subtitle: opts.sessionTitle,
    bodyHtml,
    buttonUrl: `${config.appUrl}/login`,
    buttonLabel: 'Open Portal',
  });

  return sendEmail(opts.to, subject, html, { template: 'session_reminder' });
}

export async function sendAdminInvite(opts: {
  to: string;
  name: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">An administrator account has been created for you on UnboundYou LMS.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px;"><span style="color: #64748b;">Email:</span> <strong>${opts.to}</strong></p>
      <p style="margin: 0; font-size: 13px;"><span style="color: #64748b;">Temporary Password:</span> <strong>${opts.tempPassword}</strong></p>
    </div>
  `;

  const html = layout({
    title: 'Admin Account Invitation',
    bodyHtml,
    buttonUrl: opts.loginUrl,
    buttonLabel: 'Access Admin Portal',
  });

  return sendEmail(opts.to, 'Welcome — your admin account is ready', html, {
    template: 'admin_invite',
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  tempPassword: string;
  loginUrl: string;
}) {
  return sendEducatorInvite(opts);
}

export async function sendConsultationConfirmation(opts: {
  to: string;
  name: string;
  slotAt: Date;
  courseName?: string | null;
  timezone?: string | null;
}) {
  const when = formatWhen(opts.slotAt, opts.timezone);
  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Thank you for your interest${opts.courseName ? ` in <strong>${opts.courseName}</strong>` : ''}.</p>
    <p style="margin: 0 0 16px 0;">Our team will contact you to confirm your free consultation slot on <strong>${when}</strong>.</p>
  `;

  const html = layout({
    title: 'Consultation Confirmed',
    bodyHtml,
  });

  return sendEmail(opts.to, 'We received your consultation request', html, { template: 'consultation_confirmation' });
}

export async function sendProgressReport(opts: {
  to: string;
  name: string;
  courseName: string;
  monthYear: string;
  reportUrl: string;
}) {
  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Your progress report for <strong>${opts.courseName}</strong> covering ${opts.monthYear} is ready.</p>
  `;

  const html = layout({
    title: `${opts.monthYear} Progress Report`,
    bodyHtml,
    buttonUrl: opts.reportUrl,
    buttonLabel: 'View Progress Report',
  });

  return sendEmail(opts.to, `Your ${opts.monthYear} progress report is ready`, html, {
    template: 'progress_report',
  });
}
