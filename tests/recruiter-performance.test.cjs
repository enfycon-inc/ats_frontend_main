const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  ts = require('typescript'),
  React = require('react');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><body></body>', {
  url: 'http://localhost',
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(global, 'localStorage', {
  value: dom.window.localStorage,
  configurable: true,
});
Object.defineProperty(global, 'sessionStorage', {
  value: dom.window.sessionStorage,
  configurable: true,
});
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client'),
  { act } = React;
function load(relative, mocks = {}, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative);
  const root = path.join(__dirname, '..'),
    source = fs.readFileSync(path.join(root, relative), 'utf8');
  const output = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/')
            ? path.join(root, id.slice(2))
            : path.resolve(root, path.dirname(relative), id),
          file = [base + '.ts', base + '.tsx'].find((f) => fs.existsSync(f));
        if (file) return load(path.relative(root, file), mocks, cache);
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  cache.set(relative, mod.exports);
  return mod.exports;
}
let fixture = 0;
const settle = async () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
const button = (c, text) =>
  [...c.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function render(count = 24, failExpansion = false) {
  const actor = `recruiter-test-${++fixture}`,
    calls = [],
    permissions = [
      'unit_admin:manage',
      'user:manage',
      'job:view',
      'submission:view',
      'submission:internal_screening',
      'pod:view',
    ];
  const rows = Array.from({ length: count }, (_, i) => ({
    id: id(i),
    name: `Recruiter ${i}`,
    email: `r${i}@example.test`,
    avatar: null,
    directActive: 1,
    sharedJobs: 2,
    submissions: 4,
    review: 1,
    l1: 1,
    l2: 0,
    l3: 0,
    offers: 1,
    joined: 1,
  }));
  const Page = load(
    'app/(dashboard)/dashboard/components/recruiter-comparison.tsx',
    {
      '@/contexts/DashboardContext': {
        useDashboardContext: () => ({
          profile: {
            id: actor,
            tenantId: 'tenant',
            branchId: 'branch',
            businessUnitId: 'unit',
            permissions,
          },
          selection: { active: { id: 'role' } },
        }),
      },
      '@/lib/ats-api': {
        atsApi: {
          businessUnits: {
            recruiterDashboard: async (f) => {
              calls.push(f);
              if (failExpansion && f.offset > 0) throw Error('changed');
              const matching = rows.filter(
                  (r) => !f.recruiterId || r.id === f.recruiterId,
                ),
                offset = f.offset || 0,
                limit = f.limit || 10;
              return {
                unit: { name: 'IT', branchName: 'Office' },
                rows: matching.slice(offset, offset + limit),
                total: matching.length,
                nextOffset:
                  offset + limit < matching.length ? offset + limit : null,
                snapshot: 'a'.repeat(64),
                summary: {
                  activeJobs: 2,
                  submissions: count * 4,
                  offers: count,
                  joined: count,
                },
                options: { recruiters: rows, pods: [] },
                charts: null,
                undatedOutcomes: 0,
                unattributedSubmissions: 0,
              };
            },
          },
        },
      },
      'lucide-react': {
        ChevronsUpDown: () => null,
        ChevronDown: () => null,
        ChevronUp: () => null,
        Columns3: () => null,
        RefreshCw: () => null,
      },
      '@/components/ui/button': {
        Button: (p) => React.createElement('button', p),
      },
      '@/components/ui/input': {
        Input: (p) => React.createElement('input', p),
      },
      '@/components/shared/user-identity': {
        UserIdentity: ({ user }) =>
          React.createElement('span', null, user.name, ' ', user.email),
      },
      '@/components/shared/column-drawer': {
        __esModule: true,
        default: () => null,
      },
      'next/link': {
        __esModule: true,
        default: ({ children, onClick, ...p }) =>
          React.createElement(
            'a',
            {
              ...p,
              onClick: (e) => {
                e.preventDefault();
                onClick?.(e);
              },
            },
            children,
          ),
      },
    },
  ).default;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(Page)));
  await settle();
  return {
    container,
    calls,
    close: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
test('expands every continuation page while limiting rendered rows, then collapses', async () => {
  const v = await render(130);
  try {
    assert.equal(
      v.container.querySelectorAll('tbody th[scope=row]').length,
      10,
    );
    await act(async () => button(v.container, 'Show all').click());
    await settle();
    await settle();
    assert.match(v.container.textContent, /Showing 130 of 130/);
    assert.deepEqual(
      v.calls.map((c) => c.offset),
      [0, 10, 110],
    );
    assert.equal(v.calls[1].snapshot, 'a'.repeat(64));
    assert(v.container.querySelectorAll('tbody th[scope=row]').length <= 22);
    await act(async () => button(v.container, 'Show top 10').click());
    assert.equal(
      v.container.querySelectorAll('tbody th[scope=row]').length,
      10,
    );
  } finally {
    await v.close();
  }
});
test('native recruiter links open separate page and save context without changing roster filters', async () => {
  const v = await render();
  try {
    const a = v.container.querySelector('tbody a');
    assert.equal(a.getAttribute('href'), `/dashboard/recruiters/${id(0)}`);
    await act(async () => a.click());
    assert.equal(v.calls.length, 1);
    assert.equal(
      v.container.querySelectorAll('tbody th[scope=row]').length,
      10,
    );
    assert(
      [...Array(sessionStorage.length)]
        .map((_, i) => sessionStorage.key(i))
        .some((k) => k.startsWith('ats:recruiter-comparison:')),
    );
    assert.equal(
      v.container.querySelectorAll('table input[type=checkbox]').length,
      0,
    );
  } finally {
    await v.close();
  }
});
test('explicit recruiter dropdown filters the comparison and resets expansion', async () => {
  const v = await render();
  try {
    await act(async () => button(v.container, 'Show all').click());
    await settle();
    const select = [...v.container.querySelectorAll('select')].find(
      (s) => s.options[0].textContent === 'All recruiters',
    );
    await act(async () => {
      select.value = id(2);
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await settle();
    assert.equal(v.calls.at(-1).recruiterId, id(2));
    assert.equal(v.calls.at(-1).offset, 0);
    assert.equal(v.container.querySelectorAll('tbody th[scope=row]').length, 1);
  } finally {
    await v.close();
  }
});
test('changed expansion displays recoverable error and retains first-page rows', async () => {
  const v = await render(24, true);
  try {
    await act(async () => button(v.container, 'Show all').click());
    await settle();
    assert.match(
      v.container.querySelector('[role=alert]').textContent,
      /Refresh/,
    );
    assert.equal(
      v.container.querySelectorAll('tbody th[scope=row]').length,
      10,
    );
  } finally {
    await v.close();
  }
});
test('custom invalid dates show validation feedback without issuing invalid API calls', async () => {
  const v = await render();
  try {
    const period = [...v.container.querySelectorAll('select')].find(
      (s) => s.options[0].textContent === 'All time',
    );
    await act(async () => {
      period.value = 'custom';
      period.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    const before = v.calls.length;
    await act(async () => button(v.container, 'Apply dates').click());
    assert.match(
      v.container.querySelector('[role=alert]').textContent,
      /valid/,
    );
    assert.equal(v.calls.length, before);
  } finally {
    await v.close();
  }
});
test('state restoration is isolated by scope and strips invalid keys; detail URL carries only period', () => {
  const p = load('lib/recruiter-presentation.ts'),
    state = {
      filters: {
        sort: 'joined',
        direction: 'desc',
        recruiterId: id(1),
        podId: 'bad',
        snapshot: 'stale',
        offset: 50,
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-11-01T00:00:00.000Z',
      },
      search: 'Recruiter',
      period: 'month',
      expanded: true,
      startDate: '',
      endDate: '',
      scrollTop: 100,
    };
  p.saveRecruiterState('scope-a', state);
  const restored = p.readRecruiterState('scope-a');
  assert.equal(restored.expanded, true);
  assert.equal(restored.filters.offset, undefined);
  assert.equal(restored.filters.podId, undefined);
  assert.equal(p.readRecruiterState('scope-b'), null);
  const url = p.recruiterDetailHref(id(1), state.filters);
  assert(url.includes('from='));
  assert(!url.includes('snapshot'));
  assert(!url.includes('podId'));
});

test('detail tabs keep cached rows paired with the correct headings while new results load', async () => {
  const calls = [], actor = `detail-${++fixture}`;
  const permissions = ['unit_admin:manage','user:manage','job:view','submission:view','client:view','submission:internal_screening'];
  let release;
  const Page = load('app/(dashboard)/dashboard/components/recruiter-performance-page.tsx', {
    '@/contexts/DashboardContext': { useDashboardContext: () => ({profile:{id:actor,tenantId:'tenant',branchId:'branch',businessUnitId:'unit',permissions},selection:{active:{id:'role'}}}) },
    'next/navigation': {useSearchParams:()=>new URLSearchParams()},
    'next/link': {__esModule:true,default:p=>React.createElement('a',p)},
    '@/components/ui/button': {Button:p=>React.createElement('button',p)},
    '@/components/ui/input': {Input:p=>React.createElement('input',p)},
    '@/components/ui/skeleton': {Skeleton:p=>React.createElement('div',p)},
    '@/components/shared/user-identity': {UserIdentity:({user})=>React.createElement('span',null,user.name)},
    '@/components/shared/column-drawer': {__esModule:true,default:()=>null},
    '@/lib/ats-api': {atsApi:{businessUnits:{recruiterDetail:async (recruiterId,f)=>{
      calls.push(f); if(f.tab==='clients')await new Promise(r=>{release=r;});
      return {recruiter:{id:recruiterId,name:'Aisha Khan',directActive:1,sharedJobs:0,submissions:2,review:1,offers:1,joined:0},unit:{branchName:'Office',name:'Staffing'},charts:null,pipeline:null,attention:{review:1,feedback:0,upcoming:0},table:{tab:f.tab,rows:[{id:'record',title:f.tab==='clients'?'Synthetic Client':'Synthetic Job',code:f.tab==='jobs'?'JOB-1':null,status:'Active',submissions:2,review:1,offers:1,joined:0}],total:1,page:1,limit:20},clients:[],undatedOutcomes:0};
    }}}},
  }).default;
  const container=document.createElement('div');document.body.appendChild(container);const root=createRoot(container);
  try {
    await act(async()=>root.render(React.createElement(Page,{recruiterId:id(1)})));await settle();
    assert.match(container.querySelector('thead').textContent,/Job \/ code/);
    await act(async()=>button(container,'Client Performance').click());
    assert.match(container.querySelector('thead').textContent,/Job \/ code/);assert.match(container.querySelector('[role=status]').textContent,/Updating/);
    await act(async()=>release());await settle();
    assert.equal(container.querySelector('thead th').textContent,'Client');assert.match(container.querySelector('tbody').textContent,/Synthetic Client/);assert.equal(calls.at(-1).tab,'clients');assert.equal(calls.at(-1).page,1);
    assert.equal(container.querySelectorAll('table input[type=checkbox]').length,0);
  } finally {await act(async()=>root.unmount());container.remove();}
});
