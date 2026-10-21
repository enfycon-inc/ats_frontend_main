const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function source(file) { return ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText; }
function brand(env={}) { const result={};new Function('exports','process',source('lib/app-brand.ts'))(result,{env});return result.APP_BRAND; }
test('central branding has the requested product, attribution and website defaults',()=>{
  assert.deepEqual(brand(),{name:'EnfySync ATS',companyName:'Enfycon India Pvt Ltd',website:'https://enfycon.com/',websiteLabel:'enfycon.com'});
});
test('all public branding values can be overridden without editing components',()=>{
  assert.deepEqual(brand({NEXT_PUBLIC_APP_NAME:' Example ATS ',NEXT_PUBLIC_COMPANY_NAME:' Example Ltd ',NEXT_PUBLIC_COMPANY_WEBSITE:'https://example.test'}),{name:'Example ATS',companyName:'Example Ltd',website:'https://example.test/',websiteLabel:'example.test'});
  assert.equal(brand({NEXT_PUBLIC_APP_NAME:'  '}).name,'EnfySync ATS');
});
test('footer website rejects executable URLs',()=>{assert.throws(()=>brand({NEXT_PUBLIC_COMPANY_WEBSITE:'javascript:alert(1)'}),/HTTP/);});
test('shared footer uses global attribution and links the configured company website safely',()=>{
  const result={};
  new Function('exports','require',source('components/shared/product-footer.tsx'))(result,name=>name==='@/lib/app-brand'?{APP_BRAND:brand()}:require(name));
  const markup=renderToStaticMarkup(React.createElement(result.ProductFooter));
  assert.match(markup,/A product of Enfycon India Pvt Ltd/);
  assert.match(markup,/EnfySync ATS/);
  assert.match(markup,/href="https:\/\/enfycon.com\/"/);
  assert.match(markup,/rel="noopener noreferrer"/);
  assert.doesNotMatch(markup,/>enfycon.com</);
  const loginFooter=renderToStaticMarkup(React.createElement(result.ProductFooter,{showAttribution:false}));
  assert.doesNotMatch(loginFooter,/A product of/);
});
test('login layout spans the viewport and uses configured product attribution',()=>{
  const result={};
  const imports={
    react:{...React,useEffect:()=>{},useState:()=>[true,()=>{}]},
    'react/jsx-runtime':require('react/jsx-runtime'),
    'next/link':{default:props=>React.createElement('a',props),__esModule:true},
    'next/image':{default:({priority,...props})=>React.createElement('img',props),__esModule:true},
    './login-page.module.css':{default:{page:'auth-page',title:'auth-title'},__esModule:true},
    'lucide-react':new Proxy({},{get:()=>()=>React.createElement('svg')}),
    '@/components/auth/login-form':{default:()=>React.createElement('button',null,'Continue with Microsoft'),__esModule:true},
    '@/components/shared/enfycon-logo':{default:()=>React.createElement('span',null,'Example ATS'),__esModule:true},
    '@/components/shared/company-logo-image':{},
    '@/components/shared/product-footer':{ProductFooter:()=>React.createElement('footer',null,'Company footer')},
    './recruitment-illustration':{RecruitmentIllustration:()=>React.createElement('svg',{'data-illustration':'recruitment'})},
    '@/lib/app-brand':{APP_BRAND:brand({NEXT_PUBLIC_APP_NAME:'Example ATS'})},
    '@/utils/subdomain-helper':{getTenantIdentifier:()=> 'workspace'},
    '@/hooks/use-sign-in-policy':{useSignInPolicy:()=>({data:{name:'A workspace with a long company name'}})},
  };
  new Function('exports','require',source('components/auth/login-page-content.tsx'))(result,name=>imports[name]);
  const markup=renderToStaticMarkup(React.createElement(result.default));
  assert.match(markup,/Example ATS/);
  assert.match(markup,/\(Product of <a[^>]*><span[^>]*>Enfycon<\/span> India Pvt Ltd<\/a>\)/);
  assert.match(markup,/data-illustration="recruitment"/);
  assert.equal((markup.match(/href="https:\/\/enfycon.com\/"/g)||[]).length,2);
  assert.doesNotMatch(markup,/max-w-\[1120px\]|bg-\[#163b70\]/);
  assert.match(markup,/Company footer/);
  assert.match(markup,/hidden.*lg:flex/);
  assert.match(markup,/h-dvh overflow-y-auto/);
  assert.doesNotMatch(markup,/Enfycon ATS|blur-\[140px\]/);
});
