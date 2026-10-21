const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('signed-out login artwork is public while application routes remain protected', async () => {
  let authCalls = 0;
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../proxy.ts'),'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS},
  }).outputText;
  new Function('exports','require',code)(exports, name => {
    if(name === './auth') return {auth:async()=>{authCalls++; return null;}};
    if(name === 'next/server') return {NextResponse:{next:()=>({status:200}),redirect:url=>({status:307,url:String(url)})}};
    throw new Error(name);
  });
  const request = pathname => ({nextUrl:new URL(`https://workspace.enfyjobs.com${pathname}`),url:`https://workspace.enfyjobs.com${pathname}`,headers:new Headers({host:'workspace.enfyjobs.com'})});
  assert.equal((await exports.proxy(request('/assets/images/auth/auth-img.png'))).status,200);
  assert.equal(authCalls,0);
  for(const pathname of ['/utility/users','/assets/private-record','/assets/images/auth-private/secret']) {
    const response=await exports.proxy(request(pathname));
    assert.equal(response.status,307);
    assert.match(response.url,/\/auth\/login$/);
  }
  assert.equal(authCalls,3);
});
