'use client';
import {SearchableSelect} from './searchable-select';
import {staffCityName} from './city-badge';
export function PerformanceCityFilter({cities,selected,onChange}:{cities:string[];selected?:string;onChange:(value:string)=>void}) {
  return <div className="flex min-w-44 flex-col gap-1.5"><span>City</span><SearchableSelect options={[...new Set([...cities,...(selected?selected.split(','):[])])].map(id=>({id,name:id==='UNSPECIFIED'?'City not recorded':staffCityName(id)}))} value="" onValueChange={()=>{}} values={selected?selected.split(','):[]} onValuesChange={values=>onChange(values.join(','))} placeholder="All cities" searchPlaceholder="Search cities" selectionLabel="cities"/></div>;
}
