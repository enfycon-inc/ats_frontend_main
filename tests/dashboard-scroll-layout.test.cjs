const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const browser = process.env.LAYOUT_TEST_BROWSER || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(file => fs.existsSync(file));

// Render the real layout functions without mounting authentication or APIs.
function component(file, name, dependencies) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `${name} must exist`);
  const code = ts.transpileModule(`${declaration.getText(source)}\nexports.component = ${name};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', ...Object.keys(dependencies), code)(exports, require, ...Object.values(dependencies));
  return exports.component;
}

test('dashboard pages have one scroller and keep footer below expanded content', { skip: !browser }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ats-layout-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const css = await require('postcss')([require('@tailwindcss/postcss')({ base: process.cwd() })])
    .process(fs.readFileSync('app/globals.css', 'utf8'), { from: path.resolve('app/globals.css') });
  fs.writeFileSync(path.join(directory, 'app.css'), css.css);
  const footerSource = ts.transpileModule(fs.readFileSync('components/layout/footer.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const footerModule = { exports: {} };
  new Function('exports', 'require', footerSource)(footerModule.exports, name => name === '@/components/shared/product-footer'
    ? { ProductFooter: () => React.createElement('footer', null, 'Product footer') } : require(name));
  let hidden = false;
  const MainContentLayout = component('app/client-root.tsx', 'MainContentLayout', {
    usePageHeader: () => ({ hidden }), Footer: footerModule.exports.default,
  });
  const SidebarInset = component('components/ui/sidebar.tsx', 'SidebarInset', {
    cn: (...classes) => classes.filter(Boolean).join(' '),
  });
  const cases = ['short', 'recruiter-long', 'assessment-expanded', 'locked-table', 'hidden-header'];
  const fixtures = cases.map(kind => {
    hidden = kind === 'hidden-header';
    const locked = kind === 'locked-table' || hidden;
    const height = kind === 'short' ? 80 : 1800;
    const content = locked
      ? React.createElement('div', { className: 'min-h-0 flex-1 overflow-y-auto', 'data-table-scroll': true }, React.createElement('div', { style: { height } }, 'Table rows'))
      : kind === 'assessment-expanded'
        ? React.createElement('details', { open: true }, React.createElement('summary', null, 'Assessment at decision'), React.createElement('div', { 'data-content-end': true, style: { height } }, 'Assessment content'))
        : React.createElement('div', { 'data-content-end': true, style: { height } }, 'Dashboard content');
    return `<section data-case="${kind}" style="height:500px;width:100%;overflow:hidden;display:flex">${renderToStaticMarkup(
      React.createElement(SidebarInset, null,
        React.createElement('header', { style: { height: 46, flexShrink: 0 } }, 'Navbar'),
        !hidden && React.createElement('header', { style: { height: 50, flexShrink: 0 } }, 'Page header'),
        React.createElement(MainContentLayout, { isViewportLocked: locked }, content)))}</section>`;
  });
  const script = `const results = [...document.querySelectorAll('[data-case]')].map(root => {
    const scrolls = [...root.querySelectorAll('*')].filter(el => ['auto','scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1);
    const footer = root.querySelector('.d-footer'); const end = root.querySelector('[data-content-end]');
    return { kind: root.dataset.case, scrollers: scrolls.map(el => el.dataset.slot || (el.hasAttribute('data-table-scroll') ? 'table' : el.className)),
      footerAfterContent: !footer || footer.getBoundingClientRect().top >= end.getBoundingClientRect().bottom - 1,
      shortFooterAtBottom: root.dataset.case !== 'short' || Math.abs(footer.getBoundingClientRect().bottom - root.getBoundingClientRect().bottom) < 2 };
  }); document.getElementById('result').textContent = JSON.stringify(results);`;
  const fixture = path.join(directory, 'layout.html');
  fs.writeFileSync(fixture, `<html><head><link rel="stylesheet" href="app.css"></head><body>${fixtures.join('')}<pre id="result"></pre><script>${script}</script></body></html>`);
  for (const size of ['1440,900', '500,700']) {
    const run = spawnSync(browser, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--window-size=${size}`, `--user-data-dir=${path.join(directory, 'profile')}`, '--dump-dom', '--virtual-time-budget=1000', pathToFileURL(fixture).href], { encoding: 'utf8', timeout: 45000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    const match = run.stdout.match(/<pre id="result">(.*?)<\/pre>/s);
    assert.ok(match, 'browser must return layout measurements');
    for (const result of JSON.parse(match[1])) {
      const expected = result.kind === 'short' ? [] : [result.kind.includes('locked') || result.kind === 'hidden-header' ? 'table' : 'page-scroll'];
      assert.deepEqual(result.scrollers, expected, `${size} ${result.kind}: scroll owners`);
      assert.ok(result.footerAfterContent, `${size} ${result.kind}: footer must follow content`);
      assert.ok(result.shortFooterAtBottom, `${size} ${result.kind}: short page footer must fill remaining space`);
    }
  }
});
