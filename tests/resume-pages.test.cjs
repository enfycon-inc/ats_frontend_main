const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><body></body>',{url:'http://localhost'});
global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;global.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=require('react-dom/client');
const {act}=React;
let intersections=[];
global.IntersectionObserver=class{constructor(callback){this.callback=callback;intersections.push(this);}observe(){}disconnect(){this.disconnected=true;}};
global.ResizeObserver=class{observe(){}disconnect(){}};
const revoked=[];let sequence=0;
URL.createObjectURL=()=>`blob:resume-${++sequence}`;URL.revokeObjectURL=url=>revoked.push(url);
dom.window.HTMLAnchorElement.prototype.click=function(){};
const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
function component(api){
 const mod={exports:{}};
 const source=fs.readFileSync('components/candidates/resume-pages.tsx','utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(name=>name==='@/lib/ats-api'?{atsApi:{candidates:api}}:name==='@/components/ui/button'?{Button:({variant,size,...props})=>React.createElement('button',props)}:name==='@/components/page-loading-skeleton'?{PageLoadingSkeleton:()=>React.createElement('div',{role:'status'},'Preparing')}:require(name),mod,mod.exports);
 return mod.exports.ResumePages;
}
const click=async(container,label)=>{const button=[...container.querySelectorAll('button')].find(button=>button.textContent===label);assert.ok(button,label);await act(async()=>button.click());await settle();};
test('first page loads eagerly; page retry and image retry work; candidate switch aborts and revokes',async()=>{
 let fail=true;const calls=[],metadata=[];
 const Viewer=component({resumePreview:async(id,signal)=>{metadata.push(signal);return{pages:3};},resumePage:async(id,page,signal)=>{calls.push({id,page,signal});if(fail){fail=false;throw Error('transient');}return new Blob(['page']);},fetchResumeBlob:async()=>new Blob(['original'],{type:'application/pdf'})});
 const container=document.createElement('div');document.body.appendChild(container);const root=createRoot(container);intersections=[];
 try{
  await act(async()=>root.render(React.createElement(Viewer,{candidateId:'first'})));await settle();
  assert.equal(calls.length,1);assert.equal(calls[0].page,1); // No observer callback fired.
  assert.match(container.textContent,/Unable to display page 1/);
  assert.ok([...container.querySelectorAll('button')].some(button=>button.textContent==='Download original'));
  await click(container,'Retry page 1');assert.ok(container.querySelector('img[alt="Resume page 1"]'));
  await act(async()=>container.querySelector('img').dispatchEvent(new window.Event('error')));
  assert.match(container.textContent,/Unable to display page 1/);
  await click(container,'Retry page 1');assert.ok(container.querySelector('img'));
  const oldSignals=calls.map(call=>call.signal);const before=revoked.length;
  await act(async()=>root.render(React.createElement(Viewer,{candidateId:'second'})));await settle();
  assert.ok(oldSignals.every(signal=>signal.aborted));assert.ok(metadata[0].aborted);assert.ok(revoked.length>before);
  assert.equal(calls.at(-1).id,'second');
  const pending=intersections.filter(observer=>!observer.disconnected).at(-1);
  await act(async()=>pending.callback([{isIntersecting:true}]));await settle();
  assert.ok(calls.some(call=>call.id==='second'&&call.page===2));
  await click(container,'Download original');
  assert.equal(container.querySelector('iframe'),null);
 }finally{await act(async()=>root.unmount());container.remove();}
});
test('metadata failure has retry and original download without reopening',async()=>{
 let count=0;
 const Viewer=component({resumePreview:async()=>{if(!count++)throw Error('failed');return{pages:1};},resumePage:async()=>new Blob(['page']),fetchResumeBlob:async()=>new Blob(['original'])});
 const container=document.createElement('div');document.body.appendChild(container);const root=createRoot(container);
 try{
  await act(async()=>root.render(React.createElement(Viewer,{candidateId:'retry'})));await settle();
  assert.ok(container.querySelector('[role=alert]'));await click(container,'Download original');
  await click(container,'Retry preview');assert.ok(container.querySelector('img[alt="Resume page 1"]'));assert.equal(count,2);
 }finally{await act(async()=>root.unmount());container.remove();}
});
test('metadata and page timeouts abort transport and can recover without reopening',async()=>{
 const nativeSet=global.setTimeout,nativeClear=global.clearTimeout,timers=[];
 global.setTimeout=(fn,delay,...args)=>{if(delay!==30000)return nativeSet(fn,delay,...args);const timer={fn,active:true};timers.push(timer);return timer;};
 global.clearTimeout=timer=>{if(timers.includes(timer))timer.active=false;else nativeClear(timer);};
 let metadata=0,pages=0;const signals=[];
 const waiting=signal=>new Promise((resolve,reject)=>{signals.push(signal);signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});
 const Viewer=component({resumePreview:async(id,signal)=>++metadata===1?waiting(signal):{pages:1},resumePage:async(id,page,signal)=>++pages===1?waiting(signal):new Blob(['page']),fetchResumeBlob:async()=>new Blob()});
 const container=document.createElement('div');document.body.appendChild(container);const root=createRoot(container);
 try{
  await act(async()=>root.render(React.createElement(Viewer,{candidateId:'timeout'})));await settle();
  await act(async()=>timers.find(timer=>timer.active).fn());await settle();assert.ok(signals[0].aborted);assert.ok(container.querySelector('[role=alert]'));
  await click(container,'Retry preview');
  await act(async()=>timers.find(timer=>timer.active).fn());await settle();assert.ok(signals[1].aborted);assert.match(container.textContent,/Unable to display page 1/);
  await click(container,'Retry page 1');assert.ok(container.querySelector('img'));assert.ok(timers.every(timer=>!timer.active));
 }finally{await act(async()=>root.unmount());container.remove();global.setTimeout=nativeSet;global.clearTimeout=nativeClear;}
});
