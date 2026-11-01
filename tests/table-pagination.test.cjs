const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const ts = require('typescript');
const fs = require('node:fs');
const m = {exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('components/shared/table-pagination.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText)(require,m,m.exports);
const {TablePagination,paginationPages} = m.exports;
const props = {page:2,pageSize:25,total:1248,onPageChange(){}};
function elements(node) { if(!React.isValidElement(node)) return []; return [node,...React.Children.toArray(node.props.children).flatMap(elements)]; }
test('record range, current page and mobile label use the same totals',()=>{
 const html=renderToStaticMarkup(React.createElement(TablePagination,props));
 assert.match(html,/26–50 of 1,248 records/); assert.match(html,/aria-current="page"[^>]*>2/); assert.match(html,/2 \/ 50/);
});
test('navigation is bounded and marks only the active numbered page',()=>{
 const tree=TablePagination({...props,total:51,page:3}); const nodes=elements(tree);
 assert.equal(nodes.find(e=>e.props['aria-label']==='Next page').props.disabled,true);
 assert.equal(nodes.find(e=>e.props['aria-label']==='Last page').props.disabled,true);
 assert.deepEqual(paginationPages(50,50),[1,'gap-left',49,50]);
});
test('empty and unknown totals do not fabricate records or last-page controls',()=>{
 const empty=renderToStaticMarkup(React.createElement(TablePagination,{...props,page:1,total:0})); assert.match(empty,/0–0 of 0 records/);
 const unknown=renderToStaticMarkup(React.createElement(TablePagination,{...props,total:undefined,shown:25,hasNext:true})); assert.match(unknown,/25 records shown/); assert.doesNotMatch(unknown,/Last page|First page|of 1,248/);
});
test('page size resets once and loading prevents navigation',()=>{
 const calls=[];const tree=TablePagination({...props,onPageSizeChange:n=>calls.push(['size',n]),onPageChange:n=>calls.push(['page',n])});
 elements(tree).find(e=>e.type==='select').props.onChange({target:{value:'50'}});assert.deepEqual(calls,[['size',50],['page',1]]);
 const busy=TablePagination({...props,loading:true,onPageChange:n=>calls.push(['page',n])});elements(busy).find(e=>e.props['aria-label']==='Next page').props.onClick();assert.equal(calls.length,2);
});

test('URL-owned page-size changes do not dispatch a second stale navigation',()=>{
 const calls=[]; const tree=TablePagination({...props,resetPageOnSizeChange:false,onPageSizeChange:n=>calls.push(['size',n]),onPageChange:n=>calls.push(['page',n])});
 elements(tree).find(e=>e.type==='select').props.onChange({target:{value:'50'}});assert.deepEqual(calls,[['size',50]]);
});
