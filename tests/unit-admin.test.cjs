const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const m = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name.startsWith('@/') ? load(name.slice(2)) : {}, m, m.exports);
  return m.exports;
}
const nav = load('lib/role-permissions');
test('Unit Admin has Units but no tenant or branch configuration links, even with an incorrect admin archetype', () => {
  const user = { permissions: ['unit_admin:manage', 'job:view', 'candidate:view'] };
  for (const role of ['UNIT_ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN']) {
    const items = [...nav.getFilteredPrimaryNav(role, [], user), ...nav.getFilteredMoreNav(role, [], user)];
    const links = items.flatMap(x => x.children || [x]).map(x => x.href);
    assert.ok(links.includes('/management/units'));
    for (const forbidden of ['/management/branch', '/management/markets', '/settings/branch', '/company?tab=general', '/company?tab=auth']) assert.ok(!links.includes(forbidden), forbidden);
  }
});
test('unknown admin-like names and the removed ADMIN key cannot resolve to tenant administration', () => {
  for (const role of ['ADMIN', 'Office Director', 'Finance Admin']) assert.equal(nav.resolveActiveSystemRole(role), 'RECRUITER');
  assert.equal(nav.resolveActiveSystemRole('TENANT_ADMIN'), 'TENANT_ADMIN');
  assert.equal(nav.resolveActiveSystemRole('UNIT_ADMIN'), 'UNIT_ADMIN');
});
test('fresh assigned office replaces stale account and placeholder data and removes missing settings', () => {
  const map = new Map([['active_branch_name', 'Assigned Office'], ['active_branch_id', 'old-account'], ['active_branch_timezone', 'America/New_York']]);
  const storage = { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) };
  const profile = { branchId: 'branch', branchName: 'Bangalore', officeTimezone: 'Asia/Kolkata', officeStartTime: '09:00', officeEndTime: '18:00' };
  const { syncAssignedOffice } = load('lib/assigned-office');
  assert.equal(syncAssignedOffice(profile, storage), true);
  assert.equal(map.get('active_branch_name'), 'Bangalore');
  assert.equal(map.get('active_branch_timezone'), 'Asia/Kolkata');
  assert.equal(syncAssignedOffice(profile, storage), false);
  syncAssignedOffice({}, storage);
  assert.equal(map.size, 0);
});
test('unit dashboard rejects foreign branches, other units, and missing assignments', () => {
  const { getUnitDashboardJobs } = load('lib/unit-dashboard');
  const own = { id: 'own', businessUnitId: 'unit', branchId: 'branch' };
  const jobs = [own, { ...own, id: 'other', businessUnitId: 'other' }, { ...own, id: 'foreign', branchId: 'foreign' }];
  assert.deepEqual(getUnitDashboardJobs({ businessUnitId: 'unit', branchId: 'branch' }, jobs), [own]);
  assert.deepEqual(getUnitDashboardJobs({}, jobs), []);
});
