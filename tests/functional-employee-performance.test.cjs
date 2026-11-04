const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
function render(mode){
  let request;
  const row={id:'staff',city:'BBSR',name:'Person',email:'person@example.com',avatar:null,postedJobs:8,activeJobs:6,closedJobs:2,joined:1,assigned:7,submissions:12,rejected:3};
  const mocks={
    react:{...React,useState:initial=>React.useState(initial==='managers'?mode:initial)},
    '@/contexts/DashboardContext':{useDashboardContext:()=>({profile:{id:'actor',permissions:['user:manage','job:view','submission:view']},selection:{active:{id:'role'}}})},
    'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
    swr:{__esModule:true,default:key=>{if(key)request=key;return {isLoading:false,data:key?{performanceCities:[{city:'BBSR',total:1,rows:[row],summary:row}]}:undefined};}}
  };
  const {FunctionalEmployeePerformance:View}=load('components/dashboard/functional-employee-performance.tsx',mocks);
  const html=renderToStaticMarkup(React.createElement(View,{analytics:{from:'2026-10-31T18:30:00+00:00',to:'2026-11-04T18:30:00+00:00'},values:{cities:'BBSR'}}));
  return {html,request};
}
test('manager compact view uses job metrics and canonical ISO period filters',()=>{
  const {html,request}=render('managers');
  for(const label of ['Account manager','Total','Active','Closed','Closure','person@example.com','View all account managers'])assert.ok(html.includes(label),label);
  assert.ok(!html.includes('Employee chart metric'));
  assert.ok(!html.includes('<th>Rejected</th>'));
  assert.equal(request[2].from,'2026-10-31T18:30:00.000Z');
  assert.equal(request[2].sort,'postedJobs');
});
test('recruiter compact view uses assigned, submission, all-stage rejected and closure',()=>{
  const {html,request}=render('recruiters');
  for(const label of ['Assigned','Submission','Rejected','Closure','View all recruiters'])assert.ok(html.includes(label),label);
  assert.ok(!html.includes('<th>Active</th>'));
  assert.equal(request[2].sort,'submissions');
  assert.equal(request[2].cities,'BBSR');
});
