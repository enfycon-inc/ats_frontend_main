import {MapPin} from 'lucide-react';
const names:Record<string,string>={BBSR:'Bhubaneswar',VIZAG:'Vizag',PUNE:'Pune',BENGALURU:'Bengaluru',HYDERABAD:'Hyderabad'};
export const staffCityName=(city:string)=>names[city]||city;
export function CityBadge({city,subtle=false}:{city?:string|null;subtle?:boolean}) {
  if(!city || city==='UNSPECIFIED')return null;
  const label=staffCityName(city);
  return <span title={`Staff city: ${label}`} className={`inline-flex max-w-36 shrink-0 items-center gap-1 text-xs font-medium ${subtle ? 'text-slate-500 dark:text-slate-400' : 'rounded bg-blue-50 px-1.5 py-0.5 text-blue-800 dark:bg-blue-950 dark:text-blue-200'}`}><MapPin className="size-3 shrink-0" aria-hidden="true"/><span className="truncate">{label}</span></span>;
}
