const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const {Pipeline}=load('components/submissions/submission-stage.tsx');
const base={finalStatus:'SUBMITTED',l1Status:'CLEARED',l2Status:'CLEARED',l3Status:null};
const render=row=>renderToStaticMarkup(React.createElement(Pipeline,{submission:{...base,...row}}));
test('final outcomes never pulse an unentered interview round',()=>{
  for(const finalStatus of ['SELECTED','OFFER','JOIN']) for(const l3Status of [null,'PENDING','SCHEDULED','AWAITING_FEEDBACK']) {
    const html=render({finalStatus,l3Status});
    assert.ok(html.includes('(skipped)'));
    assert.ok(!html.includes('animate-pulse'));
  }
});
test('active pending round still highlights; recorded cleared results stay complete',()=>{
  assert.ok(render({}).includes('animate-pulse'));
  assert.ok(!render({finalStatus:'OFFER',l3Status:'CLEARED'}).includes('(skipped)'));
  assert.ok(!render({finalStatus:'REJECTED',rejectionFromStatus:'SUBMITTED'}).includes('animate-pulse'));
});
