export function deliveryPeriodCaption(values: Record<string,string>, timezone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now).map(part => [part.type,part.value]));
  const y=Number(parts.year), m=Number(parts.month)-1, d=Number(parts.day);
  let start=new Date(Date.UTC(y,m,d)), end=new Date(start);
  const period=values.period || 'all';
  if (period==='all') return 'All recorded dates';
  if (period==='custom') return values.from && values.to ? `${values.from} – ${values.to}` : 'Select date range';
  if (period==='week') { start.setUTCDate(d-((start.getUTCDay()+6)%7)); end=new Date(start); end.setUTCDate(start.getUTCDate()+6); }
  if (period==='month' || period==='previousMonth') { const month=m-(period==='previousMonth'?1:0); start=new Date(Date.UTC(y,month,1)); end=new Date(Date.UTC(y,month+1,0)); }
  if (period==='year' || period==='previousYear') { const year=y-(period==='previousYear'?1:0); start=new Date(Date.UTC(year,0,1)); end=new Date(Date.UTC(year,11,31)); }
  const format=(date:Date)=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(date);
  return start.getTime()===end.getTime()?format(start):`${format(start)} – ${format(end)}`;
}
