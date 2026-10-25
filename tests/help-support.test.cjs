const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  function localRequire(id) {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
      const file = [base, base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (file) return load(path.relative(root, file), mocks, cache);
    }
    return require(id);
  }
  new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
  return mod.exports;
}

const cache = new Map();
const content = load('lib/help-content.ts', {}, cache);
const nav = load('lib/help-navigation.ts', {}, cache);

test('invalid URL references stay within a valid documentation guide', () => {
  const selection = nav.readHelpSelection(new URLSearchParams('guide=../../tenant&article=javascript:alert(1)&task=create-custom-role&faq=missing'));
  assert.equal(selection.guideId, 'recruiter');
  assert.equal(selection.pageId, content.HELP_GUIDES[0].pages[0].id);
  assert.equal(selection.taskId, undefined);
  assert.equal(selection.faqId, undefined);
  const wrongScope = nav.readHelpSelection(new URLSearchParams('guide=recruiter&task=create-custom-role'));
  assert.equal(wrongScope.taskId, undefined);
});

test('search matches instruction bodies and multiple terms, and every result has a valid deep link', () => {
  assert.deepEqual(nav.searchHelp('   '), []);
  assert.deepEqual(nav.searchHelp('zz-no-such-workflow-zz'), []);
  const results = nav.searchHelp('round reset');
  assert.ok(results.some(item => item.kind === 'task' && item.id === 'pipeline-update'));
  for (const result of results) {
    const target = nav.helpSearchSelection(result);
    const roundtrip = nav.readHelpSelection(new URL(nav.helpHref(target), 'https://example.invalid').searchParams);
    assert.deepEqual(roundtrip, target);
  }
  assert.ok(nav.searchHelp('client approval', 'account-manager').length);
  assert.ok(nav.searchHelp('client approval', 'account-manager').every(item => item.guideId === 'account-manager'));
});

test('bundled screenshot dimensions and annotations stay aligned with the guide data', () => {
  const ids = new Set();
  for (const guide of content.HELP_GUIDES) {
    assert.ok(!ids.has(guide.id)); ids.add(guide.id);
    for (const page of guide.pages) {
      assert.match(page.image.src, /^\/help\/screenshots\/[a-z0-9-]+\.png$/);
      const bytes = fs.readFileSync(path.join(root, 'public', page.image.src));
      assert.equal(page.image.width, bytes.readUInt32BE(16));
      assert.equal(page.image.height, bytes.readUInt32BE(20));
      for (const marker of page.markers) {
        assert.ok(marker.x >= 0 && marker.y >= 0 && marker.width > 0 && marker.height > 0);
        assert.ok(marker.x + marker.width <= 100 && marker.y + marker.height <= 100);
      }
    }
  }
});

test('the real help component renders every guide with its selected screenshot and accessible search controls', () => {
  for (const guide of content.HELP_GUIDES) {
    const Component = load('components/help/help-support.tsx', {
      'next/navigation': { useSearchParams: () => new URLSearchParams({ guide: guide.id }) },
      'next/image': { __esModule: true, default: ({ src, alt, width, height }) => React.createElement('img', { src, alt, width, height }) },
    }).default;
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.ok(html.includes(guide.pages[0].image.src));
    assert.match(html, /aria-label="Choose role guide"/);
    assert.match(html, /id="help-task-search"/);
    assert.match(html, /id="help-faq-search"/);
    assert.match(html, /mailto:helpdesk@enfycon\.com/);
    assert.match(html, /Enlarge screenshot/);
  }
});
