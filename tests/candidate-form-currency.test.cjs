const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync('components/candidates/candidate-form.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: name => {
    if (!name.startsWith('@/')) return require(name);
    return new Proxy({}, { get: (_, component) => props => {
      const { onChange, defaultCountry, ...rest } = props;
      return React.createElement(component === 'Label' ? 'label' : component === 'Input' ? 'input' : 'div', rest);
    }});
  },
});
const render = market => renderToStaticMarkup(React.createElement(exportsObject.CandidateForm, {
  job: { market }, formData: {}, setFormData() {}, recruiterComment: '', setRecruiterComment() {}, isContractual: false,
}));
for (const market of ['IND', 'IN', 'INDIA', 'DOMESTIC', ' ind ']) {
  test(`${market} displays INR in both CTC fields and a rupee heading`, () => {
    const html = render(market);
    assert.equal((html.match(/₹ /g) || []).length, 2);
    assert.equal((html.match(/\(INR\)/g) || []).length, 2);
    assert.match(html, /lucide-indian-rupee/);
    assert.doesNotMatch(html, /lucide-dollar-sign/);
  });
}
for (const market of ['US', 'USIT']) {
  test(`${market} retains USD`, () => {
    const html = render(market);
    assert.equal((html.match(/\$ /g) || []).length, 2);
    assert.match(html, /lucide-dollar-sign/);
    assert.doesNotMatch(html, /₹|\(INR\)/);
  });
}
