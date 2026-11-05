const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {JSDOM}=require('jsdom');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const {EmailLink,emailHref}=load('components/shared/email-link.tsx');
const {UserIdentity}=load('components/shared/user-identity.tsx');
const {SubmissionDetailSummary}=load('components/submissions/submission-detail-summary.tsx',{'next/link':{__esModule:true,default:p=>React.createElement('a',p)}});
test('mail links allow one address without permitting injected mail headers',()=>{
  assert.equal(emailHref(' alex+jobs@example.com '),'mailto:alex%2Bjobs@example.com');
  for(const value of ['x@example.com?bcc=other@example.com','x@example.com\r\nBcc:other@example.com','x@example.com,y@example.com','not-an-address','javascript:alert(1)']) assert.equal(emailHref(value),null);
  assert.ok(renderToStaticMarkup(React.createElement(EmailLink,{email:'x@example.com'})).includes('href="mailto:x@example.com"'));
});
test('staff profile controls and email are separate interactive elements',()=>{
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(UserIdentity,{user:{name:'Staff',email:'staff@example.com'},onOpen:()=>{},linkEmail:true}))).window.document;
  assert.equal(doc.querySelector('button a'),null);
  assert.equal(doc.querySelectorAll('button').length,2);
  assert.equal(doc.querySelector('a').getAttribute('href'),'mailto:staff@example.com');
});
test('candidate detail reuses LinkedIn link and omits absent profiles',()=>{
  const render=url=>new JSDOM(renderToStaticMarkup(React.createElement(SubmissionDetailSummary,{submission:{candidateLinkedinUrl:url,candidateEmail:'candidate@example.com',accountManagerEmail:'manager@example.com'},canViewJob:false,compensation:[]}))).window.document;
  assert.equal(render(null).querySelector('[aria-label="LinkedIn profile (opens in a new tab)"]'),null);
  assert.equal(render('https://linkedin.com/in/alex').querySelector('[aria-label="LinkedIn profile (opens in a new tab)"]').getAttribute('href'),'https://linkedin.com/in/alex');
  assert.equal(render(null).querySelectorAll('a[href^="mailto:"]').length,2);
});
