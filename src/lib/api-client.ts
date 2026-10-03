/**
 * Typed API client for use in Client Components and Server Actions.
 * All responses are typed via the { data, error, meta } envelope.
 *
 * Usage (Client Component):
 *   const { data, error } = await apiClient.get('/api/v1/sessions?from=2026-09-01')
 *
 * Usage (Server Component — prefer direct DB queries):
 *   Use db directly from @/lib/drizzle instead.
 */

type ApiEnvelope<T> = {
  data: T;
  error: string | null;
  /** Field-level messages from a 422, when the endpoint returned them. */
  details: { path: string; message: string }[] | null;
  meta: { total?: number; page?: number; perPage?: number } | null;
};

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    return {
      data: null as T,
      error: body.error ?? 'Request failed',
      // Surface field-level validation messages instead of a bare
      // "Validation failed", so forms can point at the offending input.
      details: Array.isArray(body.details) ? body.details : null,
      meta: null,
    };
  }

  const body = await res.json();
  return { ...body, details: body.details ?? null };
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),

  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(url: string) =>
    request<T>(url, { method: 'DELETE' }),
};

// ─── Typed resource fetchers ────────────────────────────────────────────────
export async function fetchDashboardOverview() {
  return apiClient.get<{
    totalLearners: number;
    totalEducators: number;
    activeCourses: number;
    sessionsThisMonth: number;
    pendingReports: number;
  }>('/api/v1/analytics/overview');
}

export async function fetchSessions(params: {
  from?: string;
  to?: string;
  status?: string;
  courseId?: string;
  page?: number;
  perPage?: number;
}) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiClient.get<SessionSummary[]>(`/api/v1/sessions${qs ? `?${qs}` : ''}`);
}

export async function fetchLearners(params?: { q?: string; page?: number; perPage?: number }) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiClient.get<LearnerSummary[]>(`/api/v1/learners${qs ? `?${qs}` : ''}`);
}

export async function fetchEducators(params?: { q?: string; page?: number }) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiClient.get<EducatorSummary[]>(`/api/v1/educators${qs ? `?${qs}` : ''}`);
}

export async function fetchCourses(params?: {
  type?: string;
  status?: string;
  q?: string;
  page?: number;
}) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiClient.get<CourseSummary[]>(`/api/v1/courses${qs ? `?${qs}` : ''}`);
}

// ─── Shared types (inlined to avoid circular imports) ──────────────────────
export type ReportListItem = {
  id: string;
  learnerId: string;
  learnerName: string | null;
  learnerAvatarUrl: string | null;
  courseId: string;
  courseName: string | null;
  monthYear: string;
  status: string;
  headline: string | null;
  overallScore: number | null;
  sentAt: string | null;
  generatedAt: string | null;
  createdAt: string;
};

export type ReportDetail = {
  id: string;
  learnerId: string;
  learnerName: string | null;
  courseId: string;
  courseName: string | null;
  monthYear: string;
  status: string;
  sectionsJson: unknown;
  aiDraft: string | null;
  editedContent: string | null;
  generatedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchReports(params: {
  status?: string;
  learnerId?: string;
  courseId?: string;
  page?: number;
  perPage?: number;
}) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiClient.get<ReportListItem[]>(`/api/v1/reports${qs ? `?${qs}` : ''}`);
}

export async function fetchReport(id: string) {
  return apiClient.get<ReportDetail>(`/api/v1/reports/${id}`);
}

/** Creates or refreshes drafts for every active enrolment in `monthYear`. */
export async function generateReports(monthYear: string, force = false, limit = 50) {
  return apiClient.post<{
    created: number;
    existing: number;
    failed: { learnerId: string; reason: string }[];
    truncated: boolean;
    totalEligible: number;
    engine: string;
    aiEnabled: boolean;
  }>('/api/v1/reports/generate', { all: true, monthYear, force, limit });
}

/** Applies reviewer edits. Rejected with 409 once a report has been sent. */
export async function saveReport(
  id: string,
  body: { sections?: unknown; summary?: string },
) {
  return apiClient.patch<ReportDetail>(`/api/v1/reports/${id}`, body);
}

/** Terminal: marks sent and notifies the learner plus linked parents. */
export async function sendReport(id: string, notify = true) {
  return apiClient.post<{ reportId: string; notified: number }>(
    `/api/v1/reports/${id}/send`,
    { notify },
  );
}

export type SessionSummary = {
  id: string;
  title: string;
  topic: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  zoomMeetingUrl: string | null;
  creditsConsumed: string;
  courseId: string;
  educatorId: string;
  educatorName: string | null;
};

export type LearnerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isActive: boolean;
  board: string | null;
  grade: string | null;
  enrollmentCount?: number;
};

export type EducatorSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  tagline: string | null;
  calendarConnected: boolean;
  payoutDefaultRate: string | null;
  payoutCurrency: string;
};

export type CourseSummary = {
  id: string;
  name: string;
  shortCode: string | null;
  type: string;
  status: string;
  thumbnailUrl: string | null;
  board: string | null;
  grade: string | null;
  enrollmentCount: number;
  createdAt: string;
};
