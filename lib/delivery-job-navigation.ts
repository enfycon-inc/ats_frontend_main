export function deliveryJobHref(global:Record<string,string>, job:Record<string,string>={}) {
  const query=new URLSearchParams({delivery:'1',period:global.period||'all'});
  if(global.cities)query.set('cities',global.cities);
  if(global.from)query.set('deliveryFrom',global.from);
  if(global.to)query.set('deliveryTo',global.to);
  if(job.jobStatus)query.set('status',job.jobStatus);
  if(job.jobPriority)query.set('priority',job.jobPriority);
  if(job.jobType)query.set('jobType',job.jobType);
  return `${job.jobStatus==='ACTIVE'?'/job-posting/active':'/job-posting/all'}?${query}`;
}
