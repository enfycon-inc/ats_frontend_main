const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const value = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/existing-candidate-submission.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(value.exports);
test('bulk-uploaded skills and identity are prefilled with internal resume channel', () => {
  const form = value.exports.existingCandidateForm({ fullName: 'Ana Sen', skills: ['Python', 'AWS'], currentCTC: 0, noticePeriodDays: 0, preferredLocations: ['Pune', 'Kolkata'] });
  assert.equal(form.skills, 'Python, AWS'); assert.equal(form.firstName, 'Ana'); assert.equal(form.lastName, 'Sen');
  assert.equal(form.currentCtc, '0'); assert.equal(form.noticePeriodDays, '0'); assert.equal(form.sourceChannel, 'Existing Talent Pool');
  assert.equal(form.preferredLocations, 'Pune, Kolkata');
});
test('bench classification and missing data are preserved without invented skills', () => {
  const form = value.exports.existingCandidateForm({ source: 'Bench' });
  assert.equal(form.source, 'Bench'); assert.equal(form.sourceChannel, ''); assert.equal(form.skills, '');
});
