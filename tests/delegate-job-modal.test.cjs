const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');

function mount(reply) {
  const states = [], effects = [];
  let cursor = 0, first = true;
  const submitted = [];
  const react = { useState: initial => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], v => { states[i] = v; }]; }, useEffect: fn => { if (first) effects.push(fn); } };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { ...react, default: react }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/ats-api': { atsApi: { businessUnits: { delegationTargets: reply }, jobs: { delegate: async (...args) => { submitted.push(args); } } } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/shared/delegate-job-modal.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(module.exports, name => imports[name] || new Proxy({}, { get: (_, key) => key }));
  const render = () => { cursor = 0; const output = module.exports.DelegateJobModal({ isOpen: true, jobId: 'job', onClose() {}, onSuccess() {} }); if (first) { first = false; effects.forEach(fn => fn()); } return output; };
  render();
  return { render, submitted, async settle() { await new Promise(resolve => setImmediate(resolve)); return render(); } };
}
function nodes(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(item => nodes(item, type));
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
test('branch selection filters units, resets selection, and submits both IDs', async () => {
  const app = mount(async () => [
    { id: 'a', branchId: 'north', branchName: 'North', name: 'India A', market: 'INDIA' },
    { id: 'b', branchId: 'south', branchName: 'South', name: 'India B', market: 'INDIA' },
  ]);
  let tree = await app.settle();
  let selects = nodes(tree, 'Select');
  assert.equal(selects.length, 2);
  assert.equal(selects[1].props.disabled, true);
  selects[0].props.onValueChange('north');
  tree = app.render(); selects = nodes(tree, 'Select');
  assert.deepEqual(nodes(selects[1], 'SelectItem').map(n => n.props.value), ['a']);
  selects[1].props.onValueChange('a');
  nodes(tree, 'Input')[0].props.onChange({ target: { value: '2' } });
  await nodes(app.render(), 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(app.submitted[0][1].targetUnitId, 'a');
  assert.equal(app.submitted[0][1].targetBranchId, 'north');
  nodes(app.render(), 'Select')[0].props.onValueChange('south');
  selects = nodes(app.render(), 'Select');
  assert.equal(selects[1].props.value, '');
  assert.deepEqual(nodes(selects[1], 'SelectItem').map(n => n.props.value), ['b']);
});
test('failed lookup is visible instead of silently becoming an empty list', async () => {
  const app = mount(async () => { throw new Error('Target service unavailable'); });
  assert.match(JSON.stringify(await app.settle()), /Target service unavailable/);
});
