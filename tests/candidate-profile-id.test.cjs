const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/candidate-profile-id.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exportsObject);
const { candidateProfileId } = exportsObject;
const id = 'dbe12f23-5c54-4477-b4dc-ccdfe3b5713f';
test('preserves UUIDs and legacy display links without numeric truncation', () => {
  for (const value of [id, 'CAN-' + id, 'APP-' + id]) assert.equal(candidateProfileId(value), id);
});
test('rejects numeric display codes and malformed identifiers', () => {
  for (const value of ['CAN-004218', '123', 'CAN-x', '../' + id, undefined, '']) assert.equal(candidateProfileId(value), null);
});
