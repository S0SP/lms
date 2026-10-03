import { z } from 'zod';

/**
 * Single source of truth for every environment variable.
 *
 * Design rules:
 *  1. Secrets are OPTIONAL. A missing key never crashes the process — instead the
 *     owning integration degrades gracefully (see `integrationStatus` below).
 *     This lets the app boot in local dev with a minimal .env.
 *  2. Booleans are parsed leniently so "true"/"1"/"yes" all work.
 *  3. Nothing outside this file reads `process.env` directly.
 */

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase()),
  );

const configSchema = z.object({
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/lms'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // ─── Auth ───────────────────────────────────────────────────────────────────
  AUTH_SECRET: z.string().min(1).default('development_secret_do_not_use_in_prod'),
  AUTH_TRUST_HOST: boolish.optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).default('dummy_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default('dummy_google_client_secret'),

  // ─── Upstash Redis (rate limiting) ──────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ─── Upstash QStash (scheduled jobs: session reminders, report generation) ───
  QSTASH_URL: z.string().url().default('https://qstash.upstash.io'),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),

  // ─── Zoom (Server-to-Server OAuth + attendance webhooks) ───────────────────
  ZOOM_ACCOUNT_ID: z.string().min(1).optional(),
  ZOOM_CLIENT_ID: z.string().min(1).optional(),
  ZOOM_CLIENT_SECRET: z.string().min(1).optional(),
  ZOOM_WEBHOOK_SECRET: z.string().min(1).optional(),

  // ─── Google Calendar (two-way sync per educator) ───────────────────────────
  GOOGLE_CALENDAR_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_CALENDAR_WEBHOOK_TOKEN: z.string().min(1).optional(),

  // ─── Ably (realtime chat fan-out over Postgres) ────────────────────────────
  ABLY_API_KEY: z.string().min(1).optional(),
  /** Poll interval (ms) used when Ably is not configured. */
  CHAT_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),

  // ─── Gemini (AI progress-report synthesis & transcript analysis) ────────────
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),

  // ─── Anthropic (AI progress-report synthesis) ──────────────────────────────
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-sonnet-5'),

  // ─── Cloudflare R2 / S3 (avatars, course materials, report PDFs) ────────────
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1).optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().url().optional(),

  // ─── Email / SMTP ───────────────────────────────────────────────────────────
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().optional().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default('UnboundYou <team@unboundyou.com>'),

  // ─── Razorpay (INR payments) ───────────────────────────────────────────────
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

  // ─── Seed / demo bootstrap ─────────────────────────────────────────────────
  /** When true, auth auto-provisions demo accounts on first login. */
  ENABLE_DEMO_ACCOUNTS: boolish.default(false),

  // ─── Serverless detection ──────────────────────────────────────────────────
  VERCEL: z.string().optional(),
  AWS_LAMBDA_FUNCTION_NAME: z.string().optional(),
  CF_PAGES: z.string().optional(),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

const env = parsed.data;

const isServerless = Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.CF_PAGES);
const isProd = env.NODE_ENV === 'production';

/**
 * True when a credential was supplied AND is not a documentation placeholder.
 * Placeholder values are filtered so a copied .env.example cannot silently
 * masquerade as a working integration.
 */
function provided(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v === '') return false;
  // `dummy_*` is the placeholder prefix used by this file's own defaults, so it
  // must be rejected too or a provider looks configured when it is not.
  return !/^(dummy[_-]|your-|xxx|placeholder|generate-with|changeme)/i.test(v);
}

function isProdSafe(name: string, ok: boolean): boolean {
  if (ok) return true;
  if (isProd) {
    console.warn(`[config] ${name} is not configured — this feature is disabled in production.`);
  }
  return false;
}

/** Logs a one-line warning for each disabled integration (production only). */
export function warnDisabledIntegrations(): void {
  if (!isProd) return;
  const missing: string[] = [];
  if (!config.upstash.enabled) missing.push('Upstash Redis (rate limiting)');
  if (!config.qstash.enabled) missing.push('QStash (scheduled jobs)');
  if (!config.zoom.enabled) missing.push('Zoom (video meetings)');
  if (!config.googleCalendar.enabled) missing.push('Google Calendar (sync)');
  if (!config.ably.enabled) missing.push('Ably (realtime chat — will poll)');
  if (!config.anthropic.enabled) missing.push('Anthropic (AI reports)');
  if (!config.cloudflare.enabled) missing.push('Cloudflare R2 (file uploads)');
  if (!config.email.enabled) missing.push('SMTP (transactional email)');
  if (!config.razorpay.enabled) missing.push('Razorpay (payments)');
  if (missing.length > 0) {
    console.warn(`[config] Disabled integrations in production: ${missing.join(', ')}`);
  }
}

export const config = {
  env: env.NODE_ENV,
  isProd,
  appUrl: env.APP_URL,

  db: {
    url: env.DATABASE_URL,
    isServerless,
  },

  auth: {
    authSecret: env.AUTH_SECRET,
    trustHost: env.AUTH_TRUST_HOST,
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    googleSsoEnabled: isProdSafe('GOOGLE_CLIENT_ID', provided(env.GOOGLE_CLIENT_ID)),
  },

  upstash: {
    redisRestUrl: env.UPSTASH_REDIS_REST_URL,
    redisRestToken: env.UPSTASH_REDIS_REST_TOKEN,
    get enabled() {
      return Boolean(provided(env.UPSTASH_REDIS_REST_URL) && provided(env.UPSTASH_REDIS_REST_TOKEN));
    },
  },

  qstash: {
    url: env.QSTASH_URL,
    token: env.QSTASH_TOKEN,
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
    get enabled() {
      return provided(env.QSTASH_TOKEN) && provided(env.QSTASH_CURRENT_SIGNING_KEY);
    },
  },

  zoom: {
    accountId: env.ZOOM_ACCOUNT_ID,
    clientId: env.ZOOM_CLIENT_ID,
    clientSecret: env.ZOOM_CLIENT_SECRET,
    webhookSecret: env.ZOOM_WEBHOOK_SECRET,
    get enabled() {
      return (
        provided(env.ZOOM_ACCOUNT_ID) &&
        provided(env.ZOOM_CLIENT_ID) &&
        provided(env.ZOOM_CLIENT_SECRET)
      );
    },
    get webhooksEnabled() {
      return provided(env.ZOOM_WEBHOOK_SECRET);
    },
  },

  googleCalendar: {
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI ?? `${env.APP_URL}/api/v1/calendar/callback`,
    webhookToken: env.GOOGLE_CALENDAR_WEBHOOK_TOKEN,
    get enabled() {
      return provided(env.GOOGLE_CALENDAR_CLIENT_ID) && provided(env.GOOGLE_CALENDAR_CLIENT_SECRET);
    },
  },

  ably: {
    apiKey: env.ABLY_API_KEY,
    chatPollIntervalMs: env.CHAT_POLL_INTERVAL_MS,
    get enabled() {
      return provided(env.ABLY_API_KEY);
    },
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    get enabled() {
      return provided(env.GEMINI_API_KEY);
    },
  },

  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL,
    get enabled() {
      return provided(env.ANTHROPIC_API_KEY);
    },
  },

  cloudflare: {
    r2AccountId: env.CLOUDFLARE_R2_ACCOUNT_ID,
    r2AccessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    r2SecretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    r2BucketName: env.CLOUDFLARE_R2_BUCKET_NAME,
    r2PublicUrl: env.CLOUDFLARE_R2_PUBLIC_URL,
    get enabled() {
      return (
        provided(env.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
        provided(env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) &&
        provided(env.CLOUDFLARE_R2_BUCKET_NAME)
      );
    },
  },

  email: {
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT,
    smtpUser: env.SMTP_USER,
    smtpPass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
    get enabled() {
      return provided(env.SMTP_HOST) && provided(env.SMTP_USER) && provided(env.SMTP_PASS);
    },
  },

  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    get enabled() {
      return provided(env.RAZORPAY_KEY_ID) && provided(env.RAZORPAY_KEY_SECRET);
    },
  },

  demo: {
    enabled: env.ENABLE_DEMO_ACCOUNTS,
  },
} as const;

export type AppConfig = typeof config;

/**
 * Machine-readable health of every external integration.
 * Surfaced by `GET /api/v1/health` so you can see at a glance which
 * credentials are still missing without leaking any secret values.
 */
export const integrationStatus = () => ({
  env: config.env,
  appUrl: config.appUrl,
  database: { configured: provided(config.db.url) },
  auth: {
    configured: provided(config.auth.authSecret),
    googleSso: config.auth.googleSsoEnabled,
  },
  rateLimit: { upstashRedis: config.upstash.enabled },
  jobs: { qstash: config.qstash.enabled },
  video: { zoom: config.zoom.enabled, zoomWebhooks: config.zoom.webhooksEnabled },
  calendar: { google: config.googleCalendar.enabled },
  realtime: { ably: config.ably.enabled, fallback: 'polling', pollIntervalMs: config.ably.chatPollIntervalMs },
  ai: {
    gemini: config.gemini.enabled,
    geminiModel: config.gemini.model,
    anthropic: config.anthropic.enabled,
    model: config.anthropic.model,
  },
  storage: { cloudflareR2: config.cloudflare.enabled },
  email: { smtp: config.email.enabled },
  payments: { razorpay: config.razorpay.enabled },
}) as const;

export type IntegrationStatus = ReturnType<typeof integrationStatus>;
