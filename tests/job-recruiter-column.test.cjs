const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '../app/(dashboard)/job-posting/lib');
function load(file, imports = {}) {
  const value = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(value.exports, name => imports[name]);
  return value.exports;
}
const utils = load('job-table-utils.ts');
const data = [
  { id: 'pod', podName: 'POD(Java), POD(Cloud)', podId: 'p1,p2', recruiter: 'N/A', assignedTo: 'POD(Java)' },
  { id: 'both', podName: 'POD(Java)', recruiter: 'Alice, Bob', recruiterIds: ['a', 'b'] },
  { id: 'direct', recruiter: 'Carol', recruiterId: 'c' },
];
test('pod-only and empty jobs have no individual recruiters', () => {
  assert.equal(utils.getRecruiterDisplay(data[0]).type, 'unassigned');
  assert.equal(utils.getRecruiterDisplay({}).label, 'Unassigned');
  assert.equal(utils.getRecruiterDisplay({ recruiter: 'POD(Java)', podName: 'POD(Java)' }).type, 'unassigned');
  assert.equal(utils.getRecruiterDisplay({ assignedTo: 'ALL' }).type, 'unassigned');
});
test('explicit details and multiple recruiter names are retained without pods', () => {
  assert.deepEqual(utils.getRecruiterDisplay(data[1]).names, ['Alice', 'Bob']);
  assert.equal(utils.getRecruiterDisplay({ ...data[1], recruiterDetails: [{ id: 'a', fullName: 'Alice' }] }).label, 'Alice');
  assert.equal(utils.getRecruiterDisplay(data[2]).label, 'Carol');
});
function hook(overrides = {}) {
  let index = 0;
  const react = { useMemo: fn => fn(), useEffect() {}, useState(initial) { const i = index++; return [Object.hasOwn(overrides, i) ? overrides[i] : initial, () => {}]; } };
  return load('use-job-table-data.ts', { react, swr: { default: () => ({ data: [] }) }, './job-table-utils': utils }).useJobTableData({ data, branchUsesPods: true });
}
test('dropdown contains individual recruiters; secondary recruiter matches; pod-only is unassigned', () => {
  assert.deepEqual(hook().availableAssignees, ['Alice', 'Bob', 'Carol']);
  assert.deepEqual(hook({ 6: 'Bob' }).processedData.map(j => j.id), ['both']);
  assert.deepEqual(hook({ 6: 'Unassigned' }).processedData.map(j => j.id), ['pod']);
});
test('recruiter sort uses recruiter names instead of pod labels', () => {
  assert.deepEqual(hook({ 0: 'assignedTo', 1: 'asc' }).processedData.map(j => j.id), ['both', 'direct', 'pod']);
});
test('CSV Recruiter value never falls back to assigned pod', () => {
  let uri;
  global.document = { createElement: () => ({ setAttribute(key, value) { if (key === 'href') uri = value; }, click() {} }), body: { appendChild() {}, removeChild() {} } };
  try {
    utils.exportJobsToCSV(data, ['assignedTo'], [{ id: 'assignedTo', label: 'Recruiter' }]);
    const csv = decodeURI(uri);
    assert.match(csv, /Recruiter/);
    assert.match(csv, /Alice, Bob/);
    assert.match(csv, /Unassigned/);
    assert.doesNotMatch(csv, /POD\(/);
  } finally { delete global.document; }
});
