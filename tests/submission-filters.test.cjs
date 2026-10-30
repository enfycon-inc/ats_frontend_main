const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  ts = require('typescript'),
  React = require('react');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><body></body>', {
  url: 'http://localhost/utility/submissions?view=all',
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
for (const key of [
  'Node',
  'Element',
  'HTMLInputElement',
  'DocumentFragment',
  'MutationObserver',
  'CustomEvent',
  'NodeFilter',
])
  global[key] = dom.window[key];
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = clearTimeout;
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
global.IS_REACT_ACT_ENVIRONMENT = true;
for (const key of ['localStorage', 'sessionStorage'])
  Object.defineProperty(global, key, {
    value: dom.window[key],
    configurable: true,
  });
const { createRoot } = require('react-dom/client'),
  { act } = React;
function load(relative, mocks = {}, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative);
  const root = path.join(__dirname, '..'),
    code = ts.transpileModule(
      fs.readFileSync(path.join(root, relative), 'utf8'),
      {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      },
    ).outputText,
    mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/')
            ? path.join(root, id.slice(2))
            : path.resolve(root, path.dirname(relative), id),
          f = [base + '.ts', base + '.tsx'].find(fs.existsSync);
        if (f) return load(path.relative(root, f), mocks, cache);
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  cache.set(relative, mod.exports);
  return mod.exports;
}
const h = load('lib/submission-filters.ts'),
  settle = async (ms = 40) =>
    act(async () => {
      await new Promise((r) => setTimeout(r, ms));
    });
const button = (c, t) =>
  [...c.querySelectorAll('button')].find((b) => b.textContent.startsWith(t));
test('scope presets use capabilities and do not grant selectors from role labels', () => {
  assert.equal(h.localFilterAccess(['ACCOUNT_MANAGER']).portfolio, false);
  assert.equal(h.localFilterAccess(['job:submit_owned_jobs']).portfolio, true);
  assert.equal(h.localFilterAccess(['unit_admin:manage']).unit, false);
  assert.equal(h.localFilterAccess(['branch_admin:manage']).unit, true);
  assert.equal(h.localFilterAccess(['submission:view']).people, false);
});
test('URL roundtrip preserves independent identities, closures, date basis and history without leaking internal switches', () => {
  const f = h.readSubmissionFilters(
    new URLSearchParams(
      'bucket=closures&dateBasis=joined&createdById=creator&accountManagerId=owner&l1Status=CLEARED&page=2&filterOptions=branchId',
    ),
  );
  assert.equal(f.createdById, 'creator');
  assert.equal(f.accountManagerId, 'owner');
  assert.equal(f.l1Status, 'CLEARED');
  assert.equal(f.filterOptions, undefined);
  const q = h.submissionFilterQuery(
    new URLSearchParams('submission=s1&review=1'),
    f,
  );
  assert.equal(q.get('bucket'), 'closures');
  assert.equal(q.get('dateBasis'), 'joined');
  assert.equal(q.get('review'), '1');
  assert.equal(q.get('page'), '2');
  assert.equal(h.stageBucket('review'), 'review');
  assert.equal(h.stageBucket('l1', 'PENDING'), 'interviews');
  assert.equal(h.stageBucket('final', 'JOIN'), 'closures');
  assert.equal(h.stageBucket('final'), 'all');
});
let fixture = 0;
async function render(permissions, url = '/utility/submissions?view=all') {
  window.history.replaceState(null, '', url);
  const calls = [],
    options = [],
    actor = `filters-${++fixture}`;
  const api = {
    list: async (f) => {
      calls.push(f);
      return {
        data: [],
        page: f.page ?? 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        counts: {
          all: 0,
          review: 0,
          interviews: 0,
          offers: 0,
          closures: 0,
          closed: 0,
        },
        dashboardMetrics: { submissions: 0, interviews: 0, selections: 0 },
      };
    },
    filterOptions: async (kind, f, q, page) => {
      options.push({ kind, f, q, page });
      return {
        data: [
          {
            id: '00000000-0000-0000-0000-000000000101',
            label: kind === 'clientId' ? 'Visible client' : 'Visible manager',
            email: 'visible@example.test',
          },
          {
            id: '00000000-0000-0000-0000-000000000102',
            label: kind === 'clientId' ? 'Second client' : 'Second manager',
            email: 'second@example.test',
          },
        ].filter((row) =>
          `${row.label} ${row.email}`.toLowerCase().includes(q.toLowerCase()),
        ),
        page,
        hasMore: false,
      };
    },
  };
  const Page = load('app/(dashboard)/utility/submissions/page.tsx', {
    '@/contexts/DashboardContext': {
      useDashboardContext: () => ({
        status: 'ready',
        selection: { active: { id: 'role' } },
        profile: {
          id: actor,
          tenantId: 'tenant',
          branchId: 'branch',
          businessUnitId: 'unit',
          permissions,
        },
        roles: [],
      }),
    },
    'next/navigation': {
      useSearchParams: () => new URLSearchParams(window.location.search),
      useRouter: () => ({
        push: (u) => window.history.pushState(null, '', u),
        replace: (u) => window.history.replaceState(null, '', u),
      }),
    },
    'next/link': {
      __esModule: true,
      default: (p) => React.createElement('a', p),
    },
    '@/lib/ats-api': { atsApi: { submissions: api } },
    '@/components/ui/button': {
      Button: ({ variant, size, ...p }) => React.createElement('button', p),
    },
    '@/components/ui/input': { Input: (p) => React.createElement('input', p) },
    '@/components/shared/user-identity': {
      UserIdentity: ({ user }) =>
        React.createElement('span', null, user.name, ' ', user.email),
    },
    '@/components/page-loading-skeleton': {
      PageLoadingSkeleton: () => React.createElement('p', null, 'Loading'),
    },
    '@/components/shared/pod-feature-gate': {
      PodFeatureGate: ({ children }) => children,
    },
    '@/components/submissions/review-workspace': {
      ReviewWorkspace: () => null,
    },
    '@/components/submissions/submission-history': {
      SubmissionHistory: () => null,
    },
    '@/components/submissions/update-submission-dialog': {
      UpdateSubmissionDialog: () => null,
    },
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(Page.default)));
  await settle();
  return {
    container,
    calls,
    options,
    close: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
const dh = [
  'unit_admin:manage',
  'submission:view',
  'submission:internal_screening',
  'client:view',
];
test('round shortcuts replace stale joined-date filters and cleared results select All', async () => {
  const v = await render(dh);
  try {
    await act(async () => button(v.container, 'Closures').click());
    await settle();
    assert.equal(v.calls.at(-1).dateBasis, 'joined');
    const stage = v.container.querySelector('select[aria-label="Stage"]');
    await act(async () => {
      stage.value = 'l1';
      stage.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await settle();
    await act(async () => button(v.container, 'L1 Pending').click());
    await settle();
    assert.equal(v.calls.at(-1).round, 'l1');
    assert.equal(v.calls.at(-1).roundStatus, 'PENDING');
    assert.equal(v.calls.at(-1).bucket, 'interviews');
    assert.equal(v.calls.at(-1).dateBasis, 'submitted');
    await act(async () => button(v.container, 'L1 Cleared').click());
    await settle();
    assert.equal(v.calls.at(-1).roundStatus, 'CLEARED');
    assert.equal(v.calls.at(-1).bucket, 'all');
  } finally {
    await v.close();
  }
});
test('multi-select fetches scoped options lazily and batches explicit selections with Done', async () => {
  const v = await render(dh);
  try {
    const before = v.calls.length;
    assert.equal(v.options.length, 0);
    await act(async () =>
      v.container.querySelector('button[aria-label="Account manager"]').click(),
    );
    await settle();
    assert.equal(v.options[0].kind, 'accountManagerId');
    const choices = [...document.querySelectorAll('[role="checkbox"]')];
    assert.equal(choices.length, 2);
    await act(async () => choices[0].click());
    await act(async () => choices[1].click());
    assert.equal(v.calls.length, before);
    await act(async () => button(document.body, 'Done').click());
    await settle();
    assert.deepEqual(v.calls.at(-1).accountManagers, {
      mode: 'ids',
      ids: [
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000102',
      ],
    });
    assert.equal(
      JSON.parse(
        new URLSearchParams(window.location.search).get('accountManagers'),
      ).ids.length,
      2,
    );
    assert.match(v.container.textContent, /2 selected/);
  } finally {
    await v.close();
  }
});
test('Select all matching uses a server-side selector rather than only loaded IDs and supports exclusions', async () => {
  const v = await render(dh);
  try {
    await act(async () =>
      v.container.querySelector('button[aria-label="Recruiter"]').click(),
    );
    await settle();
    await act(async () => button(document.body, 'Select all matching').click());
    await act(async () => document.querySelector('[role="checkbox"]').click());
    await act(async () => button(document.body, 'Done').click());
    await settle();
    assert.deepEqual(v.calls.at(-1).recruiters, {
      mode: 'matching',
      search: '',
      excludedIds: ['00000000-0000-0000-0000-000000000101'],
    });
  } finally {
    await v.close();
  }
});
test('More filters is a draft sheet; Cancel discards changes and Apply commits client multi-select and canonical urgency once', async () => {
  const v = await render(dh);
  try {
    await act(async () => button(v.container, 'More filters').click());
    const dialog = document.querySelector('[role="dialog"]');
    assert(dialog);
    const urgency = [...dialog.querySelectorAll('select')].find((el) =>
      el.parentElement.textContent.startsWith('Urgency'),
    );
    assert.deepEqual(
      [...urgency.options].map((o) => o.textContent),
      ['All', 'Hot', 'Warm', 'Cold'],
    );
    const before = v.calls.length;
    await act(async () => {
      urgency.value = 'Hot';
      urgency.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    assert.equal(v.calls.length, before);
    await act(async () => button(dialog, 'Cancel').click());
    assert.equal(v.calls.length, before);
    await act(async () => button(v.container, 'More filters').click());
    const nextDialog = document.querySelector('[role="dialog"]');
    const nextUrgency = [...nextDialog.querySelectorAll('select')].find((el) =>
      el.parentElement.textContent.startsWith('Urgency'),
    );
    assert.equal(nextUrgency.value, '');
    await act(async () =>
      nextDialog.querySelector('button[aria-label="Client"]').click(),
    );
    await settle();
    await act(async () => document.querySelector('[role="checkbox"]').click());
    await act(async () => button(document.body, 'Done').click());
    assert.equal(v.calls.length, before);
    await act(async () => {
      nextUrgency.value = 'Warm';
      nextUrgency.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await act(async () => button(nextDialog, 'Apply filters').click());
    await settle();
    assert.equal(v.calls.at(-1).urgency, 'Warm');
    assert.deepEqual(v.calls.at(-1).clients, {
      mode: 'ids',
      ids: ['00000000-0000-0000-0000-000000000101'],
    });
  } finally {
    await v.close();
  }
});

test('recruiter and branch admin expose different controls, and URL filters restore after return', async () => {
  const r = await render(
    ['submission:view'],
    '/utility/submissions?view=my&bucket=closures&dateBasis=joined&startDate=2026-10-01',
  );
  try {
    assert.equal(
      r.container.querySelector('button[aria-label="Account manager"]'),
      null,
    );
    assert.equal(r.container.querySelector('button[aria-label="Job"]'), null);
    assert.equal(r.calls[0].view, 'my');
    assert.equal(r.calls[0].bucket, 'closures');
    assert.equal(r.calls[0].startDate, '2026-10-01');
  } finally {
    await r.close();
  }
  const b = await render(['submission:view', 'branch_admin:manage']);
  try {
    assert(b.container.querySelector('button[aria-label="Unit"]'));
    await act(async () => button(b.container, 'More filters').click());
    assert.equal(document.querySelector('button[aria-label="Branch"]'), null);
  } finally {
    await b.close();
  }
});
test('panel mirrors managers, keeps draft edits isolated, and synchronizes applied labels back to toolbar', async () => {
  const v = await render(dh);
  try {
    await act(async () =>
      v.container.querySelector('button[aria-label="Account manager"]').click(),
    );
    await settle();
    await act(async () => document.querySelector('[role="checkbox"]').click());
    await act(async () => button(document.body, 'Done').click());
    await settle();
    const before = v.calls.length;
    await act(async () => button(v.container, 'More filters').click());
    let dialog = document.querySelector('[role="dialog"]');
    assert.match(
      dialog.querySelector('button[aria-label="Account manager"]').textContent,
      /Visible manager/,
    );
    if(process.env.SUBMISSION_PANEL_VISUAL_HTML){
      fs.writeFileSync(process.env.SUBMISSION_PANEL_VISUAL_HTML,document.body.innerHTML);
    }
    assert.equal(dialog.querySelector('button[aria-label="Job"]'), null);
    assert.equal(dialog.querySelector('button[aria-label="Created by"]'), null);
    for (const label of [
      'Awaiting scheduling',
      'Awaiting feedback',
      'Upcoming interviews',
    ])
      assert(
        ![...dialog.querySelectorAll('button')].some(
          (b) => b.textContent === label,
        ),
      );
    await act(async () =>
      dialog.querySelector('button[aria-label="Account manager"]').click(),
    );
    await settle();
    assert.equal(
      document.querySelector('[role="checkbox"]').getAttribute('aria-checked'),
      'true',
    );
    await act(async () =>
      document.querySelectorAll('[role="checkbox"]')[1].click(),
    );
    await act(async () => button(document.body, 'Done').click());
    assert.equal(v.calls.length, before);
    await act(async () => button(dialog, 'Cancel').click());
    await act(async () => button(v.container, 'More filters').click());
    dialog = document.querySelector('[role="dialog"]');
    assert.match(
      dialog.querySelector('button[aria-label="Account manager"]').textContent,
      /Visible manager/,
    );
    await act(async () =>
      dialog.querySelector('button[aria-label="Account manager"]').click(),
    );
    await settle();
    await act(async () =>
      document.querySelectorAll('[role="checkbox"]')[1].click(),
    );
    await act(async () => button(document.body, 'Done').click());
    await act(async () => button(dialog, 'Apply filters').click());
    await settle();
    assert.equal(v.calls.at(-1).accountManagers.ids.length, 2);
    assert.match(v.container.textContent, /Second manager/);
  } finally {
    await v.close();
  }
});
test('Reset panel explicitly clears editable filters while preserving stage, search and legacy context', async () => {
  const manager = {
    mode: 'ids',
    ids: ['00000000-0000-0000-0000-000000000101'],
  };
  const q = new URLSearchParams({
    view: 'all',
    round: 'l1',
    roundStatus: 'PENDING',
    bucket: 'interviews',
    search: 'engineer',
    limit: '50',
    accountManagers: JSON.stringify(manager),
    urgency: 'Hot',
    jobId: 'legacy-job',
    createdById: 'legacy-creator',
    queue: 'feedback',
  });
  const v = await render(dh, `/utility/submissions?${q}`);
  try {
    assert.match(v.container.textContent, /Job: Selected/);
    assert.match(v.container.textContent, /Created by: Selected/);
    assert.match(v.container.textContent, /Queue: Feedback/);
    const before = v.calls.length;
    await act(async () => button(v.container, 'More filters').click());
    const dialog = document.querySelector('[role="dialog"]');
    await act(async () => button(dialog, 'Reset panel').click());
    assert.equal(v.calls.length, before);
    await act(async () => button(dialog, 'Apply filters').click());
    await settle();
    const f = v.calls.at(-1);
    assert.equal(f.accountManagers, undefined);
    assert.equal(f.urgency, undefined);
    assert.equal(f.round, 'l1');
    assert.equal(f.roundStatus, 'PENDING');
    assert.equal(f.search, 'engineer');
    assert.equal(f.limit, 50);
    assert.equal(f.jobId, 'legacy-job');
    assert.equal(f.createdById, 'legacy-creator');
    assert.equal(f.queue, 'feedback');
    assert(!new URLSearchParams(window.location.search).has('accountManagers'));
  } finally {
    await v.close();
  }
});
