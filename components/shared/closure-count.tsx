import {Check} from 'lucide-react';
export function ClosureCount({value}:{value?:number|null}) {
  return value!=null&&value>0?<span aria-label={`${value} closures`} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 font-semibold tabular-nums text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"><Check className="size-3.5" aria-hidden="true"/>{value.toLocaleString()}</span>:<span className="tabular-nums">{value==null?'—':value.toLocaleString()}</span>;
}
