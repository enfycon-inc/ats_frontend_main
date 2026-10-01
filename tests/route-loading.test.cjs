const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(relative) {
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', code)(module, module.exports, name =>
    name.startsWith('@/') ? load(`${name.slice(2)}.tsx`) : require(name));
  return module.exports;
}

for (const route of ['app/loading.tsx', 'app/(dashboard)/loading.tsx']) {
  test(`${route} sends visible accessible loading content before hydration`, () => {
    const html = renderToStaticMarkup(React.createElement(load(route).default));
    assert.match(html, /role="status"/);
    assert.match(html, /Loading your workspace/);
    assert.match(html, /aria-busy="true"/);
  });
}

test('dashboard fallback stays within content rather than covering the existing navigation', () => {
  const html = renderToStaticMarkup(React.createElement(load('app/(dashboard)/loading.tsx').default));
  assert.doesNotMatch(html, /\bfixed\b/);
});
