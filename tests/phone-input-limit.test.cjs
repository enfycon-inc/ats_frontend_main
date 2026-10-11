const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/phone-input-limit.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const limit = mod.exports.limitIndiaPhoneInput;
test('India typing and paste retain only ten national digits plus country code', () => {
  assert.equal(limit('+9198765432109'), '+919876543210');
  assert.equal(limit('+91 98765 43210999'), '+91 98765 43210');
  assert.equal(limit('+91'), '+91');
  assert.equal(limit('+919876'), '+919876');
});
test('other country numbers are unchanged', () => {
  assert.equal(limit('+44123456789012'), '+44123456789012');
});
