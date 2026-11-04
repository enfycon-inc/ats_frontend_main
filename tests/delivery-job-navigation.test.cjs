const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const {deliveryJobHref:href}=load('lib/delivery-job-navigation.ts');
test('job links preserve period and city context and select the matching destination',()=>{
  const global={period:'custom',from:'2026-11-01',to:'2026-11-04',cities:'BBSR,VIZAG'};
  const total=new URL(href(global),'https://local.test');
  assert.equal(total.pathname,'/job-posting/all');
  assert.equal(total.searchParams.get('deliveryFrom'),'2026-11-01');
  assert.equal(total.searchParams.get('deliveryTo'),'2026-11-04');
  assert.equal(total.searchParams.get('cities'),'BBSR,VIZAG');
  const active=new URL(href(global,{jobStatus:'ACTIVE'}),'https://local.test');
  assert.equal(active.pathname,'/job-posting/active');
  assert.equal(active.searchParams.get('status'),'ACTIVE');
  for(const status of ['CLOSED','HOLD'])assert.ok(href(global,{jobStatus:status}).startsWith('/job-posting/all?'));
  assert.equal(new URL(href(global,{jobPriority:'HOT'}),'https://local.test').searchParams.get('priority'),'HOT');
  assert.equal(new URL(href(global,{jobType:'Full-Time'}),'https://local.test').searchParams.get('jobType'),'Full-Time');
});
