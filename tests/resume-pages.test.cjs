const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
test('resume pane contains page images without native controls, links or preview-only mark', () => {
  const value = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../components/candidates/resume-pages.tsx'), 'utf8');
  let state = 0;
  const hooks = { ...React, useEffect() {}, useRef: () => ({ current: null }), useState: initial => {
    const index = state++;
    return [index === 0 ? 2 : index === 1 ? '' : index % 2 === 0 ? 'blob:rendered-image' : false, () => {}];
  } };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(value.exports, name => name === 'react' ? hooks : name === 'react/jsx-runtime' ? require('react/jsx-runtime') : {});
  const html = renderToStaticMarkup(React.createElement(value.exports.ResumePages, { candidateId: 'candidate' }));
  assert.match(html, /Resume page 1/); assert.match(html, /Resume page 2/);
  assert.doesNotMatch(html, /<iframe|<a\s|download=|Preview only|Open stored resume/i);
});
