const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file =
  'app/(dashboard)/dashboard/components/recruiter-dashboard-view.tsx';
const dashboard = {
  pendingJobs: 4,
  totalActiveJobs: 4,
  jobs: [
    'Data Engineer',
    'Java Developer',
    'Business Analyst',
    'SAP Consultant',
  ].map((jobTitle, i) => ({
    id: 'job' + i,
    jobTitle,
    jobCode: 'KOL-IND-261026-00' + i,
    jobType: 'Full-time',
    market: 'INDIA',
    client: ['deb technology', 'TCS', 'Enfycon India', 'K21 Academy'][i],
    priority: 'WARM',
    assignedAt: '2026-10-26T10:00:00Z',
    submissionDone: i % 2,
    submissionRequired: 2,
    canSubmit: true,
    canMatch: true,
  })),
  metrics: {
    jobs: 8,
    submissions: 20,
    rejected: 4,
    selected: 3,
    interviews: 5,
  },
  submissionStages: [
    { label: 'Awaiting review', count: 8 },
    { label: 'In interview', count: 5 },
    { label: 'Selected', count: 3 },
    { label: 'Rejected', count: 4 },
  ],
  interviewOutcomes: [
    { label: 'SCHEDULED', count: 5 },
    { label: 'CLEARED', count: 4 },
    { label: 'REJECTED', count: 2 },
    { label: 'CANCELLED', count: 1 },
  ],
  calendar: [],
  upcoming: [
    {
      id: 's1:L1',
      submissionId: 's1',
      candidateName: 'Shanthi Kiran',
      jobTitle: 'Data Engineer',
      round: 'L1',
      status: 'SCHEDULED',
      date: '2026-10-30T05:00:00Z',
      timezone: 'Asia/Kolkata',
      interviewer: 'Ananya Sen',
      meetingLink: 'https://example.test/meeting',
    },
  ],
};
const candidates = [
  'Ankit Kashyap',
  'Shanthi Kiran',
  'Palash Reja',
  'Niraj Kumar Seela',
].map((fullName, i) => ({
  id: 'c' + i,
  fullName,
  jobTitle: [
    'AI Architect',
    'Data Engineer',
    'AI / ML Engineer',
    'Java Developer',
  ][i],
  createdOn: '2026-10-26T10:00:00Z',
}));
const rows = candidates.slice(0, 3).map((candidate, i) => ({
  id: 's' + i,
  candidateName: candidate.fullName,
  jobTitle: dashboard.jobs[i].jobTitle,
  clientName: dashboard.jobs[i].client,
}));
function load(overrides = {}) {
  const mod = { exports: {} };
  const imports = {
    'next/link': {
      default: ({ children, href, ...props }) =>
        React.createElement('a', { href, ...props }, children),
    },
    swr: {
      default: (key) => ({
        data:
          key?.[0] === 'recruiter-dashboard'
            ? (overrides.dashboard ?? dashboard)
            : key?.[0] === 'recruiter-latest-candidates'
              ? candidates
              : { data: rows },
        mutate: () => Promise.resolve(),
        ...overrides.swr,
      }),
    },
    '@/lib/ats-api': { atsApi: {}, activeRoleHeaders: () => ({}) },
    '@/lib/submission-tracker': {
      stage: () => ({ label: 'Needs internal review' }),
      validTimezone: (tz) => tz || 'UTC',
    },
    '@/components/dashboard/AddCandidateModal': { default: () => null },
    '@/components/ui/skeleton': {
      Skeleton: (props) => React.createElement('div', props),
    },
  };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: false,
    },
  }).outputText;
  new Function('require', 'exports', 'module', js)(
    (name) => imports[name] || require(name),
    mod.exports,
    mod,
  );
  return mod.exports;
}
const profile = {
  fullName: 'Sahadeb Barman',
  id: 'staff',
  tenantId: 'tenant',
  permissions: [
    'job:view',
    'candidate:view',
    'candidate:create',
    'submission:view',
    'submission:create',
  ],
};
test('daily workspace renders four real job cards and distinct candidate, calendar, upcoming and chart widgets', () => {
  const html = renderToStaticMarkup(
    React.createElement(load().default, { profile }),
  );
  for (const title of [
    'Hello, Sahadeb',
    'My assigned jobs',
    'Candidate progress',
    'Upcoming interviews',
    'Latest candidates',
    'Submission stages',
    'Interview outcomes',
  ])
    assert.ok(html.includes(title), title);
  assert.equal((html.match(/>Add CV</g) || []).length, 4);
  assert.equal((html.match(/>AI match</g) || []).length, 4);
  assert.match(html, /4 jobs need candidates/);
  assert.match(html, /\/job-posting\/my-jobs/);
  assert.match(html, /\/utility\/submissions\?submission=s/);
  assert.doesNotMatch(
    html,
    /Recruiter workspace|Your hiring activity|Recent activity|Pipeline snapshot|Search candidates/,
  );
});
test('server capabilities gate job actions independently of profile role labels', () => {
  const data = {
    ...dashboard,
    jobs: dashboard.jobs.map((j) => ({
      ...j,
      canSubmit: false,
      canMatch: false,
    })),
  };
  const html = renderToStaticMarkup(
    React.createElement(load({ dashboard: data }).default, { profile }),
  );
  assert.doesNotMatch(html, />Add CV<|>AI match</);
});
test('donuts have exact denominators, accessible legends and a genuine zero-data state', () => {
  const { Donut } = load();
  const html = renderToStaticMarkup(
    React.createElement(Donut, {
      title: 'Stages',
      unit: 'submissions',
      items: [
        { label: 'Review', count: 3 },
        { label: 'Rejected', count: 1 },
      ],
    }),
  );
  assert.match(html, /4 submissions/);
  assert.match(html, /75%/);
  assert.match(html, /25%/);
  const empty = renderToStaticMarkup(
    React.createElement(Donut, {
      title: 'Stages',
      unit: 'submissions',
      items: [],
    }),
  );
  assert.match(empty, /No data in this period/);
  assert.doesNotMatch(empty, /NaN|<svg/);
});
test('calendar has one accessible control per day and labelled round colours', () => {
  const html = renderToStaticMarkup(
    React.createElement(load().InterviewCalendar, {
      month: '2026-10',
      changeMonth() {},
      events: dashboard.upcoming,
      truncated: false,
    }),
  );
  assert.equal((html.match(/aria-label="2026-10-\d\d,/g) || []).length, 31);
  assert.match(html, /2026-10-30, 1 interview/);
  assert.match(html, /Previous month/);
  assert.match(html, /Next month/);
  for (const round of ['L1', 'L2', 'L3']) assert.ok(html.includes(round));
});
test('permission-limited users do not see candidate-pool or submission widgets', () => {
  const html = renderToStaticMarkup(
    React.createElement(load().default, {
      profile: { ...profile, permissions: ['job:view'] },
    }),
  );
  assert.doesNotMatch(
    html,
    /Latest candidates|Candidate progress|Upcoming interviews/,
  );
});
if (process.argv.includes('--preview')) {
  const html = renderToStaticMarkup(
    React.createElement(load().default, { profile }),
  );
  const css = fs
    .readdirSync('.next/static/chunks')
    .filter((p) => p.endsWith('.css'))
    .map((p) => fs.readFileSync('.next/static/chunks/' + p, 'utf8'))
    .join('\n');
  fs.writeFileSync(
    '../output/recruiter-dashboard-implementation.html',
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body style="background:#f5f6fb"><header style="background:#1a4fa0;color:white;padding:18px 28px;font-size:20px;font-weight:bold">EnfySync ATS <span style="float:right;font-size:13px">Kolkata · India Staffing</span></header><main style="max-width:1440px;margin:auto;padding:24px"><div style="display:flex;justify-content:space-between;margin-bottom:16px"><h1 style="font-size:22px;font-weight:bold">Dashboard</h1><button style="background:#4f46e5;color:white;border-radius:8px;padding:8px 16px">Search candidates</button></div>${html}</main></body></html>`,
  );
}
module.exports = { dashboard, candidates, rows, profile };

test('meeting links cannot execute script URLs', () => {
  const unsafe = {
    ...dashboard,
    upcoming: [
      { ...dashboard.upcoming[0], meetingLink: 'javascript:alert(1)' },
    ],
  };
  const html = renderToStaticMarkup(
    React.createElement(load({ dashboard: unsafe }).default, { profile }),
  );
  assert.doesNotMatch(html, /javascript:|Join meeting/);
});
