const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  const resolved = path.resolve(file);
  if (cache[resolved]) return cache[resolved].exports;
  const module = cache[resolved] = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  new Function('exports', 'require', code)(module.exports, name => name.startsWith('./')
    ? load(path.resolve(path.dirname(resolved), name + '.ts')) : require(name));
  return module.exports;
}
const { formatJobDescription: format, sanitizeJobDescription: sanitize } = load('lib/job-description-format.ts');
const { normalizeJobTitle } = load('lib/job-description-policy.ts');

test('ChatGPT JD becomes headings, emphasis and lists while preserving technical names', () => {
  const result = format('# Job Title: Data Engineer\n\n**Job Type:** Full-Time\n\n## Skills\n\n- C# / .NET\n- data_engineering');
  assert.match(result, /<h1>Job Title: Data Engineer<\/h1>/);
  assert.match(result, /<strong>Job Type:<\/strong>/);
  assert.match(result, /<h2>Skills<\/h2>/);
  assert.match(result, /<li>C# \/ .NET<\/li>/);
  assert.match(result, /data_engineering/);
  assert.equal(format(result), result);
});
test('repairs legacy wrappers and removes only the duplicated title', () => {
  const result = format('<h3># Job Title: Data Engineer</h3><p># Job Title: Data Engineer</p><p>## Skills</p><p>- SQL</p><p>- Python</p>', 'Data Engineer');
  assert.equal((result.match(/Job Title: Data Engineer/g) || []).length, 1);
  assert.equal((result.match(/<ul>/g) || []).length, 1);
  assert.match(result, /<li>SQL<\/li>/);
  assert.match(result, /<li>Python<\/li>/);
  assert.equal(format(result, 'Data Engineer'), result);
});
test('plain text does not gain a synthetic title and document fences unwrap', () => {
  assert.equal(format('Build reliable pipelines.', 'Data Engineer'), '<p>Build reliable pipelines.</p>');
  assert.match(format('```markdown\n# Skills\n\n- SQL\n```'), /<h1>Skills<\/h1>/);
  assert.match(format('```sql\nSELECT 1;\n```'), /<pre><code class="language-sql">/);
});
test('safe rich formatting remains and unsafe pasted HTML is removed', () => {
  const result = sanitize('<p class="ql-align-center evil" style="color: red; background-image:url(javascript:alert(1))" onclick="alert(1)"><strong>Skills</strong><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">Bad</a><a href="https://example.com">Good</a></p><svg><script>alert(2)</script></svg>');
  assert.match(result, /class="ql-align-center"/);
  assert.match(result, /color:\s*red/);
  assert.match(result, /<strong>Skills<\/strong>/);
  assert.match(result, /href="https:\/\/example.com"/);
  assert.doesNotMatch(result, /javascript|onclick|onerror|background-image|<script|<svg|<img|evil|alert/);
});
test('parser titles remove Markdown labels without damaging C#', () => {
  assert.equal(normalizeJobTitle('# **Job Title:** C# / .NET Developer'), 'C# / .NET Developer');
  assert.equal(normalizeJobTitle('Unknown'), '');
});

test('editor paste replaces the selection as one undoable user edit and prefers Markdown text', () => {
  const React = require('react');
  const Delta = require('quill-delta');
  const calls = { cutoffs: 0 };
  const editor = {
    constructor: { import: () => Delta },
    clipboard: { convert: ({ html }) => { calls.html = html; return new Delta().insert('Formatted'); } },
    getSelection: () => ({ index: 4, length: 3 }),
    history: { cutoff: () => calls.cutoffs++ },
    updateContents: (delta, source) => { calls.ops = delta.ops; calls.source = source; },
    setSelection: (...args) => { calls.selection = args; },
  };
  const file = path.resolve('components/ui/rich-text-editor.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', code)(module.exports, name => {
    if (name === 'react') return { ...React, useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: () => ({ current: { getEditor: () => editor } }), useMemo: fn => fn(), useEffect: () => {} };
    if (name === 'next/dynamic') return () => () => null;
    if (name.endsWith('.css')) return {};
    if (name === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
    if (name === '@/lib/job-description-format') return load('lib/job-description-format.ts');
    return require(name);
  });
  const tree = module.exports.RichTextEditor({ value: '<p>Existing text</p>', onChange() {} });
  function findPaste(node) {
    if (!node || typeof node !== 'object') return;
    if (node.props?.onPasteCapture) return node.props.onPasteCapture;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = findPaste(child); if (found) return found;
    }
  }
  let prevented = false;
  findPaste(tree)({ clipboardData: { getData: type => type === 'text/plain' ? '## Skills\n\n- SQL' : '<p>## Skills</p>' }, preventDefault: () => { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, true);
  assert.match(calls.html, /<h2>Skills<\/h2>/);
  assert.match(calls.html, /<li>SQL<\/li>/);
  assert.deepEqual(calls.ops, [{ retain: 4 }, { insert: 'Formatted' }, { delete: 3 }]);
  assert.equal(calls.source, 'user');
  assert.deepEqual(calls.selection, [13, 0, 'silent']);
  assert.equal(calls.cutoffs, 2);
});

