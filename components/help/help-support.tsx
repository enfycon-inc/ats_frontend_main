"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { BookOpen, ChevronRight, Expand, Mail, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HELP_GUIDES, HELP_REVIEWED_ON, HELP_TASKS } from "@/lib/help-content";
import { getHelpGuide, helpHref, helpSearchSelection, matchesHelpText, readHelpSelection, searchHelp } from "@/lib/help-navigation";
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/support";
import type { HelpGuide, HelpPage, HelpSelection, HelpTask } from "@/lib/help-contract";
import { cn } from "@/lib/utils";

const surface = "rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";
type Navigate = (selection: HelpSelection) => void;

export default function HelpSupport() {
  const params = useSearchParams();
  const selection = readHelpSelection(params);
  const guide = getHelpGuide(selection.guideId);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchHelp(query), [query]);
  const searching = query.trim().length > 0;

  function navigate(next: HelpSelection) {
    const href = helpHref(next);
    if (window.location.pathname + window.location.search !== href) {
      // Next's native-history integration updates useSearchParams without a data request.
      window.history.pushState(null, "", href);
    }
    setQuery("");
  }

  useEffect(() => {
    const id = selection.taskId ? `help-task-${selection.taskId}` : selection.faqId ? `help-faq-${selection.faqId}` : null;
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [selection.guideId, selection.taskId, selection.faqId]);

  return <div className="min-w-0 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p>Practical guides for recruitment, delivery, staffing, and workspace administration.</p>
      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">Content reviewed {formatDate(HELP_REVIEWED_ON)}</span>
    </div>

    <section aria-label="Search all help guides" className={cn(surface, "p-4")}>
      <label htmlFor="help-search" className="mb-2 block font-semibold text-slate-900 dark:text-white">Find a workflow or answer</label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input id="help-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search jobs, pods, candidate submissions, managers, permissions…" className="h-9 pl-9 pr-10 text-xs md:text-xs" aria-controls="help-search-results" />
        {searching && <button type="button" aria-label="Clear help search" onClick={() => setQuery("")} className={cn(focus, "absolute right-1 top-1 rounded p-1.5")}><X className="h-4 w-4" /></button>}
      </div>
      <div aria-live="polite" role="status" className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{searching ? `${results.length} results across all role guides` : "Search instructions, prerequisites, troubleshooting, and FAQs across all eight guides."}</div>
      {searching && <div id="help-search-results" className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
        {results.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{results.map(result => <li key={`${result.guideId}:${result.kind}:${result.id}`}>
          <a href={helpHref(helpSearchSelection(result))} onClick={event => { event.preventDefault(); navigate(helpSearchSelection(result)); }} className={cn(focus, "block p-3 hover:bg-slate-50 dark:hover:bg-slate-800")}>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400">{getHelpGuide(result.guideId).name} · {result.kind === "task" ? "Step-by-step task" : result.kind === "faq" ? "FAQ" : result.kind === "page" ? "Marked screenshot" : "Role guide"}</span>
            <span className="mt-1 block font-semibold text-indigo-700 dark:text-indigo-300">{result.title}</span>
            <span className="mt-1 line-clamp-2 block text-slate-600 dark:text-slate-400">{result.summary}</span>
          </a>
        </li>)}</ul> : <p className="p-4">No matching guides or answers. Try a different word, clear the search, or email <a className="underline" href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a>.</p>}
      </div>}
    </section>

    <WorkspaceOverview />
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
      <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p>For any help, please email <a href={SUPPORT_EMAIL_HREF} className={cn(focus, "rounded font-semibold underline underline-offset-2")}>{SUPPORT_EMAIL}</a>. Include the page, action, error, and approximate time; remove passwords, sign-in codes, and unnecessary personal information.</p>
    </div>

    <nav aria-label="Choose role guide" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {HELP_GUIDES.map(item => <button key={item.id} type="button" aria-pressed={guide.id === item.id} onClick={() => navigate({ guideId: item.id, pageId: item.pages[0].id })} className={cn(surface, focus, "flex min-w-0 items-center gap-3 p-4 text-left transition-colors", guide.id === item.id ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-950/40 dark:ring-indigo-400" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
        <div className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">{item.name}</span><span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{item.summary}</span></div>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-500" />
      </button>)}
    </nav>
    <nav aria-label="Guide sections" className="flex flex-wrap gap-x-5 gap-y-2 text-indigo-700 dark:text-indigo-300">
      <a className={cn(focus, "rounded underline underline-offset-2")} href="#help-screens">Marked site screens</a>
      <a className={cn(focus, "rounded underline underline-offset-2")} href="#help-tasks">Step-by-step task library</a>
      <a className={cn(focus, "rounded underline underline-offset-2")} href="#help-descriptions">Detailed workflow</a>
      <a className={cn(focus, "rounded underline underline-offset-2")} href="#help-faqs">FAQs</a>
    </nav>

    <GuideWorkspace key={guide.id} guide={guide} selection={selection} navigate={navigate} />
    <p className="text-[11px] text-slate-500 dark:text-slate-400">Screenshots are captured demo examples, with their original labels and perspective identified. Your current permissions, branch, unit, and records may differ. Choosing a guide never changes your role or grants access.</p>
  </div>;
}

function GuideWorkspace({ guide, selection, navigate }: { guide: HelpGuide; selection: HelpSelection; navigate: Navigate }) {
  const page = guide.pages.find(item => item.id === selection.pageId) ?? guide.pages[0];
  return <div className="space-y-4">
    <ScreenGuide key={page.id} page={page} guide={guide} navigate={navigate} />
    <TaskLibrary key={selection.taskId ?? "tasks"} guide={guide} selectedTask={selection.taskId} />
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
      <section id="help-descriptions" className={cn(surface, "min-w-0 scroll-mt-4 p-4 md:p-5")} aria-labelledby="help-workflow-title">
        <h2 id="help-workflow-title" className="text-sm font-bold text-slate-900 dark:text-white">{guide.name}: complete workflow</h2>
        <p className="mt-3 leading-7">{guide.intro}</p>
        {guide.sections.map(section => <div key={section.id} className="mt-5"><h3 className="font-bold text-slate-900 dark:text-white">{section.title}</h3><p className="mt-2 leading-7">{section.body}</p></div>)}
      </section>
      <FaqLibrary key={selection.faqId ?? "faqs"} guide={guide} selectedFaq={selection.faqId} />
    </div>
  </div>;
}

function ScreenGuide({ page, guide, navigate }: { page: HelpPage; guide: HelpGuide; navigate: Navigate }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  return <section id="help-screens" className="grid min-w-0 scroll-mt-4 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]" aria-label={`${guide.name} marked site screens`}>
    <div className={cn(surface, "min-w-0 overflow-hidden")}>
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">{page.title}</h2><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{page.caption}</p></div><Button size="sm" variant="outline" className="h-8 gap-2 text-xs" onClick={() => setExpanded(true)}><Expand aria-hidden="true" className="h-3.5 w-3.5" />Enlarge screenshot</Button></div>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Guide screenshots">{guide.pages.map(item => <button key={item.id} type="button" aria-pressed={item.id === page.id} onClick={() => navigate({ guideId: guide.id, pageId: item.id })} className={cn(focus, "rounded-md border px-2.5 py-1.5 text-[11px]", item.id === page.id ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800")}>{item.title}</button>)}</nav>
      </div>
      <p className="border-b border-slate-200 bg-slate-50 p-4 leading-6 dark:border-slate-700 dark:bg-slate-800/50">{page.description}</p>
      <div className="p-2 md:p-4"><MarkedScreenshot page={page} selected={selected} onSelect={setSelected} /></div>
      <p className="border-t border-slate-200 px-4 py-3 text-[10.5px] text-slate-500 dark:border-slate-700 dark:text-slate-400">Actual demo-site capture · {formatDate(page.image.capturedOn)}. Numbered outlines are guide annotations; they do not operate the application.</p>
    </div>
    <aside className="space-y-4">
      <div className={cn(surface, "p-4")}><h3 className="text-sm font-bold text-slate-900 dark:text-white">Follow the markings</h3><ol className="mt-3 space-y-2">{page.markers.map((marker, index) => <li key={index}><button type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className={cn(focus, "flex w-full gap-3 rounded-lg p-2 text-left", selected === index && "bg-orange-50 dark:bg-orange-950/30")}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">{index + 1}</span><span><span className="block font-semibold text-slate-900 dark:text-white">{marker.title}</span><span className="mt-1 block text-[11px] leading-6 text-slate-600 dark:text-slate-400">{marker.body}</span></span></button></li>)}</ol></div>
      <SupportPanel />
    </aside>
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[92dvh] overflow-y-auto p-4 sm:max-w-[95vw]" aria-describedby="help-enlarged-description"><DialogHeader className="pr-8"><DialogTitle className="text-sm">{page.title}</DialogTitle><DialogDescription id="help-enlarged-description" className="text-xs">{page.caption}. Select a numbered marking to highlight its instruction.</DialogDescription></DialogHeader><div className="overflow-auto"><div className="min-w-[640px]"><MarkedScreenshot page={page} selected={selected} onSelect={setSelected} /></div></div><p className="text-xs"><strong>{selected + 1}. {page.markers[selected]?.title}</strong> — {page.markers[selected]?.body}</p></DialogContent></Dialog>
  </section>;
}

function MarkedScreenshot({ page, selected, onSelect }: { page: HelpPage; selected: number; onSelect: (index: number) => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div role="status" className="rounded-lg bg-slate-100 p-6 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">The reference screenshot could not load. The numbered instructions and detailed task guide remain available below.</div>;
  return <figure className="relative isolate bg-white" aria-label={`${page.title} with numbered annotations`}>
    {/* The optimizer's internal request has no session; load these authenticated assets directly. */}
    <Image unoptimized src={page.image.src} width={page.image.width} height={page.image.height} sizes="(min-width: 1280px) 70vw, 100vw" alt={`${page.title}. ${page.caption}. Use the corresponding numbered instructions for an accessible explanation.`} className="block h-auto w-full" onError={() => setFailed(true)} />
    {page.markers.map((marker, index) => <button key={index} type="button" aria-label={`Step ${index + 1}: ${marker.title}`} aria-pressed={selected === index} onClick={() => onSelect(index)} className={cn(focus, "absolute rounded-md border-2 border-orange-600", selected === index && "border-[3px] bg-orange-100/25")} style={{ left: `${marker.x}%`, top: `${marker.y}%`, width: `${marker.width}%`, height: `${marker.height}%` }}><span aria-hidden="true" className="absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-orange-700 text-[11px] font-bold text-white">{index + 1}</span></button>)}
  </figure>;
}

function TaskLibrary({ guide, selectedTask }: { guide: HelpGuide; selectedTask?: string }) {
  const [query, setQuery] = useState("");
  const tasks = HELP_TASKS.filter(task => task.guideIds.includes(guide.id));
  const matches = tasks.filter(task => matchesHelpText(query, task.title, task.where, task.prerequisites, ...task.steps, task.result, task.troubleshooting));
  return <section id="help-tasks" className={cn(surface, "scroll-mt-4 p-4 md:p-5")} aria-labelledby="help-tasks-title">
    <h2 id="help-tasks-title" className="text-sm font-bold text-slate-900 dark:text-white">{guide.name}: step-by-step tasks</h2>
    <p className="mt-2">Each task includes prerequisites, numbered steps, the expected result, and common blockers. Available actions depend on your permissions and scope.</p>
    <label htmlFor="help-task-search" className="mb-2 mt-4 block font-semibold">Find a task in this guide</label><Input id="help-task-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search assignment, pipeline, staff, manager, permissions…" className="h-9 max-w-xl text-xs md:text-xs" />
    <p className="my-3 text-[11px] text-slate-500 dark:text-slate-400" aria-live="polite" role="status">{matches.length} of {tasks.length} tasks</p>
    <div className="space-y-2">{matches.map(task => <TaskArticle key={`${task.id}:${selectedTask ?? ""}`} task={task} selected={task.id === selectedTask} />)}</div>
    {!matches.length && <p className="py-4">No matching tasks in this guide. Clear the search, choose another guide, or use the search at the top to search all roles.</p>}
  </section>;
}

function TaskArticle({ task, selected }: { task: HelpTask; selected: boolean }) {
  return <details id={`help-task-${task.id}`} open={selected || undefined} className="scroll-mt-4 rounded-lg border border-slate-200 dark:border-slate-700">
    <summary className={cn(focus, "cursor-pointer rounded-lg p-3 font-semibold text-slate-900 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800")}>{task.title}</summary>
    <div className="space-y-3 px-4 pb-4 leading-6"><p><strong>Where:</strong> {task.where}</p><p><strong>Before you start:</strong> {task.prerequisites}</p><ol className="list-decimal space-y-2 pl-5">{task.steps.map((step, index) => <li key={index} className="pl-1">{step}</li>)}</ol><p><strong>Expected result:</strong> {task.result}</p><p className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><strong>If you are blocked:</strong> {task.troubleshooting}</p></div>
  </details>;
}

function FaqLibrary({ guide, selectedFaq }: { guide: HelpGuide; selectedFaq?: string }) {
  const [query, setQuery] = useState("");
  const matches = guide.faqs.filter(faq => matchesHelpText(query, faq.title, faq.body));
  return <section id="help-faqs" className={cn(surface, "min-w-0 scroll-mt-4 p-4 md:p-5")} aria-labelledby="help-faq-title">
    <h2 id="help-faq-title" className="text-sm font-bold text-slate-900 dark:text-white">{guide.name} FAQs</h2>
    <label htmlFor="help-faq-search" className="mb-2 mt-3 block font-semibold">Find an answer in this guide</label><Input id="help-faq-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search approval, CV, interview, billing…" className="h-9 text-xs md:text-xs" />
    <p className="my-3 text-[11px] text-slate-500 dark:text-slate-400" aria-live="polite" role="status">{matches.length} of {guide.faqs.length} questions</p>
    <div className="divide-y divide-slate-200 dark:divide-slate-700">{matches.map(faq => <details key={`${faq.id}:${selectedFaq ?? ""}`} id={`help-faq-${faq.id}`} open={faq.id === selectedFaq || undefined} className="scroll-mt-4"><summary className={cn(focus, "cursor-pointer rounded py-3 font-semibold text-slate-900 dark:text-white")}>{faq.title}</summary><p className="pb-4 leading-7">{faq.body}</p></details>)}</div>
    {!matches.length && <p className="py-4">No matching questions. Try another word or email <a href={SUPPORT_EMAIL_HREF} className="text-indigo-700 underline dark:text-indigo-300">{SUPPORT_EMAIL}</a>.</p>}
  </section>;
}

function SupportPanel() {
  return <div className={cn(surface, "p-4")}><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Mail aria-hidden="true" className="h-4 w-4" />Need more help?</h3><p className="mt-3 leading-6">For any help, please email</p><a href={SUPPORT_EMAIL_HREF} className={cn(focus, "mt-1 block break-all rounded font-semibold text-indigo-700 underline underline-offset-2 dark:text-indigo-300")}>{SUPPORT_EMAIL}</a><p className="mt-3 text-[11px] leading-6 text-slate-500 dark:text-slate-400">Include the page and steps that caused the issue. Omit passwords, sign-in codes, and unnecessary candidate or staff information.</p></div>;
}

function WorkspaceOverview() {
  const rows = [
    ["Recruiter", "Source candidates, import CVs, submit to jobs, and track progress.", "Eligible job scope; interview edits need their own capabilities."],
    ["Account Manager / BDM", "Client requirements, job posting, permitted allocation, and pipeline updates.", "Configured role permissions and job scope; approvals still apply."],
    ["Delivery Head", "Delivery pipeline, scoped staff management, pods, and job allocation.", "Cannot manage role definitions/permissions or assign administrative roles."],
    ["Pod Lead / teamLead", "Coordinate pod jobs, eligible recruiter allocation, and permitted review.", "Leadership comes from the pod relationship; unit scope remains enforced."],
    ["Unit Admin", "Assigned unit settings, membership, and permitted staff/pod actions.", "Own unit; elevated branch/tenant administration is restricted."],
    ["Branch Admin", "Assigned branch, local units, and permitted staffing.", "Assigned branch; no automatic tenant-wide access."],
    ["Tenant Admin", "Tenant branches, units, role policy, and eligible administrative assignments.", "Tenant boundaries and action-specific checks still apply."],
  ];
  return <section className={cn(surface, "p-4")} aria-label="Workspace organization">
    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />How your workspace is organized</h2>
    <div className="my-3 flex flex-wrap items-center gap-2" aria-label="Tenant contains branches, branches contain operating units, and units contain pods and eligible staff">{["Tenant / company", "Branch / office", "Operating unit", "Pod & eligible staff"].map((label, index) => <span key={label} className="inline-flex items-center gap-2">{index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 text-slate-400" />}<span className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">{label}</span></span>)}</div>
    <p className="leading-6">Business roles define allowed actions; branch/unit assignments define operational scope. Pod membership, job assignment, designated review-manager routing, and administrative responsibility are separate relationships.</p>
    <details className="mt-3"><summary className={cn(focus, "cursor-pointer rounded font-semibold text-indigo-700 dark:text-indigo-300")}><BookOpen aria-hidden="true" className="mr-2 inline h-3.5 w-3.5" />Role responsibilities and important limits</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><caption className="sr-only">Role responsibilities, operational scope, and access limits</caption><thead className="bg-slate-50 dark:bg-slate-800"><tr>{["Role / perspective", "Responsibilities when permitted", "Scope and limits"].map(label => <th key={label} scope="col" className="p-3 text-[10.5px] font-bold uppercase tracking-wide">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[0]} className="border-b border-slate-100 dark:border-slate-800">{row.map((cell, index) => index === 0 ? <th key={index} scope="row" className="p-3 align-top font-semibold">{cell}</th> : <td key={index} className="p-3 align-top leading-6">{cell}</td>)}</tr>)}</tbody></table></div></details>
  </section>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
