const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('lib/candidate-submission-input.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, require);
test('scoped library data normalizes unique city names without inventing unknown locations', async () => {
  const originalFetch = global.fetch;
  global.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync('public' + url, 'utf8')) });
  try {
  assert.equal(await mod.exports.normalizeCandidateLocation('Kolkata', 'IN'), 'Kolkata, West Bengal');
  assert.equal(await mod.exports.normalizeCandidateLocation('Unknown city', 'IN'), 'Unknown city');
  assert.equal(await mod.exports.normalizeCandidateLocation('Kolkata, West Bengal', 'IN'), 'Kolkata, West Bengal');
  } finally { global.fetch = originalFetch; }
});
test('amount formatting preserves zeros and decimal places', () => {
  assert.equal(mod.exports.formatCandidateAmount('120000'), '120,000');
  assert.equal(mod.exports.formatCandidateAmount('12000.50'), '12,000.50');
  assert.equal(mod.exports.formatCandidateAmount('0'), '0');
});
test('mobile validation enforces Indian length and country-aware validity', () => {
  assert.ok(mod.exports.candidatePhoneSchema.safeParse('+919692004066').success);
  for (const phone of ['+91969200406', '+9196920040666', '', '+910000000000']) assert.ok(!mod.exports.candidatePhoneSchema.safeParse(phone).success, phone);
});
