const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop:true },
  }).outputText;
  const module = {exports:{}};
  new Function('exports','require',code)(module.exports, name => imports[name] || require(name));
  return module.exports;
}
const { signInOptions } = load('lib/sign-in-policy.ts');
test('password controls and SSO enforcement share the same presentation rules', () => {
  for (const allowPasswordLogin of [true,false]) for (const enforceSsoOnly of [true,false]) {
    assert.equal(signInOptions({allowPasswordLogin,enforceSsoOnly,allowDeveloperLogin:false}).password, allowPasswordLogin && !enforceSsoOnly);
  }
});
test('developer disclosure is absent by default and collapsed when enabled', () => {
  const { DeveloperAccess } = load('components/auth/developer-access.tsx', {
    '@/components/ui/button':{Button:props => React.createElement('button',props)},
    '@/components/ui/input':{Input:props => React.createElement('input',props)},
  });
  assert.equal(renderToStaticMarkup(React.createElement(DeveloperAccess,{enabled:false})), '');
  const markup = renderToStaticMarkup(React.createElement(DeveloperAccess,{enabled:true}));
  assert.match(markup, /<details/);
  assert.doesNotMatch(markup, /<details[^>]* open/);
  assert.match(markup, /Developer access/);
  assert.match(markup, /type="password"/);
  assert.match(markup, /w-full[^"]*justify-center/);
  assert.doesNotMatch(markup, /⌄|rotate-180|chevron/i);
  assert.match(markup, /list-none/);
});
test('frontend policy contract matches the backend canonical source', {skip:!fs.existsSync(path.join(__dirname,'../../ats_backend/src/auth/sign-in-policy.ts'))}, () => {
  const read = p => fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
  assert.equal(read(path.join(__dirname,'../lib/sign-in-policy.ts')),read(path.join(__dirname,'../../ats_backend/src/auth/sign-in-policy.ts')));
});

test('developer password access cannot bypass workspace-required MFA', () => {
  assert.equal(signInOptions({allowPasswordLogin:false,enforceSsoOnly:true,allowDeveloperLogin:true,requireMfa:true}).developer,false);
});

function renderLogin(policy, status = 'ready', pending = false, error = null) {
  let index = 0;
  const hookReact = {...React,
    useState: initial => [initial === null ? error : initial === 'loading' ? status : (typeof initial === 'object' && initial?.allowPasswordLogin !== undefined ? policy : index++ === 1 ? true : initial), () => {}],
    useTransition: () => [pending, () => {}], useRef: () => ({current:null}), useEffect: () => {},
  };
  const native = type => props => React.createElement(type,props);
  const { DeveloperAccess } = load('components/auth/developer-access.tsx', {
    '@/components/ui/button':{Button:native('button')}, '@/components/ui/input':{Input:native('input')},
  });
  const component = load('components/auth/login-form.tsx', {
    react:hookReact,
    '@/components/ui/button':{Button:native('button')}, '@/components/ui/input':{Input:native('input')}, '@/components/ui/label':{Label:native('label')},
    'next/link':native('a'), 'next/navigation':{useSearchParams:() => new URLSearchParams()},
    'react-hook-form':{useForm:() => ({register:() => ({}),handleSubmit:() => () => {},setValue:() => {},formState:{errors:{}}})},
    '@/lib/utils':{cn:(...values) => values.filter(v => typeof v === 'string').join(' ')},
    'lucide-react':new Proxy({}, {get:() => native('span')}),
    'next-auth/react':{signIn:() => {},signOut:() => {}}, '@/lib/ats-api':{atsApi:{}},
    '@/lib/sso-error':{}, 'react-hot-toast':{},
    '@/utils/subdomain-helper':{getTenantIdentifier:() => 'workspace',getCurrentSubdomain:() => 'workspace',getBaseDomain:() => 'example.test'},
    '@/hooks/use-sign-in-policy':{useSignInPolicy:() => ({data:policy,mutate:() => {}})},
    '@/lib/sign-in-policy':{signInOptions}, './developer-access':{DeveloperAccess},
    './social':() => React.createElement('button',null,'Continue with Microsoft'), '@/lib/safe-login-callback':{},
  }).default;
  return renderToStaticMarkup(React.createElement(component));
}
const policy = {allowPasswordLogin:false,allowMicrosoftSso:true,allowGoogleSso:false,allowDeveloperLogin:true,enforceSsoOnly:true,tenantId:'tenant',microsoftTenantId:'11111111-1111-4111-8111-111111111111',microsoftClientId:'client'};
test('provider-only login removes enforcement text and puts collapsed developer access last', () => {
  const markup = renderLogin(policy);
  assert.doesNotMatch(markup,/SSO.*Enforced|Work Email/);
  assert.ok(markup.indexOf('Continue with Microsoft') < markup.indexOf('Developer access'));
  assert.match(markup, /<details/);
});
test('mixed sign-in keeps developer form outside the normal password form', () => {
  const markup = renderLogin({...policy,allowPasswordLogin:true,enforceSsoOnly:false});
  assert.match(markup,/Work Email/);
  assert.ok(markup.indexOf('</form>') < markup.indexOf('Developer access'));
});
test('policy loading or failure never renders credentials as a fallback', () => {
  for (const status of ['loading','error']) assert.doesNotMatch(renderLogin(policy,status), /<form|Developer access|type="password"/);
});

test('developer form stays mounted and disabled while credential verification is pending', () => {
  const markup = renderLogin(policy,'ready',true);
  assert.match(markup, /Developer access/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /Signing in/);
  assert.doesNotMatch(markup, /fixed inset-0/);
});
test('developer failure stays inline below the expanded form controls', () => {
  const markup = renderLogin(policy,'ready',false,{mode:'developer',message:'Unable to sign in with this account.'});
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Unable to sign in with this account/);
  assert.ok(markup.indexOf('Developer email') < markup.indexOf('Unable to sign in with this account'));
  assert.ok(markup.indexOf('Need access?') < markup.indexOf('Developer access'));
});
