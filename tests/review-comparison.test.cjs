const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, react = React) {
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', source)(mod.exports, name => name === 'react' ? react : name.startsWith('.') ? load(require('node:path').join(require('node:path').dirname(file), `${name}.tsx`), react) : require(name));
  return mod.exports;
}
const { RequirementsComparison, criterionLabel } = load('components/submissions/requirements-comparison.tsx');
const { AssessmentMeter } = load('components/submissions/assessment-meters.tsx');
const { DecisionAssessment, recordedCandidateValue } = load('components/submissions/decision-assessment.tsx');
test('historical comparison uses saved candidate values and handles legacy missing fields', () => {
  const row = (category, evidence) => ({ category, evidence });
  assert.equal(recordedCandidateValue(row('experience', '0.8 total years in profile; verify relevant experience.'), {}), '0.8 years');
  assert.equal(recordedCandidateValue(row('notice', '30 days in profile; confirm availability.'), {}), '30 days');
  assert.equal(recordedCandidateValue(row('location', 'Location needs confirmation.'), {}), null);
  const saved = { candidateSnapshot: { experienceYears: 0, noticePeriodDays: 0, currentLocation: 'India' } };
  assert.equal(recordedCandidateValue(row('experience', ''), saved), '0 years');
  assert.equal(recordedCandidateValue(row('notice', ''), saved), '0 days');
  assert.equal(recordedCandidateValue(row('location', ''), saved), 'India');
});
test('decision assessment renders recorded scores, compact criteria and reviewer overrides', () => {
  const html = renderToStaticMarkup(React.createElement(DecisionAssessment, { assessment: {
    score: 31, coverage: 82, engine: 'saved-engine', criteria: [
      { key: 'primary:python', category: 'primary', requirement: 'Python', finding: 'EVIDENCE_FOUND', evidence: 'Original resume excerpt' },
      { key: 'experience', category: 'experience', requirement: 'Experience: 1–4 years', finding: 'DOES_NOT_MEET', evidence: '0.8 years recorded' },
      { key: 'legacy', category: 'legacy', requirement: 'Legacy requirement', finding: 'NEEDS_CLARIFICATION', evidence: 'Saved detail' },
    ],
  }, overrides: { experience: 'Needs clarification' } }));
  for (const text of ['Match score: 31%', 'Assessment coverage: 82%', 'Needs review: 2', 'Required skills', 'Below minimum', 'Reviewer: Needs clarification', 'Other criteria', 'Saved at decision', 'Job requirements', 'Candidate profile']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('<details'));
  assert.ok(!html.includes('<details open'));
  assert.ok(!html.includes('Recorded assessment details'));
  assert.ok(!html.includes('Original resume excerpt'));
  assert.equal((html.match(/<details/g) || []).length, 1);
});
test('criterion labels explain numeric comparisons and preserve uncertainty', () => {
  const row = (category, finding) => ({ category, finding, key: category, requirement: category, evidence: '' });
  assert.equal(criterionLabel(row('experience', 'DOES_NOT_MEET')), 'Below minimum');
  assert.equal(criterionLabel(row('experience', 'MEETS')), 'Meets minimum');
  assert.equal(criterionLabel(row('experience', 'NEEDS_CLARIFICATION')), 'Experience needs confirmation');
  assert.equal(criterionLabel(row('notice', 'DOES_NOT_MEET')), 'Longer than required');
  assert.equal(criterionLabel(row('notice', 'MEETS')), 'Within required notice');
  assert.equal(criterionLabel(row('location', 'NEEDS_CLARIFICATION'), { candidateCurrentLocation: 'India' }), 'City needs confirmation');
  assert.equal(criterionLabel(row('location', 'NEEDS_CLARIFICATION'), {}), 'Location not provided');
  assert.equal(criterionLabel(row('primary', 'NO_EVIDENCE')), 'Not matched');
});
test('compact skill matches have no evidence cards or explanatory text', () => {
  const criteria = Array.from({ length: 14 }, (_, index) => ({ key: `skill:${index}`, category: 'primary', requirement: `Skill ${index}`, finding: index === 0 ? 'EVIDENCE_FOUND' : index === 1 ? 'NEEDS_CLARIFICATION' : 'NO_EVIDENCE', evidence: 'Hidden evidence excerpt' }));
  const html = renderToStaticMarkup(React.createElement(RequirementsComparison, { submission: {}, assessment: { criteria } }));
  assert.ok(!html.includes('<details'));
  assert.ok(!html.includes('Hidden evidence excerpt'));
  assert.ok(html.includes('Skill 0: Matched'));
  assert.ok(html.includes('Skill 1: Needs confirmation'));
  assert.ok(html.includes('Skill 2: Not matched'));
  assert.ok(html.includes('text-xs font-bold leading-4'));
});
test('score circles use AI Match colors and preserve unknown and zero scores', () => {
  for (const [value, color] of [[0, '#94a3b8'], [31, '#f59e0b'], [60, '#3b82f6'], [82, '#10b981']]) {
    const html = renderToStaticMarkup(React.createElement(AssessmentMeter, { label: 'Match score', value }));
    assert.ok(html.includes(`Match score: ${value}%`));
    assert.ok(html.includes(`conic-gradient(${color}`));
  }
  const unknown = renderToStaticMarkup(React.createElement(AssessmentMeter, { label: 'Match score', value: null }));
  assert.ok(unknown.includes('Unavailable'));
  assert.ok(!unknown.includes('0%'));
});
test('comparison preserves zero experience and notice and keeps qualification unverified', () => {
  const html = renderToStaticMarkup(React.createElement(RequirementsComparison, { submission: {
    candidateExperience: 0, candidateNoticePeriod: 0, jobExperienceMin: 1, jobSkillsRequired: ['Python'], candidateSkills: ['Python', 'Java'],
  }, assessment: { candidateQualifications: ['MCA'], criteria: [{ key: 'primary:python', category: 'primary', requirement: 'Python', finding: 'EVIDENCE_FOUND', evidence: 'Listed in profile' }] } }));
  for (const text of ['0 years', '0 days', 'MCA', 'Matched', 'Additional profile skills', 'Java']) assert.ok(html.includes(text), text);
});
test('missing data and unknown evidence cannot become confirmed mismatches', () => {
  const html = renderToStaticMarkup(React.createElement(RequirementsComparison, { submission: {}, assessment: { criteria: [{ key: 'location', category: 'location', requirement: 'Pune', finding: 'NEEDS_CLARIFICATION', evidence: 'Confirm relocation' }] } }));
  assert.ok(html.includes('Qualification not provided'));
  assert.ok(html.includes('confirmation') || html.includes('Location not provided'));
  assert.ok(!html.includes('Not matched'));
  assert.ok(!html.includes('Confirm relocation'));
});
test('location and work mode remain separate and remote does not confirm candidate location', () => {
  const html = renderToStaticMarkup(React.createElement(RequirementsComparison, { submission: { jobWorkMode: 'Remote', jobLocation: 'Pune', candidateCurrentLocation: 'India' }, assessment: { criteria: [{ key: 'location', category: 'location', requirement: 'Remote · Pune', finding: 'EVIDENCE_FOUND', evidence: 'Job is remote' }] } }));
  assert.ok(html.includes('>Location</h3>'));
  assert.ok(html.includes('>Work mode</h3>'));
  assert.ok(html.includes('>Notice period</h3>'));
  assert.ok(!html.includes('Remote · Pune: Matched'));
  assert.ok(html.includes('confirmation') || html.includes('Location not provided'));
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
