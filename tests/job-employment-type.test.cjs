const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('app/(dashboard)/job-posting/data/mock-jobs.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, require);

test('API employment type survives list and detail mapping', () => {
  for (const type of ['Contract', 'Contractual', 'C2H', 'Full Time']) {
    assert.equal(mod.exports.mapApiJobToJob({ type }).jobType, type);
  }
  assert.equal(mod.exports.mapApiJobToJob({ type: 'Contract', jobType: 'Full Time' }).jobType, 'Contract');
});

test('legacy employment type fields work without inventing full-time employment', () => {
  assert.equal(mod.exports.mapApiJobToJob({ jobType: 'Contract' }).jobType, 'Contract');
  assert.equal(mod.exports.mapApiJobToJob({ type: ' ', job_type: 'C2H' }).jobType, 'C2H');
  assert.equal(mod.exports.mapApiJobToJob({}).jobType, undefined);
});
