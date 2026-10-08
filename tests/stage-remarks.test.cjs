const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/stage-remarks.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS },
}).outputText)(mod.exports);
const { stageRemarkSuggestions } = mod.exports;

test('both outcomes share legacy and general remarks for their stage', () => {
  const remarks = [
    { id: 1, stage: 'l1', remarkText: 'Skills checked', remarkType: 'ACCEPT' },
    { id: 2, stage: 'l1', remarkText: 'Needs experience', remarkType: 'REJECT' },
    { id: 3, stage: 'l1', remarkText: 'Discussed availability', remarkType: 'GENERAL' },
    { id: 4, stage: 'l2', remarkText: 'Other round', remarkType: 'GENERAL' },
  ];
  assert.deepEqual(stageRemarkSuggestions(remarks, 'l1').map(r => r.id), [1, 2, 3]);
});
test('deduplication preserves stored IDs and accepts the legacy review alias', () => {
  const remarks = [
    { id: 8, stage: 'internal_review', remarkText: 'Checked' },
    { id: 9, stage: 'review', remarkText: ' checked ' },
  ];
  assert.deepEqual(stageRemarkSuggestions(remarks, 'review').map(r => r.id), [8]);
  assert.equal(remarks.length, 2);
  assert.equal(remarks[1].id, 9);
  assert.deepEqual(stageRemarkSuggestions(remarks, undefined), []);
});
