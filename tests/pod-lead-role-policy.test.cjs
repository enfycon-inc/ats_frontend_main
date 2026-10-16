const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('lib/pod-lead-role-policy.ts', 'utf8');
const result = { exports: {} };
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(result.exports);
test('custom leadership names are automatic by base archetype, not display name', () => {
  assert.equal(result.exports.isAutomaticPodLeadRole({ systemRole: 'POD_LEAD', name: 'Recruitment Captain' }), true);
  assert.equal(result.exports.isAutomaticPodLeadRole({ system_role: 'POD_LEAD' }), true);
  assert.equal(result.exports.isAutomaticPodLeadRole({ systemRole: 'RECRUITER', name: 'Pod Lead' }), false);
});
