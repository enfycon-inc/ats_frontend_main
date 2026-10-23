const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  const resolved = path.resolve(file);
  if (cache[resolved]) return cache[resolved];
  const result = {};
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  new Function('exports', 'require', code)(result, name => {
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), name + '.ts'));
    return require(name);
  });
  cache[resolved] = result;
  return result;
}
const { jobLocation, jobLocationDisplay } = load('lib/job-location.ts');
const { mapApiJobToJob } = load('app/(dashboard)/job-posting/data/mock-jobs.ts');
const { normalizeJobWorkMode } = load('lib/job-work-mode.ts');

for (const workMode of ['In Office', 'Remote', 'Hybrid']) {
  test(`${workMode} survives the API mapper with geography intact`, () => {
    const job = mapApiJobToJob({ workMode, city: 'Bhubaneswar', state: 'Odisha', country: 'India' });
    assert.equal(job.workMode, workMode);
    assert.equal(job.location, 'Bhubaneswar, Odisha, India');
    assert.equal(jobLocationDisplay(job), `Bhubaneswar, Odisha, India · ${workMode}`);
  });
}
test('office job with absent location never becomes Remote', () => {
  assert.equal(jobLocationDisplay(mapApiJobToJob({ workMode: 'In Office' })), 'Location not specified · In Office');
  assert.equal(jobLocationDisplay({}), 'Location not specified');
});
test('old Remote location placeholders do not override the recorded mode or geography', () => {
  const job = mapApiJobToJob({ location: 'Remote', workMode: 'In Office', city: 'Kolkata', country: 'India' });
  assert.equal(jobLocationDisplay(job), 'Kolkata, India · In Office');
  assert.equal(jobLocationDisplay({ location: 'Remote', workMode: 'In Office' }), 'Location not specified · In Office');
});
test('explicit locations remain and duplicate geography is avoided', () => {
  assert.equal(jobLocation({ location: 'Client office, Salt Lake', city: 'Kolkata' }), 'Client office, Salt Lake');
  assert.equal(jobLocation({ city: 'Delhi', state: 'Delhi', country: 'India' }), 'Delhi, India');
});
test('legacy aliases work, canonical values take precedence, and unknown does not imply Remote', () => {
  assert.equal(mapApiJobToJob({ remoteJob: 'No' }).workMode, 'In Office');
  assert.equal(mapApiJobToJob({ remoteJob: 'Yes' }).workMode, 'Remote');
  assert.equal(mapApiJobToJob({ remoteJob: 'Hybrid' }).workMode, 'Hybrid');
  assert.equal(mapApiJobToJob({ workMode: 'In Office', remoteJob: 'Yes' }).workMode, 'In Office');
  assert.equal(normalizeJobWorkMode('on-site'), 'In Office');
  assert.equal(normalizeJobWorkMode('not remote'), undefined);
});
test('candidate submissions are mounted only inside Pipeline with stage filters disabled', () => {
  const source = fs.readFileSync('app/(dashboard)/job-posting/[id]/page.tsx', 'utf8');
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'JobSubmissions') nodes.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(nodes.length, 1);
  const filter = nodes[0].attributes.properties.find(prop => prop.name?.getText(ast) === 'showStageFilters');
  assert.equal(filter.initializer.expression.kind, ts.SyntaxKind.FalseKeyword);
  let parent = nodes[0].parent;
  while (parent && !ts.isJsxExpression(parent)) parent = parent.parent;
  assert.match(parent.getText(ast), /activeTab === "pipeline"/);
});
