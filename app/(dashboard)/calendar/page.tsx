"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search, X } from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import { resolveActiveSystemRole } from "@/lib/role-permissions";
import { useDashboardContext } from "@/contexts/DashboardContext";
import type { EligibleInterviewCandidate, RoundKey, TrackerSubmission } from "@/lib/submission-contract";
import { CalendarInterviewDialog } from "@/components/interviews/calendar-interview-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type CalendarEvent = Awaited<ReturnType<typeof atsApi.submissions.calendarEvents>>[number];
type CalendarView = "month" | "week" | "agenda";

function eventColor(event: CalendarEvent) {
  if (event.color) return ({ blue: "#2563eb", violet: "#7c3aed", rose: "#e11d48", green: "#15803d", amber: "#b45309" } as Record<string, string>)[event.color] || "#2383e2";
  if (event.status === "AWAITING_FEEDBACK") return "#7c3aed";
  if (event.round === "L1") return "#2383e2";
  if (event.round === "L2") return "#7c3aed";
  return "#e34f72";
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function eligibleRound(submission: TrackerSubmission): RoundKey | null {
  if (submission.finalStatus !== "SUBMITTED") return null;
  const rounds: RoundKey[] = ["l1", "l2", "l3"];
  const index = rounds.findIndex(round => submission[`${round}Status`] !== "CLEARED");
  if (index < 0) return null;
  const current = rounds[index];
  if (![null, undefined, "PENDING", "CANCELLED"].includes(submission[`${current}Status`])) return null;
  if (submission[`${current}Status`] !== "CANCELLED" && submission[`${current}Date`]) return null;
  if (rounds.slice(index + 1).some(round => ![null, undefined, "PENDING"].includes(submission[`${round}Status`]) || Boolean(submission[`${round}Date`]))) return null;
  return current;
}

export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const loadedRangeRef = useRef("");
  const eventRequestRef = useRef(0);
  const { status: workspaceStatus, selection, profile, roles } = useDashboardContext();
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<TrackerSubmission | null>(null);
  const [selectedRound, setSelectedRound] = useState<RoundKey | undefined>();
  const [selectedStart, setSelectedStart] = useState<string | undefined>();
  const [chooseOpen, setChooseOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState<EligibleInterviewCandidate[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionTotalPages, setSubmissionTotalPages] = useState(1);
  const [openedReadOnly, setOpenedReadOnly] = useState(false);
  const [openedCanEdit, setOpenedCanEdit] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [now, setNow] = useState(0);
  const [interviewerFilter, setInterviewerFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [visibleRange, setVisibleRange] = useState<{ startStr: string; endStr: string } | null>(null);

  const user = atsApi.auth.getCurrentUser();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canViewCalendar = permissions.includes("*") || ["submission:view", "submission:view_all", "tenant:manage", "tenant:settings", "platform:manage"].some(permission => permissions.includes(permission));
  const hasSchedulePermission = permissions.includes("*") || permissions.includes("submission:schedule_interview");
  const activeRole = selection?.active?.id ? resolveActiveSystemRole(selection.active.id, roles, profile) : "";
  const isAccountManager = activeRole === "ACCOUNT_MANAGER";

  const loadEvents = useCallback(async (range: { startStr: string; endStr: string }, force = false) => {
    if (workspaceStatus !== "ready" || !canViewCalendar) return;
    const rangeKey = `${range.startStr}|${range.endStr}`;
    if (!force && loadedRangeRef.current === rangeKey) return;
    loadedRangeRef.current = rangeKey;
    const requestId = ++eventRequestRef.current;
    setLoadingEvents(true);
    try {
      setError("");
      const result = await atsApi.submissions.calendarEvents(range.startStr, range.endStr);
      if (requestId === eventRequestRef.current) {
        setEvents(result);
        setNow(Date.now());
      }
    } catch {
      if (requestId === eventRequestRef.current) {
        loadedRangeRef.current = "";
        setError("Interview events could not be loaded for your submission access scope.");
      }
    } finally {
      if (requestId === eventRequestRef.current) setLoadingEvents(false);
    }
  }, [workspaceStatus, canViewCalendar]);

  const handleDatesSet = useCallback((range: DatesSetArg) => {
    const nextRange = { startStr: range.startStr, endStr: range.endStr };
    setCalendarTitle(range.view.title);
    setVisibleRange(nextRange);
    void loadEvents(nextRange);
  }, [loadEvents]);

  useEffect(() => {
    if (workspaceStatus !== "ready" || !canViewCalendar || !visibleRange) return;
    const timeout = window.setTimeout(() => void loadEvents(visibleRange), 0);
    return () => window.clearTimeout(timeout);
  }, [workspaceStatus, canViewCalendar, visibleRange, loadEvents]);

  const visibleEvents = useMemo(() => events.filter(event =>
    (interviewerFilter === "all" || (event.interviewer || "Unassigned") === interviewerFilter) &&
    (roundFilter === "all" || event.round === roundFilter),
  ), [events, interviewerFilter, roundFilter]);

  const calendarItems: EventInput[] = useMemo(() => visibleEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString(),
    backgroundColor: eventColor(event),
    borderColor: "transparent",
    textColor: "#ffffff",
    extendedProps: event,
  })), [visibleEvents]);

  const upcomingEvents = useMemo(() => visibleEvents
    .filter(event => now > 0 && new Date(event.start).getTime() >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 8), [visibleEvents, now]);
  const interviewers = useMemo(() => [...new Set(events.map(event => event.interviewer || "Unassigned"))].sort(), [events]);

  const renderEvent = useCallback((arg: EventContentArg) => {
    const event = arg.event.extendedProps as CalendarEvent;
    return <div className="min-w-0 px-0.5 leading-tight">
      <div className="truncate font-semibold">{arg.timeText} {event.candidateName}</div>
      <div className="truncate">{event.jobTitle || event.jobCode} · {event.round}</div>
      <div className="truncate opacity-90">{event.interviewer || "Interviewer TBD"}</div>
    </div>;
  }, []);

  const openEvent = useCallback(async (event: CalendarEvent) => {
    setLoadingSelection(true);
    try {
      const submission = await atsApi.submissions.get(event.submissionId);
      setSelectedRound(event.round.toLowerCase() as RoundKey);
      setSelectedStart(event.start);
      setOpenedReadOnly(true);
      setOpenedCanEdit(event.canManage);
      setSelectedSubmission(submission);
    } catch {
      setError("This submission is no longer available in your access scope.");
    } finally {
      setLoadingSelection(false);
    }
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    void openEvent(info.event.extendedProps as CalendarEvent);
  }, [openEvent]);

  const openSubmissionPicker = useCallback(async () => {
    if (!hasSchedulePermission) return;
    setChooseOpen(true);
    setSelectionError("");
    setSubmissions([]);
    setSubmissionPage(1);
    setSubmissionTotalPages(1);
    setLoadingSubmissions(true);
    try {
      const view = isAccountManager ? "my" : "all";
      const result = await atsApi.submissions.eligibleForInterview({ view, page: 1, limit: 25, search });
      setSubmissions(result.data);
      setSubmissionPage(result.page);
      setSubmissionTotalPages(result.totalPages);
    } catch {
      setSelectionError("Submissions could not be loaded for your access scope.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [hasSchedulePermission, isAccountManager, search]);

  const loadMoreEligible = useCallback(async () => {
    if (submissionPage >= submissionTotalPages || loadingSubmissions) return;
    setLoadingSubmissions(true);
    try {
      const view = isAccountManager ? "my" : "all";
      const result = await atsApi.submissions.eligibleForInterview({ view, page: submissionPage + 1, limit: 25, search });
      setSubmissions(current => [...current, ...result.data]);
      setSubmissionPage(result.page);
      setSubmissionTotalPages(result.totalPages);
    } catch {
      setSelectionError("More eligible candidates could not be loaded.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [isAccountManager, loadingSubmissions, search, submissionPage, submissionTotalPages]);

  const chooseSubmission = useCallback(async (item: EligibleInterviewCandidate) => {
    setLoadingSelection(true);
    setSelectionError("");
    try {
      const submission = await atsApi.submissions.get(item.id);
      if (!submission.capabilities?.schedule) {
        setSelectionError("You can view this submission but do not have permission to schedule an interview.");
        return;
      }
      const currentEligibleRound = eligibleRound(submission);
      if (!currentEligibleRound || currentEligibleRound !== item.eligibleRound) {
        setSelectionError("This candidate is no longer eligible. Refresh the eligible candidate list.");
        return;
      }
      setOpenedReadOnly(false);
      setOpenedCanEdit(true);
      setChooseOpen(false);
      setSelectedRound(currentEligibleRound);
      setSelectedStart(undefined);
      setSelectedSubmission(submission);
    } catch {
      setSelectionError("This submission is no longer available in your access scope.");
    } finally {
      setLoadingSelection(false);
    }
  }, []);

  const refreshCalendar = useCallback(() => {
    if (visibleRange) void loadEvents(visibleRange, true);
  }, [loadEvents, visibleRange]);

  const statusLabel = useMemo(() => workspaceStatus === "loading" ? "Loading your calendar access…" : null, [workspaceStatus]);

  return <main className="space-y-4 p-5 text-foreground sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs text-muted-foreground">View and manage scheduled interviews across submissions visible to you.</p></div>
      {hasSchedulePermission && canViewCalendar && <Button onClick={() => void openSubmissionPicker()} className="h-9 bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]"><Plus className="mr-1.5 h-4 w-4" />Schedule Interview</Button>}
    </div>

    {statusLabel && <div role="status" className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">{statusLabel}</div>}
    {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span>{error}</span><button type="button" aria-label="Dismiss" onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}

    {workspaceStatus === "error" ? <div role="alert" className="rounded-xl border border-border bg-card p-10 text-center text-xs text-red-700">Calendar access could not be verified. Refresh to retry.</div> : !canViewCalendar ? <div role="alert" className="rounded-xl border border-border bg-card p-10 text-center text-xs text-red-700">You do not have permission to view interview submissions.</div> :
      <section className="grid gap-4 rounded-xl border border-border bg-card p-3 shadow-xs sm:p-4 xl:grid-cols-[minmax(0,1fr)_270px]" aria-label="Interview calendar">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1"><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => calendarRef.current?.getApi().today()}>Today</Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous period" onClick={() => calendarRef.current?.getApi().prev()}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next period" onClick={() => calendarRef.current?.getApi().next()}><ChevronRight className="h-4 w-4" /></Button><span className="ml-2 text-sm font-bold">{calendarTitle}</span></div>
            <div className="flex items-center rounded-md border border-border p-0.5">{(["month", "week", "agenda"] as const).map(view => <Button key={view} variant={calendarView === view ? "default" : "ghost"} size="sm" className={`h-7 px-2.5 text-[11px] capitalize ${calendarView === view ? "bg-[#1a4fa0] text-white hover:bg-[#154181]" : ""}`} onClick={() => { setCalendarView(view); if (view !== "agenda") calendarRef.current?.getApi().changeView(view === "month" ? "dayGridMonth" : "timeGridWeek"); }}>{view}</Button>)}</div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label htmlFor="calendar-interviewer-filter" className="text-[11px] text-muted-foreground">Interviewer</label><select id="calendar-interviewer-filter" value={interviewerFilter} onChange={event => setInterviewerFilter(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="all">All interviewers</option>{interviewers.map(name => <option key={name} value={name}>{name}</option>)}</select>
            <label htmlFor="calendar-round-filter" className="ml-2 text-[11px] text-muted-foreground">Interview round</label><select id="calendar-round-filter" value={roundFilter} onChange={event => setRoundFilter(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="all">All rounds</option><option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option></select>
            {loadingEvents && <span role="status" className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Updating</span>}
          </div>
          {calendarView === "agenda" ? <div className="min-h-[570px] divide-y divide-border rounded-lg border border-border">{visibleEvents.length ? visibleEvents.slice().sort((a, b) => a.start.localeCompare(b.start)).map(event => <button key={event.id} type="button" onClick={() => void openEvent(event)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"><span className="w-28 shrink-0 text-[11px] text-muted-foreground">{dateLabel(event.start, { dateStyle: "medium", timeStyle: "short" })}</span><span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: eventColor(event) }} /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{event.candidateName} · {event.jobTitle || event.jobCode}</span><span className="text-[10px] text-muted-foreground">{event.round} · {event.interviewer || "Interviewer not assigned"}</span></span></button>) : <p className="p-10 text-center text-xs text-muted-foreground">No interviews in this period.</p>}</div> : null}
          <div className={`interview-calendar text-xs ${calendarView === "agenda" ? "hidden" : ""}`}><FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" headerToolbar={false} height="auto" nowIndicator timeZone="local" events={calendarItems} datesSet={handleDatesSet} eventContent={renderEvent} eventClick={handleEventClick} eventDisplay="block" dayMaxEvents={4} navLinks selectable={false} /></div>
        </div>
        <aside className="rounded-lg border border-border bg-card" aria-label="Upcoming interviews"><div className="flex items-center justify-between border-b border-border px-3 py-3"><h2 className="text-xs font-bold">Upcoming interviews</h2><button type="button" className="text-[10px] font-medium text-[#1a4fa0] hover:underline" onClick={() => setCalendarView("agenda")}>View all</button></div><div className="max-h-[620px] divide-y divide-border overflow-y-auto">{upcomingEvents.length ? upcomingEvents.map(event => <button key={event.id} type="button" onClick={() => void openEvent(event)} className="flex w-full gap-2.5 px-3 py-3 text-left hover:bg-muted/40"><span className="mt-0.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: eventColor(event) }} /><span className="min-w-0"><span className="block text-[10px] font-medium text-muted-foreground">{dateLabel(event.start, { weekday: "short", month: "short", day: "numeric" })} · {dateLabel(event.start, { timeStyle: "short" })}</span><span className="mt-1 block truncate text-[11px] font-semibold">{event.candidateName}</span><span className="block truncate text-[10px] text-muted-foreground">{event.jobTitle || event.jobCode} · {event.round} · {event.interviewer || "Interviewer TBD"}</span></span></button>) : <p className="p-8 text-center text-[11px] text-muted-foreground">No upcoming interviews in this period.</p>}</div></aside>
      </section>}

    <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4"><DialogTitle className="text-sm">Eligible candidates</DialogTitle><DialogDescription className="text-xs">Candidates with completed internal review and a pending next interview round are shown.</DialogDescription></DialogHeader>
        <div className="px-5 py-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search candidate or job" placeholder="Search candidate, job title, or code…" className="h-9 pl-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void openSubmissionPicker(); }} /></div></div>
        {selectionError && submissions.length > 0 && <p role="alert" className="px-5 pb-2 text-xs text-red-700">{selectionError}</p>}
        <div className="max-h-[52vh] overflow-y-auto border-t border-border">
          {loadingSubmissions && !submissions.length ? <div role="status" className="flex items-center justify-center gap-2 p-10 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading eligible candidates…</div>
            : selectionError && !submissions.length ? <div className="space-y-3 p-8 text-center"><p role="alert" className="text-xs text-red-700">{selectionError}</p><Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => void openSubmissionPicker()}>Retry</Button></div>
              : submissions.length ? <ul className="divide-y divide-border">{submissions.map(item => <li key={item.id}><button type="button" disabled={loadingSelection} onClick={() => void chooseSubmission(item)} className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-muted/50 disabled:opacity-50"><span className="min-w-0"><span className="block truncate text-xs font-semibold">{item.candidateName || "Candidate"}</span><span className="mt-1 block truncate text-[10.5px] text-muted-foreground">{item.jobCode} · {item.jobTitle} · Next round: {item.eligibleRound?.toUpperCase()}</span></span><span className="shrink-0 text-[10.5px] text-[#1a4fa0]">Schedule interview →</span></button></li>)}</ul>
                : <div className="p-10 text-center text-xs text-muted-foreground">No candidates are currently eligible for an interview. Complete internal review and clear each previous round to make the next round available.</div>}
        </div>
        {submissionPage < submissionTotalPages && <div className="flex justify-center border-t border-border px-5 py-2"><Button variant="outline" size="sm" className="text-xs" disabled={loadingSubmissions} onClick={() => void loadMoreEligible()}>{loadingSubmissions ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}Load more candidates</Button></div>}
        <div className="flex justify-end border-t border-border px-5 py-3"><Button variant="outline" size="sm" className="text-xs" onClick={() => setChooseOpen(false)}>Close</Button></div>
      </DialogContent>
    </Dialog>

    <CalendarInterviewDialog key={`${selectedSubmission?.id || "none"}-${selectedRound || "new"}-${selectedStart || "new"}`} submission={selectedSubmission} round={selectedRound} start={selectedStart} readOnly={openedReadOnly} allowEdit={openedCanEdit} interviewerOptions={interviewers.filter(name => name !== "Unassigned")} onClose={() => { setSelectedSubmission(null); setSelectedRound(undefined); setSelectedStart(undefined); }} onSaved={() => { setSelectedSubmission(null); setSelectedRound(undefined); setSelectedStart(undefined); refreshCalendar(); }} />
    {loadingSelection && <div role="status" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"><Loader2 className="h-3.5 w-3.5 animate-spin" />Opening submission…</div>}
  </main>;
}
