const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {JSDOM}=require('jsdom');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const {SubmissionDetailSummary}=load('components/submissions/submission-detail-summary.tsx',{'next/link':{__esModule:true,default:p=>React.createElement('a',p)}});
const submission={jobId:'job-123',jobCode:'JOB-001',jobTitle:'Engineer',candidateName:'Candidate A',candidateEmail:'candidate@example.test',candidatePhone:'+919999999999',recruiterName:'Recruiter B',recruiterEmail:'recruiter@example.test',accountManagerName:'Manager C',accountManagerEmail:'manager@example.test'};
const render=(s=submission,allowed=true)=>new JSDOM(renderToStaticMarkup(React.createElement(SubmissionDetailSummary,{submission:s,canViewJob:allowed,compensation:[{label:'Current CTC',value:'—'},{label:'Expected CTC',value:'—'}]}))).window.document;
test('contacts remain within their corresponding named sections',()=>{
  const doc=render();
  const section=name=>[...doc.querySelectorAll('section')].find(element=>element.getAttribute('aria-label')===name)?.textContent ?? (()=>{throw Error([...doc.querySelectorAll('section')].map(element=>element.outerHTML.slice(0,150)).join('\n'));})();
  assert.match(section('Candidate'),/candidate@example.test/);
  assert.match(section('Candidate'),/Candidate phone\+919999999999/);
  assert.doesNotMatch(section('Recruiter'),/candidate@example.test|9999999999/);
  assert.match(section('Recruiter'),/Recruiter emailrecruiter@example.test/);
  assert.match(section('Account manager'),/Account manager emailmanager@example.test/);
  assert.doesNotMatch(section('Job & client'),/candidate@example.test/);
});
test('job code links to the actual job only with job access and a job ID',()=>{
  assert.equal(render().querySelector('a').getAttribute('href'),'/job-posting/job-123');
  assert.equal(render(submission,false).querySelector('a'),null);
  assert.equal(render({...submission,jobId:''}).querySelector('a'),null);
});
test('website applicants do not acquire employee contacts or staff city',()=>{
  const doc=render({...submission,submissionOrigin:'WEBSITE',recruiterCity:'VIZAG'});
  const recruiter=doc.querySelector('section[aria-label="Recruiter"]').textContent;
  assert.doesNotMatch(recruiter,/recruiter@example.test|Vizag/);
  assert.match(recruiter,/Not provided/);
});
