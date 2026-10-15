"use client";

import type { ReactNode } from "react";
import { BriefcaseBusiness, CalendarClock, CheckCircle2, Files, Layers3 } from "lucide-react";
import type { DeliveryPipeline, DeliveryStage } from "@/lib/delivery-dashboard-contract";
import { deliveryStageLabels, stageShare, submissionCoverage } from "@/lib/delivery-dashboard-presentation";

export const deliverySurface = "min-w-0 rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900";
export const deliveryCell = "px-4 py-3 text-left text-xs";
export const deliveryHeader = "bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";
const tones = {
  blue: { card: "border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", icon: "bg-blue-100 dark:bg-blue-900/50", bar: "bg-blue-500", selected: "ring-blue-500", hex: "#3b82f6" },
  violet: { card: "border-violet-200 bg-violet-50/80 dark:border-violet-900 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", icon: "bg-violet-100 dark:bg-violet-900/50", bar: "bg-violet-500", selected: "ring-violet-500", hex: "#8b5cf6" },
  amber: { card: "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30", text: "text-amber-800 dark:text-amber-300", icon: "bg-amber-100 dark:bg-amber-900/50", bar: "bg-amber-500", selected: "ring-amber-500", hex: "#f59e0b" },
  emerald: { card: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", icon: "bg-emerald-100 dark:bg-emerald-900/50", bar: "bg-emerald-500", selected: "ring-emerald-500", hex: "#10b981" },
  rose: { card: "border-rose-200 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", icon: "bg-rose-100 dark:bg-rose-900/50", bar: "bg-rose-500", selected: "ring-rose-500", hex: "#f43f5e" },
};
const stageTone = { all: "blue", l1: "blue", l2: "violet", l3: "amber", final: "emerald", review: "amber", closed: "rose" } as const;

export function DeliverySection({ title, children, id, note, action }: { title: string; children: ReactNode; id?: string; note?: string; action?: ReactNode }) {
  return <section id={id} className={deliverySurface}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><h2 className="text-sm font-bold">{title}</h2>{note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function DeliveryMetrics({ activeJobs, pipeline, onSelect }: { activeJobs: number | null; pipeline: DeliveryPipeline | null; onSelect: (stage: DeliveryStage) => void }) {
  const metrics = [
    ...(activeJobs !== null ? [{ label: "Active jobs", value: activeJobs, tone: "blue" as const, Icon: BriefcaseBusiness, href: "#delivery-priority-jobs" }] : []),
    ...(pipeline ? [
      { label: "Total submissions", value: pipeline.total, tone: "violet" as const, Icon: Files, stage: "all" as const },
      { label: "Scheduled interviews", value: pipeline.scheduled, tone: "amber" as const, Icon: CalendarClock, href: "#delivery-interviews" },
      { label: "Joined candidates", value: pipeline.joined, tone: "emerald" as const, Icon: CheckCircle2, stage: "final" as const },
    ] : []),
  ];
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => {
    const tone = tones[metric.tone];
    const content = <><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.icon} ${tone.text}`}><metric.Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0"><span className={`block text-xs font-medium ${tone.text}`}>{metric.label}</span><span className="mt-1 block text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{metric.value.toLocaleString()}</span></span></>;
    const className = `flex min-w-0 items-center gap-3 rounded-xl border border-l-4 p-4 text-left shadow-xs transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none ${tone.card}`;
    return "href" in metric ? <a key={metric.label} className={className} href={metric.href}>{content}</a> : <button key={metric.label} type="button" className={className} onClick={() => onSelect(metric.stage)} title={metric.stage === "final" ? "View final outcomes" : "View all submissions"}>{content}</button>;
  })}</div>;
}

export function DeliveryPipelineView({ pipeline, selected, onSelect, showReview, submissionRequired }: { submissionRequired: number | null; pipeline: DeliveryPipeline; selected: DeliveryStage; onSelect: (stage: DeliveryStage) => void; showReview: boolean }) {
  const chartStages: DeliveryStage[] = ["l1", "l2", "l3", "final", "closed", ...(showReview ? ["review" as const] : [])];
  // Keep restricted approval totals out of chart detail while preserving an honest total.
  const other = !showReview && pipeline.review > 0 ? pipeline.review : 0;
  const segments = chartStages.map(stage => ({ stage, label: deliveryStageLabels[stage], count: pipeline[stage === "all" ? "total" : stage], color: tones[stageTone[stage]].hex }));
  const slices = [...segments, ...(other ? [{ stage: null, label: "Other submissions", count: other, color: "#94a3b8" }] : [])];
  let offset = 0;
  return <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <DeliverySection title="Current interview pipeline" note="All-time · Select a stage to view submissions">
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">{(["all", "l1", "l2", "l3", "final"] as const).map(stage => {
        const tone = tones[stageTone[stage]];
        const count = stage === "all" ? pipeline.total : pipeline[stage];
        const share = stageShare(count, stage === "all" ? submissionRequired ?? 0 : pipeline.total);
        return <button key={stage} type="button" aria-pressed={selected === stage} onClick={() => onSelect(stage)} className={`min-w-0 rounded-xl border p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none ${tone.card} ${selected === stage ? `ring-2 ${tone.selected}` : ""} ${stage === "all" ? "col-span-2 lg:col-span-1" : ""}`}>
          <span className={`flex items-center gap-2 text-xs font-semibold ${tone.text}`}><Layers3 className="h-4 w-4 shrink-0" aria-hidden="true" />{deliveryStageLabels[stage]}</span>
          <span className="mt-3 block text-2xl font-bold tabular-nums">{count.toLocaleString()}{stage === "all" && submissionRequired !== null && <span className="text-sm font-medium text-slate-500"> / {submissionRequired.toLocaleString()}</span>}</span>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700"><span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${share}%` }} /></span>
          <span className="mt-2 block text-[10.5px] text-slate-500 dark:text-slate-400">{stage === "all" ? submissionCoverage(count, submissionRequired) !== null ? `${Math.round(submissionCoverage(count, submissionRequired)!)}% of required submissions` : submissionRequired === 0 ? "No submission target" : "Total submissions done" : `${Math.round(share)}% of submissions`}</span>
          {(stage === "l1" || stage === "l2" || stage === "l3") && <span className="mt-3 block text-[10.5px] leading-5 text-slate-600 dark:text-slate-300">Pending {pipeline.rounds[stage].pending}<br />Scheduled {pipeline.rounds[stage].scheduled}<br />Feedback {pipeline.rounds[stage].feedback}{pipeline.rounds[stage].cancelled > 0 && <><br />Cancelled {pipeline.rounds[stage].cancelled}</>}</span>}
          {stage === "final" && <span className="mt-3 block text-[10.5px] leading-5 text-slate-600 dark:text-slate-300">Decision {pipeline.decision}<br />Selected {pipeline.selected}<br />Offers {pipeline.offers} · Joined {pipeline.joined}</span>}
        </button>;
      })}</div>
    </DeliverySection>
    <DeliverySection title="Current stage distribution">
      <div className="flex flex-wrap items-center justify-center gap-4 p-4">
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-label="Submission distribution by current stage">
            <circle cx="50" cy="50" r="38" fill="none" strokeWidth="14" className="stroke-slate-100 dark:stroke-slate-800" />
            {slices.filter(segment => segment.count > 0).map(segment => {
              const share = stageShare(segment.count, pipeline.total);
              const start = offset; offset += share;
              return <circle key={segment.label} cx="50" cy="50" r="38" fill="none" pathLength="100" stroke={segment.color} strokeWidth={segment.stage === selected ? 17 : 14} strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} role={segment.stage ? "button" : "img"} tabIndex={segment.stage ? 0 : undefined} aria-label={`${segment.label}: ${segment.count}`} aria-pressed={segment.stage ? segment.stage === selected : undefined} className={segment.stage ? "cursor-pointer outline-none hover:opacity-80 focus:opacity-70" : ""} onClick={() => { if (segment.stage) onSelect(segment.stage); }} onKeyDown={event => { if (segment.stage && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(segment.stage); } }}><title>{`${segment.label}: ${segment.count}`}</title></circle>;
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold tabular-nums">{pipeline.total.toLocaleString()}</span><span className="text-[10.5px] text-slate-500">submissions</span></div>
        </div>
        <div className="min-w-32 flex-1 space-y-1">{slices.map(segment => segment.stage ? <button type="button" key={segment.label} aria-pressed={selected === segment.stage} onClick={() => onSelect(segment.stage!)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800 ${selected === segment.stage ? "bg-slate-100 font-semibold dark:bg-slate-800" : ""}`}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="text-left">{segment.label}</span><span className="ml-auto font-semibold tabular-nums">{segment.count}</span></button> : <div key={segment.label} className="flex items-center gap-2 px-2 py-1.5 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /><span>{segment.label}</span><span className="ml-auto">{segment.count}</span></div>)}{pipeline.total === 0 && <p className="px-2 pt-2 text-xs text-slate-500">No submissions yet.</p>}</div>
      </div>
    </DeliverySection>
  </div>;
}

export function DeliveryStatus({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const color = ["JOIN", "OFFER", "SELECTED", "ACTIVE"].includes(normalized) ? tones.emerald : ["HOT", "HIGH", "URGENT", "PENDING_APPROVAL"].includes(normalized) ? tones.amber : ["REJECTED", "NOT_SELECTED", "WITHDRAWN", "INACTIVE"].includes(normalized) ? tones.rose : tones.blue;
  const label = normalized === "SUBMITTED" ? "In progress" : value.replaceAll("_", " ");
  return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${color.card} ${color.text}`}>{label}</span>;
}
