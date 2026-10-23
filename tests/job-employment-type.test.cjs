const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const mod = { exports: {} };
  const resolved = path.resolve(file);
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText)(mod.exports, name => {
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), name + '.ts'));
    return require(name);
  });
  return mod.exports;
}
const mod = { exports: load('app/(dashboard)/job-posting/data/mock-jobs.ts') };

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
