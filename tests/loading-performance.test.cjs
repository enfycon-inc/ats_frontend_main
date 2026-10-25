const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) { const m = { exports: {} }; new Function('require', 'exports', 'module', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(name => imports[name] || require(name), m.exports, m); return m.exports; }
test('location hook requests only the selected country and state and drops stale city options', () => {
  const keys = [];
  const records = {
    '/locations/countries.json': [{ isoCode: 'IN', name: 'India' }, { isoCode: 'US', name: 'United States' }],
    '/locations/states/IN.json': [{ isoCode: 'WB', name: 'West Bengal', countryCode: 'IN' }],
    '/locations/states/US.json': [{ isoCode: 'CA', name: 'California', countryCode: 'US' }],
    '/locations/cities/IN-WB.json': [{ name: 'Kolkata', countryCode: 'IN', stateCode: 'WB' }],
  };
  const hooks = load('hooks/use-location-data.ts', { swr: { __esModule: true, default: key => { keys.push(key); return { data: records[key], mutate() {} }; } } });
  let data = hooks.useLocationData('India', 'West Bengal');
  assert.equal(data.City.getCitiesOfState('IN', 'WB')[0].name, 'Kolkata');
  assert.deepEqual(keys, ['/locations/countries.json', '/locations/states/IN.json', '/locations/cities/IN-WB.json']);
  data = hooks.useLocationData('US', 'CA');
  assert.deepEqual(data.City.getCitiesOfState('IN', 'WB'), []);
  assert.deepEqual(data.City.getCitiesOfState('US', 'CA'), []);
});
test('generated state city slices match library records without worldwide coordinates', () => {
  const { City } = require('country-state-city');
  const result = JSON.parse(fs.readFileSync('public/locations/cities/IN-WB.json', 'utf8'));
  assert.equal(result.length, City.getCitiesOfState('IN', 'WB').length);
  assert(result.some(city => city.name === 'Kolkata'));
  assert(result.every(city => city.countryCode === 'IN' && city.stateCode === 'WB' && !('latitude' in city)));
  assert(fs.statSync('public/locations/countries.json').size < 40000);
});
test('skeleton variants expose loading status without live form controls or duplicate page headings', () => {
  const { PageLoadingSkeleton } = load('components/page-loading-skeleton.tsx', { '@/components/ui/skeleton': { Skeleton: props => React.createElement('div', { className: props.className, 'data-slot': 'skeleton' }) } });
  for (const variant of ['form', 'table', 'detail', 'dashboard']) {
    const html = renderToStaticMarkup(React.createElement(PageLoadingSkeleton, { variant }));
    assert.match(html, /aria-busy="true"/); assert.match(html, /role="status"/);
    assert.doesNotMatch(html, /<h1|<input|<button|animate-spin/);
  }
});
test('job initialization reuses requests only inside the same identity and role scope', async () => {
  let role = 'recruiter', token = 'one', count = 0;
  const previous = global.window;
  global.window = { localStorage: {} };
  global.localStorage = { getItem: key => key === 'ats_access_token' ? token : 'tenant' };
  try {
    const { jobFormContext } = load('lib/job-form-context.ts', { '@/lib/ats-api': { activeRoleHeaders: () => ({ role }), atsApi: { auth: { me: async () => { count++; return { role, token }; } }, businessUnits: {}, branches: {} } } });
    await Promise.all([jobFormContext.profile(), jobFormContext.profile()]); assert.equal(count, 1);
    role = 'manager'; await jobFormContext.profile(); assert.equal(count, 2);
    token = 'two'; await jobFormContext.profile(); assert.equal(count, 3);
  } finally { global.window = previous; delete global.localStorage; }
});
