const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/dashboard-metrics.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const metricsModule = { exports: {} };
new Function('module', 'exports', compiled)(metricsModule, metricsModule.exports);
const { getDashboardJobMetrics } = metricsModule.exports;

test('the admin status mix uses the API jobStatus field and never adds dummy jobs', () => {
  const jobs = Array.from({ length: 6 }, () => ({ jobStatus: 'Active' }));
  assert.deepEqual(getDashboardJobMetrics(jobs).statusMix, [6, 0, 0, 0]);
  assert.deepEqual(getDashboardJobMetrics([]).statusMix, [0, 0, 0, 0]);
  assert.deepEqual(getDashboardJobMetrics([
    { jobStatus: 'Hold' }, { jobStatus: 'On Hold' }, { jobStatus: 'Close' },
    { jobStatus: 'Closed' }, { jobStatus: 'Filled' }, { jobStatus: 'Draft' },
  ]).statusMix, [0, 2, 2, 1]);
});

test('activity and recent jobs use createdOn from the API and ignore dates outside the week', () => {
  const jobs = [
    { id: 'older', createdOn: '2026-09-01T12:00:00' },
    { id: 'first', createdOn: '2026-09-13T12:00:00' },
    { id: 'today', createdOn: '2026-09-19T12:00:00' },
    { id: 'missing' },
    { id: 'invalid', createdOn: 'invalid' },
  ];
  const result = getDashboardJobMetrics(jobs, new Date('2026-09-19T16:00:00'));
  assert.deepEqual(result.dailyJobs, [1, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(result.dayLabels, ['Sep 13', 'Sep 14', 'Sep 15', 'Sep 16', 'Sep 17', 'Sep 18', 'Sep 19']);
  assert.deepEqual(result.recentJobs.map(job => job.id), ['today', 'first', 'older', 'missing', 'invalid']);
  assert.equal(jobs[0].id, 'older', 'The API result must not be reordered in place');
});
