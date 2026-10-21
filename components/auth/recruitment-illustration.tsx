import { APP_BRAND } from '@/lib/app-brand';

/** Decorative sample pipeline: no tenant or candidate data is fetched. */
export function RecruitmentIllustration() {
  return <div className="w-full max-w-[780px]">
    <div className="mb-8 px-4 xl:px-6">
      <p className="text-xl font-bold tracking-tight text-slate-900 xl:text-2xl">From application to placement</p>
      <p className="mt-3 text-sm text-slate-500">One workspace for your hiring team.</p>
    </div>
    <svg viewBox="0 0 800 650" className="h-auto max-h-[72dvh] w-full" aria-hidden="true" focusable="false">
      <rect x="15" y="30" width="770" height="560" rx="50" fill="#f1f6ff" />
      <rect x="45" y="65" width="710" height="465" rx="16" fill="white" stroke="#cbdcf5" strokeWidth="2" />
      <path d="M61 65h678a16 16 0 0 1 16 16v24H45V81a16 16 0 0 1 16-16" fill="#dce9fc" />
      {[70, 88, 106].map((x, i) => <circle key={x} cx={x} cy="85" r="4" fill={['#1a4fa0', '#60a5fa', '#94a3b8'][i]} />)}
      <path d="M45 105h65v425H61a16 16 0 0 1-16-16" fill="#1a4fa0" />
      {[140, 195, 250, 305, 360, 415].map(y => <g key={y}><rect x="65" y={y} width="24" height="20" rx="5" fill="#ffffff" opacity=".85" /><path d={`M71 ${y + 7}h12m-12 6h8`} stroke="#1a4fa0" strokeWidth="2" /></g>)}
      <text x="135" y="140" fontSize="14" fill="#475569" fontFamily="sans-serif">{APP_BRAND.name}</text>
      <text x="135" y="175" fontSize="23" fontWeight="700" fill="#0f172a" fontFamily="sans-serif">Recruitment pipeline</text>
      <rect x="135" y="193" width="590" height="1" fill="#e2e8f0" />
      {[
        {label:'Applied', color:'#eff6ff', accent:'#2563eb'},
        {label:'Screening', color:'#f5f3ff', accent:'#7c3aed'},
        {label:'Interview', color:'#fffbeb', accent:'#b45309'},
        {label:'Offer', color:'#ecfdf5', accent:'#047857'},
      ].map((stage, index) => <g key={stage.label} transform={`translate(${135 + index * 150} 215)`}>
        <rect width="138" height="283" rx="8" fill={stage.color} />
        <text x="12" y="25" fontFamily="sans-serif" fontSize="13" fontWeight="600" fill={stage.accent}>{stage.label}</text>
        {[45, 120, 195].map(y => <g key={y} transform={`translate(8 ${y})`}>
          <rect width="122" height="65" rx="7" fill="white" stroke="#e2e8f0" />
          <circle cx="22" cy="23" r="12" fill={stage.color} />
          <circle cx="22" cy="19" r="4" fill={stage.accent} opacity=".65" />
          <path d="M14 31q0-12 16 0" fill={stage.accent} opacity=".65" />
          <rect x="42" y="16" width="65" height="5" rx="2" fill="#94a3b8" />
          <rect x="42" y="27" width="45" height="4" rx="2" fill="#cbd5e1" />
          <rect x="12" y="47" width="48" height="5" rx="2" fill={stage.color} />
        </g>)}
      </g>)}
      <g transform="translate(65 435) rotate(-7)">
        <rect width="205" height="185" rx="12" fill="white" stroke="#cbdcf5" strokeWidth="2" />
        <circle cx="36" cy="38" r="19" fill="#dbeafe" />
        <circle cx="36" cy="32" r="7" fill="#60a5fa" /><path d="M23 51q0-22 26 0" fill="#60a5fa" />
        <text x="67" y="35" fontSize="13" fontWeight="600" fill="#1e293b" fontFamily="sans-serif">Candidate profile</text>
        {[78, 100, 122, 144].map(y => <g key={y}><rect x="22" y={y} width="157" height="5" rx="2" fill="#dce7f5" /><rect x="22" y={y+10} width="110" height="4" rx="2" fill="#eff6ff" /></g>)}
      </g>
      <g transform="translate(450 470)">
        <rect width="270" height="148" rx="12" fill="white" stroke="#cbdcf5" strokeWidth="2" />
        <rect x="20" y="22" width="25" height="25" rx="4" fill="#dbeafe" />
        <path d="M25 18v8m15-8v8m-20 7h25" stroke="#2563eb" strokeWidth="2" />
        <text x="57" y="39" fontSize="14" fontWeight="600" fill="#0f172a" fontFamily="sans-serif">Interview scheduled</text>
        <text x="22" y="77" fontSize="12" fill="#475569" fontFamily="sans-serif">Meet your next team member</text>
        <rect x="22" y="98" width="220" height="27" rx="5" fill="#eff6ff" />
        <text x="47" y="116" fontSize="11" fill="#1a4fa0" fontFamily="sans-serif">Connect talent with opportunity</text>
      </g>
    </svg>
  </div>;
}
