const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const {LinkedinProfileLink,safeLinkedinProfile}=load('components/shared/linkedin-profile-link.tsx');
test('stored LinkedIn profiles render a safe compact link regardless of source',()=>{
  const html=renderToStaticMarkup(React.createElement(LinkedinProfileLink,{url:'https://www.linkedin.com/in/alex-test?trk=website'}));
  assert.ok(html.includes('href="https://www.linkedin.com/in/alex-test"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('LinkedIn profile'));
});
test('missing and unsafe stored values do not create links or placeholders',()=>{
  for(const url of [null,undefined,'','  ','javascript:alert(1)','https://linkedin.com.evil.test/in/a','https://evil.test/in/a','https://user@linkedin.com/in/a','https://linkedin.com/company/a','http://linkedin.com/in/a','https://linkedin.com:444/in/a','https://linkedin.com/in/a\nb']) {
    assert.equal(safeLinkedinProfile(url),null);
    assert.equal(renderToStaticMarkup(React.createElement(LinkedinProfileLink,{url})), '');
  }
});
