'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  X,
  ExternalLink,
  BriefcaseBusiness,
  FileText,
  CircleX,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { atsApi, activeRoleHeaders } from '@/lib/ats-api';
import type {
  RecruiterDashboardData,
  RecruiterInterview,
} from '@/lib/submission-contract';
import { stage, validTimezone } from '@/lib/submission-tracker';
import AddCandidateModal from '@/components/dashboard/AddCandidateModal';
import { Skeleton } from '@/components/ui/skeleton';
import { candidateProfileId } from '@/lib/candidate-profile-id';
import { jobPriorityPresentation, submissionStageToneClasses } from '@/lib/status-colors';

const panel =
  'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const smallLink =
  'inline-flex min-h-9 items-center text-xs font-semibold text-indigo-700 hover:underline focus-visible:outline-2 dark:text-indigo-300';
const outline =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950';
const primary =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2';
const roundColors: Record<string, string> = {
  L1: '#2563eb',
  L2: '#7c3aed',
  L3: '#0d9488',
};
const chartColors = [
  '#2563eb',
  '#7c3aed',
  '#0d9488',
  '#db2777',
  '#d97706',
  '#64748b',
];
const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const dayKey = (date: Date) =>
  `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
const label = (value: string) =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('');
const safeMeeting = (url?: string | null) => {
  try {
    const parsed = new URL(url || '');
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
};
function stamp(date: string, timezone?: string | null) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: validTimezone(timezone),
    timeZoneName: 'short',
  }).format(new Date(date));
}
function LoadingRows() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-3 p-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}
function Failed({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="p-4 text-sm">
      This information could not be loaded.{' '}
      <button
        onClick={retry}
        className="ml-1 min-h-9 font-semibold text-indigo-700 underline dark:text-indigo-300"
      >
        Retry
      </button>
    </div>
  );
}

export function Donut({
  title,
  items,
  unit,
  hint,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  unit: string;
  hint?: string;
}) {
  const total = items.reduce((n, x) => n + x.count, 0);
  let offset = 0;
  return (
    <section className={`${panel} p-4`} aria-label={title}>
      <h4 className="text-sm font-semibold">{title}</h4>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {!total ? (
        <Empty>No data in this period.</Empty>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <svg
            viewBox="0 0 120 120"
            className="h-32 w-32 shrink-0"
            role="img"
            aria-label={`${title}: ${total} ${unit}. See values in legend.`}
          >
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="14"
            />
            {items.map((item, i) => {
              const length = (item.count / total) * 100;
              const begin = offset;
              offset += length;
              return (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke={chartColors[i % chartColors.length]}
                  strokeWidth="14"
                  pathLength="100"
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={-begin}
                  transform="rotate(-90 60 60)"
                >
                  <title>{`${label(item.label)}: ${item.count} (${Math.round(length)}%)`}</title>
                </circle>
              );
            })}
            <text
              x="60"
              y="59"
              textAnchor="middle"
              fill="currentColor"
              fontSize="20"
              fontWeight="700"
            >
              {total}
            </text>
            <text
              x="60"
              y="75"
              textAnchor="middle"
              fill="currentColor"
              fontSize="10"
            >
              {unit}
            </text>
          </svg>
          <ul className="min-w-36 flex-1 space-y-2 text-xs">
            {items.map((item, i) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: chartColors[i % chartColors.length] }}
                />
                <span className="flex-1">{label(item.label)}</span>
                <strong>{item.count}</strong>
                <span className="w-10 text-right text-slate-500">
                  {Math.round((item.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function InterviewItem({ event }: { event: RecruiterInterview }) {
  const meeting = ['SCHEDULED', 'AWAITING_FEEDBACK'].includes(event.status)
    ? safeMeeting(event.meetingLink)
    : null;
  return (
    <div
      className="border-l-2 pl-3"
      style={{ borderColor: roundColors[event.round] || '#64748b' }}
    >
      <p className="text-xs font-semibold">
        {stamp(event.date, event.timezone)} · {event.round} ·{' '}
        {label(event.status)}
      </p>
      <Link
        href={`/utility/submissions?submission=${event.submissionId}`}
        className={`${smallLink} text-slate-900 dark:text-white`}
      >
        {event.candidateName}
      </Link>
      <p className="text-xs text-slate-500">{event.jobTitle}</p>
      {event.interviewer && (
        <p className="mt-1 text-xs text-slate-500">
          Interviewer: {event.interviewer}
        </p>
      )}
      {meeting && (
        <a
          href={meeting}
          target="_blank"
          rel="noopener noreferrer"
          className={smallLink}
        >
          Join meeting <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      )}
    </div>
  );
}

export function InterviewCalendar({
  month,
  changeMonth,
  events,
  truncated,
}: {
  month: string;
  changeMonth: (month: string) => void;
  events: RecruiterInterview[];
  truncated: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const date = new Date(`${month}-01T12:00:00`);
  const start = (date.getDay() + 6) % 7;
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const today = dayKey(new Date());
  const byDay = new Map<string, RecruiterInterview[]>();
  events.forEach((event) => {
    const key = dayKey(new Date(event.date));
    byDay.set(key, [...(byDay.get(key) || []), event]);
  });
  const move = (direction: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + direction);
    setSelected(null);
    setPinned(false);
    changeMonth(monthKey(next));
  };
  return (
    <section
      className={`${panel} relative order-4 p-4`}
      aria-label="Interview calendar"
      onMouseLeave={() => {
        if (!pinned) setSelected(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setSelected(null);
          setPinned(false);
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => move(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {date.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <button
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => move(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day} className="py-2 text-[10px] uppercase text-slate-500">
            {day}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, '0')}`;
          const entries = byDay.get(key) || [];
          return (
            <button
              key={key}
              aria-label={`${key}, ${entries.length} ${entries.length === 1 ? 'interview' : 'interviews'}`}
              aria-expanded={selected === key}
              aria-controls="recruiter-day-details"
              aria-current={today === key ? 'date' : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs focus-visible:outline-2 ${selected === key ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-100' : today === key ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              onMouseEnter={() => {
                if (!pinned) setSelected(key);
              }}
              onFocus={() => setSelected(key)}
              onClick={() => {
                setSelected(key);
                setPinned(true);
              }}
            >
              <span>{i + 1}</span>
              <span className="flex h-1.5 gap-0.5">
                {[...new Set(entries.map((e) => e.round))].map((round) => (
                  <span
                    key={round}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: roundColors[round] || '#64748b' }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        {Object.entries(roundColors).map(([round, color]) => (
          <span key={round} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            {round}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Dates use your device timezone. Open a day for interview timezones.
      </p>
      {truncated && (
        <p role="status" className="mt-2 text-xs">
          Showing the first 2,000 rounds. Open the full calendar for more.
        </p>
      )}
      {selected && (
        <div
          id="recruiter-day-details"
          role="region"
          aria-label={`Interviews on ${selected}`}
          className="absolute left-2 right-2 top-[88%] z-20 max-h-80 overflow-y-auto rounded-xl border border-indigo-100 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              · {(byDay.get(selected) || []).length} interviews
            </h4>
            <button
              aria-label="Close day details"
              className="flex h-9 w-9 items-center justify-center"
              onClick={() => {
                setSelected(null);
                setPinned(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {(byDay.get(selected) || []).map((event) => (
              <InterviewItem key={event.id} event={event} />
            ))}
            {!byDay.get(selected)?.length && (
              <p className="text-sm text-slate-500">No interviews scheduled.</p>
            )}
          </div>
          <Link className={smallLink} href={`/calendar?date=${selected}`}>
            View day <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}

function WelcomeArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 150"
      className="hidden h-36 w-48 shrink-0 sm:block"
    >
      <circle cx="128" cy="80" r="65" fill="#818cf8" opacity=".4" />
      <path d="M115 86 Q155 72 175 112 L190 143 H85Z" fill="#c7d2fe" />
      <circle cx="135" cy="55" r="23" fill="#fdba9d" />
      <path
        d="M111 51 Q103 15 137 24 Q166 16 159 54 L145 35 Q125 45 111 36Z"
        fill="#1e293b"
      />
      <path
        d="M119 98 L88 125 L51 110"
        stroke="#fdba9d"
        strokeWidth="13"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="31"
        y="75"
        width="69"
        height="44"
        rx="5"
        fill="#e0e7ff"
        transform="rotate(8 31 75)"
      />
      <path
        d="M26 125 H186"
        stroke="#c7d2fe"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="67" cy="98" r="4" fill="white" />
      <path
        d="M204 141 V102 M204 119 Q186 103 190 91 Q211 96 204 119 M204 110 Q222 88 215 78 Q197 83 204 110"
        fill="#34d399"
        stroke="#34d399"
        strokeWidth="3"
      />
      <path d="M191 139 H216 L211 150 H196Z" fill="#e0e7ff" />
    </svg>
  );
}

export default function RecruiterDashboardView({
  profile,
}: {
  profile: {
    id?: string;
    tenantId?: string;
    fullName?: string;
    permissions?: string[];
  };
  activeJobs?: unknown[];
}) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [range, setRange] = useState(30);
  const [tab, setTab] = useState('all');
  const [selectedJob, setSelectedJob] = useState<
    RecruiterDashboardData['jobs'][number] | null
  >(null);
  const permissions = profile.permissions || [];
  const canViewCandidates = permissions.includes('candidate:view');
  const canViewSubs =
    permissions.includes('submission:view') ||
    permissions.includes('submission:create');
  const scope =
    typeof window === 'undefined'
      ? ''
      : JSON.stringify([
          profile.tenantId,
          profile.id,
          permissions,
          activeRoleHeaders(),
          localStorage.getItem('ats_access_token'),
          localStorage.getItem('active_branch_id'),
        ]);
  const dashboard = useSWR(
    ['recruiter-dashboard', scope, month, range],
    () => atsApi.submissions.recruiterDashboard(month, range),
    {
      keepPreviousData: false,
      revalidateOnFocus: true,
      refreshInterval: 60000,
    },
  );
  const candidates = useSWR(
    canViewCandidates ? ['recruiter-latest-candidates', scope] : null,
    () => atsApi.candidates.list({ limit: 4 }),
    { keepPreviousData: false, revalidateOnFocus: true },
  );
  const submissions = useSWR(
    canViewSubs ? ['recruiter-candidate-progress', scope, tab] : null,
    () =>
      atsApi.submissions.list({
        view: 'my',
        limit: 5,
        sortBy: 'submitted',
        sortDirection: 'desc',
        ...(tab === 'review'
          ? { bucket: 'review' as const }
          : tab === 'interviews'
            ? { bucket: 'interviews' as const }
            : {}),
      }),
    { keepPreviousData: false, revalidateOnFocus: true },
  );
  useEffect(() => {
    const refresh = () => {
      void dashboard.mutate();
      void submissions.mutate();
      void candidates.mutate();
    };
    window.addEventListener('app:refresh', refresh);
    return () => window.removeEventListener('app:refresh', refresh);
  }, [dashboard.mutate, submissions.mutate, candidates.mutate]);
  const data = dashboard.data;
  return (
    <div className="grid min-w-0 gap-5 text-slate-900 dark:text-slate-100 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
      <div className="contents xl:block xl:min-w-0 xl:space-y-5">
        <section className="order-1 flex min-h-40 items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-white">
          <div className="py-2">
            <h2 className="text-xl font-bold text-white">
              Hello, {profile.fullName?.split(' ')[0] || 'there'}
            </h2>
            <p className="mt-2 text-sm">
              {data
                ? data.pendingJobs
                  ? `${data.pendingJobs} ${data.pendingJobs === 1 ? 'job needs' : 'jobs need'} candidates.`
                  : 'No jobs need additional submissions right now.'
                : 'Your sourcing overview'}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-indigo-100">
              Your assigned jobs and candidate updates, in one place.
            </p>
          </div>
          <WelcomeArt />
        </section>
        <section className="order-2 min-w-0" aria-label="My assigned jobs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              My assigned jobs
            </h3>
            <Link href="/job-posting/my-jobs" className={smallLink}>
              View all jobs <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {dashboard.error ? (
            <Failed retry={() => void dashboard.mutate()} />
          ) : !data ? (
            <LoadingRows />
          ) : !data.jobs.length ? (
            <div className={panel}>
              <Empty>No active jobs assigned yet.</Empty>
            </div>
          ) : (
            <div
              className="grid auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto pb-1 sm:auto-cols-auto sm:grid-cols-2 sm:grid-flow-row"
              tabIndex={0}
              aria-label="Latest assigned job cards"
            >
              {data.jobs.map((job) => (
                <article key={job.id} className={`${panel} p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/job-posting/${job.id}`}
                      className="font-semibold hover:underline"
                    >
                      {job.jobTitle}
                    </Link>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${jobPriorityPresentation(job.priority).className}`}>
                      {jobPriorityPresentation(job.priority).label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{job.client}</p>
                  <p
                    className="mt-1 truncate text-[10px] text-slate-500"
                    title={job.jobCode}
                  >
                    {job.jobCode}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Assigned{' '}
                    {new Date(job.assignedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-xs font-semibold">
                      {job.submissionRequired > 0
                        ? `${job.submissionDone} of ${job.submissionRequired} submissions`
                        : `${job.submissionDone} submissions`}
                    </p>
                    {job.submissionRequired > 0 && (
                      <div
                        className="mt-2 h-1.5 rounded bg-slate-100 dark:bg-slate-800"
                        role="progressbar"
                        aria-label="Submission coverage"
                        aria-valuenow={job.submissionDone}
                        aria-valuemax={Math.max(
                          job.submissionDone,
                          job.submissionRequired,
                        )}
                      >
                        <div
                          className="h-full rounded bg-indigo-500"
                          style={{
                            width: `${Math.min(100, (job.submissionDone / job.submissionRequired) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.canSubmit &&
                      permissions.includes('candidate:create') && (
                        <button
                          className={`${primary} flex-1`}
                          onClick={() => setSelectedJob(job)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add CV
                        </button>
                      )}
                    {job.canMatch && (
                      <Link
                        className={`${outline} flex-1`}
                        href={`/job-posting/${job.id}/matches`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI match
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {canViewSubs && (
          <section className={`${panel} order-6 min-w-0 overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Candidate progress
              </h3>
              <Link href="/utility/submissions" className={smallLink}>
                View all submissions <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div
              className="flex gap-1 border-b border-slate-100 px-4 pb-3 dark:border-slate-800"
              role="group"
              aria-label="Filter candidate progress"
            >
              {[
                ['all', 'All'],
                ['review', 'Awaiting review'],
                ['interviews', 'Interviews'],
              ].map(([key, title]) => (
                <button
                  key={key}
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={`min-h-9 rounded-lg px-3 text-xs ${tab === key ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200' : 'text-slate-500'}`}
                >
                  {title}
                </button>
              ))}
            </div>
            {submissions.error ? (
              <Failed retry={() => void submissions.mutate()} />
            ) : !submissions.data ? (
              <LoadingRows />
            ) : !submissions.data.data.length ? (
              <Empty>No submissions in this view.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                    <tr>
                      {['Candidate', 'Job / Company', 'Stage', ''].map(
                        (title, i) => (
                          <th key={i} className="px-4 py-2 font-medium">
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {submissions.data.data.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-4 py-3 font-medium">
                          {sub.candidateName}
                        </td>
                        <td className="px-4 py-3">
                          {sub.jobTitle}
                          <span className="mt-1 block text-[10px] text-slate-500">
                            {sub.clientName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-medium ${submissionStageToneClasses[stage(sub).tone]}`}>
                            {label(stage(sub).label)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            className={smallLink}
                            href={`/utility/submissions?submission=${sub.id}`}
                          >
                            View
                            <span className="sr-only">
                              {' '}
                              {sub.candidateName}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        <section className={`${panel} order-7 min-w-0 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              My recruitment overview
            </h3>
            <label className="text-xs">
              <span className="sr-only">Reporting period</span>
              <select
                className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700"
                value={range}
                onChange={(e) => setRange(Number(e.target.value))}
              >
                {[
                  [7, 'Last 7 days'],
                  [30, 'Last 30 days'],
                  [90, 'Last 90 days'],
                  [0, 'All time'],
                ].map(([value, title]) => (
                  <option key={value} value={value}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {dashboard.error ? (
            <Failed retry={() => void dashboard.mutate()} />
          ) : !data ? (
            <LoadingRows />
          ) : (
            <>
              <ul className="my-4 grid list-none grid-cols-1 gap-3 border-y border-slate-100 py-3 sm:grid-cols-2 xl:grid-cols-5 dark:border-slate-800">
                {[
                  {
                    name: 'Assigned jobs',
                    value: data.metrics.jobs,
                    icon: BriefcaseBusiness,
                    href: permissions.includes('job:view') ? '/job-posting/my-jobs' : undefined,
                    color: 'text-blue-700 dark:text-blue-300',
                    iconColor: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/50',
                  },
                  {
                    name: 'Submissions',
                    value: data.metrics.submissions,
                    icon: FileText,
                    href: canViewSubs ? '/utility/submissions' : undefined,
                    color: 'text-violet-700 dark:text-violet-300',
                    iconColor: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/50',
                  },
                  {
                    name: 'Rejected',
                    value: data.metrics.rejected,
                    icon: CircleX,
                    color: 'text-rose-700 dark:text-rose-300',
                    iconColor: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50',
                  },
                  {
                    name: 'Selected',
                    value: data.metrics.selected,
                    icon: UserRoundCheck,
                    color: 'text-emerald-700 dark:text-emerald-300',
                    iconColor: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50',
                  },
                  {
                    name: 'In interview',
                    value: data.metrics.interviews,
                    icon: UsersRound,
                    color: 'text-amber-700 dark:text-amber-300',
                    iconColor: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50',
                  },
                ].map(({ name, value, icon: MetricIcon, href, color, iconColor }) => {
                  const tile = (
                    <>
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
                        <MetricIcon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{name}</span>
                        <span className={`mt-1 block text-2xl font-bold tabular-nums ${color}`}>{value}</span>
                      </span>
                    </>
                  );
                  const className = 'flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-900';
                  return href ? (
                    <li key={name}>
                      <Link href={href} aria-label={`${name}: ${value}`} className={className}>
                        {tile}
                      </Link>
                    </li>
                  ) : (
                    <li key={name}>
                      <div className={className}>{tile}</div>
                    </li>
                  );
                })}
              </ul>
              <p className="mb-3 text-[10px] text-slate-500">
                Jobs: assignments in period. Submissions: created in period,
                grouped by current stage. Interviews: rounds dated in period.
              </p>
              <div className="grid gap-3 2xl:grid-cols-2">
                <Donut
                  title="Submission stages"
                  items={data.submissionStages}
                  unit="submissions"
                />
                <Donut
                  title="Interview outcomes"
                  items={data.interviewOutcomes}
                  unit="rounds"
                  hint="Each L1/L2/L3 round counted once."
                />
              </div>
            </>
          )}
        </section>
      </div>
      <aside
        className="contents xl:block xl:min-w-0 xl:space-y-5"
        aria-label="Interviews and candidates"
      >
        {dashboard.error ? (
          <div className={panel}>
            <Failed retry={() => void dashboard.mutate()} />
          </div>
        ) : !data ? (
          <div className={panel}>
            <LoadingRows />
          </div>
        ) : (
          <InterviewCalendar
            month={month}
            changeMonth={setMonth}
            events={data.calendar}
            truncated={data.calendarTruncated}
          />
        )}
        {canViewSubs && (
          <section className={`${panel} order-3 min-w-0`}>
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Upcoming interviews
              </h3>
              <Link href="/calendar" className={smallLink}>
                View calendar <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {dashboard.error ? (
              <Failed retry={() => void dashboard.mutate()} />
            ) : !data ? (
              <LoadingRows />
            ) : !data.upcoming.length ? (
              <Empty>No upcoming interviews scheduled.</Empty>
            ) : (
              <div className="space-y-4 p-4">
                {data.upcoming.map((event) => (
                  <InterviewItem key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}
        {canViewCandidates && (
          <section className={`${panel} order-5 min-w-0`}>
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Latest candidates
              </h3>
              <Link href="/applicants/all" className={smallLink}>
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {candidates.error ? (
              <Failed retry={() => void candidates.mutate()} />
            ) : !candidates.data ? (
              <LoadingRows />
            ) : !candidates.data.length ? (
              <Empty>No candidates available yet.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800">
                {candidates.data.map((candidate) => (
                  <li
                    key={candidate.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
                    >
                      {initials(candidate.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {candidate.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {candidate.jobTitle || 'Candidate'}
                      </p>
                      {candidate.createdOn && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          Added{' '}
                          {new Date(candidate.createdOn).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric' },
                          )}
                        </p>
                      )}
                    </div>
                    {candidateProfileId(candidate.dbId || candidate.id) && (
                      <Link
                        href={`/applicants/${candidateProfileId(candidate.dbId || candidate.id)}`}
                        className={outline}
                      >
                        View<span className="sr-only"> {candidate.fullName}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </aside>
      <AddCandidateModal
        isOpen={!!selectedJob}
        onClose={() => {
          setSelectedJob(null);
          void dashboard.mutate();
          void submissions.mutate();
          void candidates.mutate();
        }}
        job={selectedJob}
      />
    </div>
  );
}
