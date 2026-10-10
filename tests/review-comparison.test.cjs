const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, react = React) {
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', source)(mod.exports, name => name === 'react' ? react : require(name));
  return mod.exports;
}
const { RequirementsComparison } = load('components/submissions/requirements-comparison.tsx');
test('comparison preserves zero experience and notice and keeps qualification unverified', () => {
  const html = renderToStaticMarkup(React.createElement(RequirementsComparison, { submission: {
    candidateExperience: 0, candidateNoticePeriod: 0, jobExperienceMin: 1, jobSkillsRequired: ['Python'], candidateSkills: ['Python', 'Java'],
  }, assessment: { candidateQualifications: ['MCA'], criteria: [{ key: 'primary:python', category: 'primary', requirement: 'Python', finding: 'EVIDENCE_FOUND', evidence: 'Listed in profile' }] } }));
  for (const text of ['0 years', '0 days', 'MCA', 'equivalence needs confirmation', 'Evidence found', 'Additional profile skills', 'Java']) assert.ok(html.includes(text), text);
});
test('missing data and unknown evidence cannot become confirmed mismatches', () => {
  const html = renderToStaticMarkup(React.createElement(RequirementsComparison, { submission: {}, assessment: { criteria: [{ key: 'location', category: 'location', requirement: 'Pune', finding: 'NEEDS_CLARIFICATION', evidence: 'Confirm relocation' }] } }));
  assert.ok(html.includes('Qualification not provided'));
  assert.ok(html.includes('Needs confirmation'));
  assert.ok(!html.includes('Outside requirement'));
});
test('separator keyboard and pointer resizing clamp widths and reset the saved preference', () => {
  const states = [];
  const memory = {};
  global.localStorage = { setItem: (key, value) => { memory[key] = value; } };
  const mockReact = { ...React, useRef: () => ({ current: { getBoundingClientRect: () => ({ left: 100, width: 1000 }) } }), useEffect: () => {}, useState: initial => [initial, value => states.push(value)] };
  const { ReviewSplit } = load('components/submissions/review-split.tsx', mockReact);
  const root = ReviewSplit({ left: 'comparison', right: 'resume', expanded: false });
  const divider = root.props.children[1].props.children[0];
  let prevented = false;
  divider.props.onKeyDown({ key: 'ArrowLeft', preventDefault: () => { prevented = true; } });
  assert.equal(states.at(-1), 53); assert.equal(prevented, true);
  divider.props.onPointerMove({ pointerId: 1, clientX: 5000, currentTarget: { hasPointerCapture: () => true } });
  assert.equal(states.at(-1), 65);
  divider.props.onPointerMove({ pointerId: 1, clientX: -100, currentTarget: { hasPointerCapture: () => true } });
  assert.equal(states.at(-1), 35);
  divider.props.onDoubleClick(); assert.equal(memory['submission-review-split'], '55');
  delete global.localStorage;
});
