const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
test('pod columns require unit enablement and existing read permissions',()=>{
  const {availableRecruiterColumns:columns}=load('lib/recruiter-presentation.ts');
  const permissions=['job:view','submission:view','pod:view'];
  assert.ok(!columns(permissions,false).some(c=>c.id==='sharedJobs'));
  assert.ok(columns(permissions,true).some(c=>c.id==='sharedJobs'));
  assert.ok(!columns(['job:view'],true).some(c=>c.id==='sharedJobs'));
  assert.equal(columns(permissions,false).find(c=>c.id==='directActive').label,'Assigned jobs');
});
test('identity shows the supplied city beside the name and omits missing city',()=>{
  const {UserIdentity}=load('components/shared/user-identity.tsx');
  const render=city=>renderToStaticMarkup(React.createElement(UserIdentity,{user:{name:'Amit',email:'amit@example.com',city}}));
  assert.ok(render('VIZAG').includes('Vizag'));
  assert.ok(render('VIZAG').includes('amit@example.com'));
  assert.ok(!render(undefined).includes('Staff city:'));
});
test('closure emphasis is used for positive counts only',()=>{
  const {ClosureCount}=load('components/shared/closure-count.tsx');
  const render=value=>renderToStaticMarkup(React.createElement(ClosureCount,{value}));
  assert.ok(render(2).includes('aria-label="2 closures"'));
  assert.ok(!render(0).includes('aria-label='));
  assert.ok(render(null).includes('—'));
});
