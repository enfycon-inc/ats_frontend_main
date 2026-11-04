const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./delivery-dashboard-presentation.test.cjs');
const {deliveryPeriodCaption:caption}=load('lib/delivery-period-caption.ts');
const now=new Date('2026-11-03T12:00:00Z');
test('period captions show full calendar boundaries in the unit timezone',()=>{
  assert.equal(caption({period:'month'},'Asia/Kolkata',now),'01 Nov 2026 – 30 Nov 2026');
  assert.equal(caption({period:'previousMonth'},'Asia/Kolkata',now),'01 Oct 2026 – 31 Oct 2026');
  assert.equal(caption({period:'week'},'Asia/Kolkata',now),'02 Nov 2026 – 08 Nov 2026');
  assert.equal(caption({period:'year'},'Asia/Kolkata',now),'01 Jan 2026 – 31 Dec 2026');
  assert.equal(caption({period:'previousYear'},'Asia/Kolkata',now),'01 Jan 2025 – 31 Dec 2025');
  assert.equal(caption({period:'today'},'Asia/Kolkata',new Date('2026-11-03T20:00:00Z')),'04 Nov 2026');
  assert.equal(caption({period:'custom',from:'2026-10-01',to:'2026-10-15'},'Asia/Kolkata',now),'2026-10-01 – 2026-10-15');
  assert.equal(caption({},'Asia/Kolkata',now),'All recorded dates');
});
