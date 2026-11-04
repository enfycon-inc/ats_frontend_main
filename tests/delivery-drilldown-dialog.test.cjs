const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const box=({children})=>React.createElement('div',null,children);
function render(selection,data){
  const {DeliveryDrilldownDialog:View}=load('components/dashboard/delivery-drilldown-dialog.tsx',{
    '@/components/ui/dialog':{Dialog:box,DialogContent:box,DialogTitle:box,DialogDescription:box},
    '@/components/dashboard/delivery-filter-picker':{DeliveryFilterPicker:()=>null},
    './delivery-filter-picker':{DeliveryFilterPicker:()=>null},
    'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
    swr:{__esModule:true,default:key=>({data:key?data:undefined,isLoading:false,mutate:()=>{}})}
  });
  return renderToStaticMarkup(React.createElement(View,{selection,scope:'test',globalFilters:{period:'month',cities:'VIZAG'},analytics:{timezone:'Asia/Kolkata',jobCounts:{types:{'Full-Time':1}}},onClose:()=>{}}));
}
test('job popup shows scoped job identity, poster email and open-job action',()=>{
  const html=render({kind:'jobs',filters:{jobStatus:'ACTIVE'}},{page:1,total:1,items:[{id:'job',jobTitle:'Engineer',jobCode:'J104',clientName:'Client',postedBy:{name:'Poster',email:'poster@example.com'},postedAt:'2026-11-01T10:00:00Z',status:'ACTIVE',priority:'HOT',jobType:'Full-Time',submissions:2}]});
  for(const value of ['Active jobs','poster@example.com','J104','Open job','/job-posting/job','Through today'])assert.ok(html.includes(value),value);
});
test('submission popup exposes candidate and both identity emails and navigation actions',()=>{
  const html=render({kind:'submissions',stage:'final',status:'JOIN'},{submissionTotal:1,submissions:[{id:'submission',candidateName:'Candidate',candidateEmail:'candidate@example.com',jobId:'job',jobTitle:'Engineer',jobCode:'J104',clientName:'Client',postedBy:{name:'Poster',email:'poster@example.com'},submittedBy:{name:'Recruiter',email:'recruiter@example.com'},postedAt:'2026-11-01T10:00:00Z',submittedAt:'2026-11-01T10:00:00Z',updatedAt:'2026-11-01T10:00:00Z',stageStatus:'JOIN',rounds:[]}]});
  for(const value of ['Joined candidates','candidate@example.com','poster@example.com','recruiter@example.com','Open submission','Open job','submission=submission'])assert.ok(html.includes(value),value);
});
