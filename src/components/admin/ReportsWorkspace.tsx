'use client';

import React, { useMemo, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Send,
  Save,
  X,
  RefreshCw,
  Search,
  FileText,
  TrendingUp,
  Target,
  ListChecks,
  Award,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  fetchReport,
  generateReports,
  saveReport,
  sendReport,
  type ReportListItem,
} from '@/lib/api-client';
import { reportSectionsSchema, type ReportSections } from '@/validators/reportValidator';

export type { ReportListItem };

type Props = {
  drafts: ReportListItem[];
  sent: ReportListItem[];
  /** False means ANTHROPIC_API_KEY is absent and reports use the template. */
  aiEnabled: boolean;
};

const currentMonthInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

const relativeTime = (iso: string | null) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/** Newline-separated textarea <-> string[] helper. */
const toLines = (arr: string[]) => arr.join('\n');
const fromLines = (text: string) =>
  text.split('\n').map((s) => s.trim()).filter(Boolean);

export default function ReportsWorkspace({ drafts, sent, aiEnabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState<'draft' | 'sent'>('draft');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportSections | null>(null);
  const [draft, setDraft] = useState<ReportSections | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generateMonth, setGenerateMonth] = useState(currentMonthInput);

  const rows = tab === 'draft' ? drafts : sent;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.learnerName?.toLowerCase().includes(q) ||
        r.courseName?.toLowerCase().includes(q) ||
        r.headline?.toLowerCase().includes(q),
    );
  }, [rows, query]);

  // Keep a selection alive across tab switches and re-filtering.
  useEffect(() => {
    if (selectedId && rows.some((r) => r.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, rows, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDraft(null);
      return;
    }
    let cancelled = false;
    setEditing(false);
    (async () => {
      const { data, error: err } = await fetchReport(selectedId);
      if (cancelled) return;
      if (err || !data) {
        setDetail(null);
        setDraft(null);
        return;
      }
      // Re-validate the stored JSON at the boundary; a legacy or malformed
      // record renders read-only rather than crashing the editor.
      const parsed = reportSectionsSchema.safeParse(data.sectionsJson);
      const sections = parsed.success ? parsed.data : null;
      setDetail(sections);
      setDraft(sections ? structuredClone(sections) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const isSent = selected?.status === 'sent';

  const refresh = () => startTransition(() => router.refresh());

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: err } = await generateReports(generateMonth);
    setBusy(false);

    if (err || !data) {
      setError(err ?? 'Generation failed');
      return;
    }
    const parts = [`${data.created} new draft${data.created === 1 ? '' : 's'}`];
    if (data.existing) parts.push(`${data.existing} already existed`);
    if (data.failed.length) parts.push(`${data.failed.length} failed`);
    if (data.truncated) {
      parts.push(`capped at ${data.totalEligible} — some enrolments were skipped`);
    }
    setNotice(
      `${parts.join(', ')}. Engine: ${data.engine === 'claude' ? 'Claude' : 'template'}.`,
    );
    refresh();
  }

  async function handleSave() {
    if (!selectedId || !draft) return;
    setBusy(true);
    setError(null);
    const { error: err, details } = await saveReport(selectedId, { sections: draft });
    setBusy(false);
    if (err) {
      // The most common failure is clearing a required list, so show which
      // field the schema rejected rather than a generic message.
      setError(
        details?.length
          ? `${err}: ${details.map((d) => `${d.path || 'report'} — ${d.message}`).join('; ')}`
          : err,
      );
      return;
    }
    setEditing(false);
    setNotice('Edits saved. The original AI draft is kept for audit.');
    refresh();
  }

  async function handleSend() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sendReport(selectedId, true);
    setBusy(false);
    if (err || !data) {
      setError(err ?? 'Send failed');
      return;
    }
    setNotice(
      data.notified > 0
        ? `Sent to ${data.notified} recipient${data.notified === 1 ? '' : 's'}.`
        : 'Sent. No recipients could be emailed.',
    );
    setTab('sent');
    refresh();
  }

  const setField = <K extends keyof ReportSections>(key: K, value: ReportSections[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
      {/* Generate drafts */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              {aiEnabled ? 'Generate monthly drafts' : 'Generate monthly drafts — template mode'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {aiEnabled
                ? 'Creates a draft for every active enrolment. Nothing is sent until you review it.'
                : 'ANTHROPIC_API_KEY is not set, so drafts are built from raw session data.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <input
            type="month"
            value={generateMonth.slice(0, 7)}
            onChange={(e) =>
              setGenerateMonth(`${e.target.value}-01`)
            }
            className="px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm whitespace-nowrap flex items-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* List */}
        <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm shrink-0 h-[420px]">
          <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-2 pt-2">
            {(['draft', 'sent'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 relative transition-colors cursor-pointer ${
                  tab === t
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span>{t === 'draft' ? 'Drafts' : 'Sent'}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200/70 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {(t === 'draft' ? drafts : sent).length}
                </span>
                {tab === t && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-2/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search learner, course, headline..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isPending && (
              <div className="p-6 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {!isPending && filtered.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-600 p-6 text-center">
                {rows.length === 0
                  ? tab === 'draft'
                    ? 'No drafts yet. Generate them for a month above.'
                    : 'No reports have been sent yet.'
                  : 'No matches.'}
              </p>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-800 flex items-start gap-3 transition-colors ${
                  r.id === selectedId
                    ? 'border-l-2 border-l-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-l-2 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                  <UserAvatar
                    src={r.learnerAvatarUrl}
                    alt={r.learnerName ?? 'Learner'}
                    initials={(r.learnerName ?? '?')[0] ?? '?'}
                    className="w-full h-full object-cover"
                    fallbackClassName="bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate pr-2">
                      {r.learnerName ?? 'Unknown learner'}
                    </h4>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                      {relativeTime(r.sentAt ?? r.generatedAt ?? r.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded truncate max-w-[9rem]">
                      {r.courseName ?? 'Course'}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                      {monthLabel(r.monthYear)}
                    </span>
                    {r.overallScore !== null && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                        {r.overallScore}/100
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[420px]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-10 text-center">
              <div>
                <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a report to review it.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                      {selected.learnerName ?? 'Unknown learner'}
                    </h2>
                    {isSent ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                        <Sparkles className="w-3.5 h-3.5" />
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selected.courseName ?? 'Course'} — {monthLabel(selected.monthYear)} report
                  </p>
                  {selected.sentAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Sent {new Date(selected.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {editing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setDraft(detail ? structuredClone(detail) : null);
                        }}
                        disabled={busy}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors bg-white dark:bg-[#161B26] text-sm flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={busy}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </>
                  ) : (
                    !isSent && (
                      <button
                        onClick={() => setEditing(true)}
                        disabled={busy || !draft}
                        title={draft ? undefined : 'This report has no structured content to edit'}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors bg-white dark:bg-[#161B26] text-sm flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Edit
                      </button>
                    )
                  )}
                  {!isSent && (
                    <button
                      onClick={handleSend}
                      disabled={busy || !detail}
                      title={detail ? undefined : 'Generate a draft before sending'}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2 shadow-sm"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send to family
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {isSent && (
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
                    This report was sent and is now immutable.
                  </p>
                )}

                {!draft ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This report has no structured content. It may predate the current report
                    format, or generation failed.
                  </p>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-8">
                    {/* Branded Header Badge */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <BrandLogo size="sm" />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Official Progress Report Preview
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-[#3A86FF] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800">
                        <Sparkles className="w-3 h-3 text-[#00B4D8]" /> AI Synthesised
                      </span>
                    </div>

                    <section>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Headline &amp; summary
                      </h3>
                      {editing ? (
                        <div className="space-y-3">
                          <input
                            value={draft.headline}
                            onChange={(e) => setField('headline', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <textarea
                            value={draft.summary}
                            onChange={(e) => setField('summary', e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">
                            {draft.headline}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {draft.summary}
                          </p>
                        </div>
                      )}
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          Topics covered
                        </h3>
                        <ul className="space-y-3">
                          {draft.topicsCovered.map((t, i) => (
                            <li
                              key={`${t.topic}-${i}`}
                              className="border border-gray-100 dark:border-gray-800 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between gap-3 mb-1.5">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {t.topic}
                                </span>
                                {editing ? (
                                  <CustomSelect<number>
                                    value={t.mastery}
                                    onChange={(mastery) => {
                                      setField(
                                        'topicsCovered',
                                        draft.topicsCovered.map((x, j) =>
                                          j === i ? { ...x, mastery } : x,
                                        ),
                                      );
                                    }}
                                    options={[1,2,3,4,5].map((n) => ({ value: n, label: `mastery ${n}/5` }))}
                                    size="sm"
                                  />
                                ) : (
                                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
                                    mastery {t.mastery}/5
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div
                                    key={level}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      level <= t.mastery
                                        ? 'bg-emerald-500'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                              {editing ? (
                                <input
                                  value={t.note ?? ''}
                                  onChange={(e) => {
                                    const note = e.target.value;
                                    setField(
                                      'topicsCovered',
                                      draft.topicsCovered.map((x, j) =>
                                        j === i ? { ...x, note } : x,
                                      ),
                                    );
                                  }}
                                  placeholder="Optional note"
                                  className="mt-2 w-full px-2 py-1 text-xs bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded"
                                />
                              ) : (
                                t.note && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    {t.note}
                                  </p>
                                )
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                          Scores
                        </h3>
                        <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-bold text-gray-700 dark:text-gray-300">
                                Overall score
                              </span>
                              {editing ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={draft.overallScore}
                                  onChange={(e) =>
                                    setField('overallScore', Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 text-right bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded"
                                />
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-bold">
                                  {draft.overallScore}/100
                                </span>
                              )}
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#00B4D8] to-[#3A86FF] rounded-full"
                                style={{ width: `${draft.overallScore}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-bold text-gray-700 dark:text-gray-300">
                                Engagement
                              </span>
                              {editing ? (
                                <CustomSelect<number>
                                  value={draft.engagementRating}
                                  onChange={(v) =>
                                    setField('engagementRating', v)
                                  }
                                  options={[1,2,3,4,5].map((n) => ({ value: n, label: `${n}/5` }))}
                                  size="sm"
                                  align="right"
                                />
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  {draft.engagementRating}/5
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                  key={level}
                                  className={`h-2 flex-1 rounded-full ${
                                    level <= draft.engagementRating
                                      ? 'bg-amber-500'
                                      : 'bg-gray-200 dark:bg-gray-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    {(
                      [
                        ['Strengths', 'strengths', TrendingUp, 'emerald'] as const,
                        ['Areas for growth', 'areasForGrowth', Target, 'amber'] as const,
                        ['Next steps', 'nextSteps', ListChecks, 'blue'] as const,
                      ] as const
                    ).map(([label, key, Icon, tone]) => (
                      <section key={key}>
                        <h3
                          className={`text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 ${
                            tone === 'emerald'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tone === 'amber'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                        </h3>
                        {editing ? (
                          <textarea
                            value={toLines(draft[key])}
                            onChange={(e) => setField(key, fromLines(e.target.value))}
                            rows={Math.max(3, draft[key].length + 1)}
                            placeholder="One item per line"
                            className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <ul className="space-y-2">
                            {draft[key].map((item) => (
                              <li
                                key={item}
                                className="flex gap-2 text-sm text-gray-600 dark:text-gray-400"
                              >
                                <span className="text-gray-300 dark:text-gray-600 mt-1.5 shrink-0">
                                  •
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
