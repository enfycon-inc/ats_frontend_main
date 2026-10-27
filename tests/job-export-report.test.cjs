const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, imports = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  new Function('exports', 'require', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText)(exports, name => name in imports ? imports[name] : require(name));
  return exports;
}
const { resolveJobExportPeriod } = load('lib/job-export-period.ts');
function inTimezone(zone, callback) {
  const before = process.env.TZ;
  process.env.TZ = zone;
  try { callback(); } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
}

test('an Indian calendar day includes its entire local date', () => inTimezone('Asia/Kolkata', () => {
  assert.deepEqual(resolveJobExportPeriod('day', '2026-10-27', '', '', ''), {
    from: '2026-10-26T18:30:00.000Z', to: '2026-10-27T18:30:00.000Z',
  });
}));
test('month and date range cover leap days and inclusive end dates', () => inTimezone('UTC', () => {
  assert.deepEqual(resolveJobExportPeriod('month', '', '2024-02', '', ''), {
    from: '2024-02-01T00:00:00.000Z', to: '2024-03-01T00:00:00.000Z',
  });
  assert.deepEqual(resolveJobExportPeriod('range', '', '', '2026-12-31', '2027-01-01'), {
    from: '2026-12-31T00:00:00.000Z', to: '2027-01-02T00:00:00.000Z',
  });
}));
test('local day boundaries remain correct across daylight-saving changes', () => inTimezone('America/New_York', () => {
  for (const [day, hours] of [['2026-03-08', 23], ['2026-11-01', 25]]) {
    const result = resolveJobExportPeriod('day', day, '', '', '');
    assert.equal((Date.parse(result.to) - Date.parse(result.from)) / 3600000, hours);
  }
}));
test('invalid, reversed and impossible calendar inputs are rejected', () => {
  for (const args of [
    ['day', '', '', '', ''], ['day', '2026-02-30', '', '', ''],
    ['month', '', '2026-13', '', ''], ['range', '', '', '2026-10-28', '2026-10-27'],
  ]) assert.throws(() => resolveJobExportPeriod(...args));
});

const navigation = load('constants/navigation.ts', { '../lib/user-management-navigation': load('lib/user-management-navigation.ts') });
const { getFilteredPrimaryNav } = load('lib/role-permissions.ts', { '@/constants/navigation': navigation });
test('Reports is available through export permission including Delivery Head, never through a role name alone', () => {
  const reports = profile => getFilteredPrimaryNav(undefined, [], profile).find(item => item.id === 'reports');
  assert.equal(reports({ systemRole: 'DELIVERY_HEAD', permissions: ['report:view'] }), undefined);
  assert.equal(reports({ systemRole: 'TENANT_ADMIN', permissions: [] }), undefined);
  const link = reports({ systemRole: 'DELIVERY_HEAD', permissions: ['job:export'] });
  assert.equal(link.href, '/reports');
  assert.equal(link.children, undefined);
});
test('an active role without export permission cannot inherit the link from another assigned role', () => {
  const roles = [{ id: 'delivery', name: 'Delivery Head', permissions: ['job:export'] }, { id: 'staff', name: 'Staff', permissions: ['job:view'] }];
  const profile = { assignedRoles: roles, assignedRoleIds: ['delivery', 'staff'], roleId: 'staff', permissions: ['job:export'] };
  assert.equal(getFilteredPrimaryNav('staff', roles, profile).some(item => item.id === 'reports'), false);
  assert.equal(getFilteredPrimaryNav('delivery', roles, profile).some(item => item.id === 'reports'), true);
});
