"use client";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export interface CandidateSource { source: string; sourceChannel: string; sourceDetail: string; }
export function CandidateSourceFields({ value, onChange }: { value: CandidateSource; onChange: (value: CandidateSource) => void }) {
 const style = 'h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
 return <section className="space-y-4"><h4 className="border-b border-slate-100 pb-2 text-sm font-bold dark:border-slate-800">Candidate Source</h4><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
 <div className="space-y-2"><Label htmlFor="candidate-source">Source *</Label><select id="candidate-source" value={value.source} className={style} onChange={e => onChange({ source: e.target.value, sourceChannel: '', sourceDetail: '' })}><option>Market</option><option>Bench</option></select></div>
 {value.source === 'Market' && <div className="space-y-2"><Label htmlFor="source-channel">Source Channel *</Label><select id="source-channel" className={style} value={value.sourceChannel} onChange={e => onChange({ ...value, sourceChannel: e.target.value, sourceDetail: '' })}><option value="">Select channel</option>{['LinkedIn', 'Job Portal', 'Employee Referral', 'Recruitment Agency / Vendor', 'Direct Application', 'Existing Talent Pool', 'Other'].map(channel => <option key={channel}>{channel}</option>)}</select></div>}
 {value.source === 'Market' && ['Job Portal', 'Other'].includes(value.sourceChannel) && <div className="space-y-2 sm:col-span-2"><Label htmlFor="source-detail">{value.sourceChannel === 'Job Portal' ? 'Portal Name' : 'Source Details'} *</Label><Input id="source-detail" maxLength={255} placeholder={value.sourceChannel === 'Job Portal' ? 'e.g. Naukri, Indeed' : 'Specify source'} value={value.sourceDetail} onChange={e => onChange({ ...value, sourceDetail: e.target.value })} /></div>}
 </div></section>;
}
