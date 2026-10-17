"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Loader2, Plus, Search, X } from "lucide-react";
import { atsApi } from "@/lib/ats-api";
import { resolveActiveSystemRole } from "@/lib/role-permissions";
import { useDashboardContext } from "@/contexts/DashboardContext";
import type { TrackerSubmission, TrackerResponse } from "@/lib/submission-contract";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type CalendarEvent = Awaited<ReturnType<typeof atsApi.submissions.calendarEvents>>[number];

export default function CalendarPage() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const { status: workspaceStatus, selection, profile, roles } = useDashboardContext();
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<TrackerSubmission | null>(null);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState<TrackerSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState("");

  const user = atsApi.auth.getCurrentUser();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canViewCalendar = permissions.includes("*") || ["submission:view", "submission:view_all", "tenant:manage", "tenant:settings", "platform:manage"].some(permission => permissions.includes(permission));
  const hasSchedulePermission = permissions.includes("*") || permissions.includes("submission:schedule_interview");
  const activeRole = selection?.active?.id ? resolveActiveSystemRole(selection.active.id, roles, profile) : "";
  const isAccountManager = activeRole === "ACCOUNT_MANAGER";

  useEffect(() => {
    if (workspaceStatus === "ready") calendarRef.current?.getApi().refetchEvents();
  }, [workspaceStatus]);

  const loadEvents = useCallback(async (range: { startStr: string; endStr: string }, success: (events: EventInput[]) => void, failure: (error: Error) => void) => {
    try {
      setError("");
      const result = await atsApi.submissions.calendarEvents(range.startStr, range.endStr);
      success(result.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        backgroundColor: event.status === "CANCELLED" ? "#94a3b8" : event.status === "AWAITING_FEEDBACK" ? "#d97706" : "#1a4fa0",
        borderColor: event.status === "CANCELLED" ? "#94a3b8" : event.status === "AWAITING_FEEDBACK" ? "#d97706" : "#1a4fa0",
        textColor: "#ffffff",
        extendedProps: event,
      })));
    } catch {
      setError("Interview events could not be loaded for your submission access scope.");
      failure(new Error("Calendar events unavailable"));
    }
  }, []);

  const renderEvent = useCallback((arg: EventContentArg) => {
    const event = arg.event.extendedProps as CalendarEvent;
    return <div className="min-w-0 px-0.5 leading-tight">
      <div className="truncate font-semibold">{arg.timeText} {event.round}</div>
      <div className="truncate">{event.candidateName} · {event.jobTitle || event.jobCode}</div>
      <div className="truncate opacity-90">{event.status.replaceAll("_", " ")}</div>
    </div>;
  }, []);

  const handleEventClick = useCallback(async (info: EventClickArg) => {
    const event = info.event.extendedProps as CalendarEvent;
    if (!event.canManage) {
      router.push(`/utility/submissions?submission=${encodeURIComponent(event.submissionId)}`);
      return;
    }
    setLoadingSelection(true);
    try {
      const submission = await atsApi.submissions.get(event.submissionId);
      if (!submission.capabilities?.schedule) {
        setError("You can view this interview but do not have permission to change it.");
        return;
      }
      setSelectedSubmission(submission);
    } catch {
      setError("This submission is no longer available in your access scope.");
    } finally {
      setLoadingSelection(false);
    }
  }, [router]);

  const openSubmissionPicker = useCallback(async () => {
    if (!hasSchedulePermission) return;
    setChooseOpen(true);
    setSelectionError("");
    setLoadingSubmissions(true);
    try {
      const view = isAccountManager ? "my" : "all";
      const result: TrackerResponse = await atsApi.submissions.list({ view, bucket: "all", page: 1, limit: 25, search });
      setSubmissions(result.data);
    } catch {
      setSelectionError("Submissions could not be loaded for your access scope.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [hasSchedulePermission, isAccountManager, search]);

  const chooseSubmission = useCallback(async (item: TrackerSubmission) => {
    setLoadingSelection(true);
    setSelectionError("");
    try {
      const submission = await atsApi.submissions.get(item.id);
      if (!submission.capabilities?.schedule) {
        setSelectionError("You can view this submission but do not have permission to schedule an interview.");
        return;
      }
      setChooseOpen(false);
      setSelectedSubmission(submission);
    } catch {
      setSelectionError("This submission is no longer available in your access scope.");
    } finally {
      setLoadingSelection(false);
    }
  }, []);

  const statusLabel = useMemo(() => workspaceStatus === "loading" ? "Loading your calendar access…" : null, [workspaceStatus]);

  return <main className="space-y-4 p-5 text-foreground sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2.5 text-[#1a4fa0] dark:bg-blue-950/40 dark:text-blue-300"><CalendarDays className="h-5 w-5" /></div>
        <div><h1 className="text-lg font-bold tracking-tight">Interview Calendar</h1><p className="text-xs text-muted-foreground">Interviews for submissions visible to you. Changes follow submission permissions.</p></div>
      </div>
      {hasSchedulePermission && canViewCalendar && <Button onClick={() => void openSubmissionPicker()} className="h-9 bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]"><Plus className="mr-1.5 h-4 w-4" />Schedule interview</Button>}
    </div>

    {statusLabel && <div role="status" className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">{statusLabel}</div>}
    {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span>{error}</span><button type="button" aria-label="Dismiss" onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}

    <section className="rounded-xl border border-border bg-card p-3 shadow-xs sm:p-4" aria-label="Interview calendar">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Scheduled interviews and feedback due. Cancelled interviews remain in submission history.</div>
      {workspaceStatus === "error" ? <div role="alert" className="p-8 text-center text-xs text-red-700">Calendar access could not be verified. Refresh to retry.</div> : !canViewCalendar ? <div role="alert" className="p-8 text-center text-xs text-red-700">You do not have permission to view interview submissions.</div> :
        <div className="interview-calendar text-xs">
          <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }} height="auto" nowIndicator timeZone="local" events={workspaceStatus === "ready" ? loadEvents : []} eventContent={renderEvent} eventClick={handleEventClick} eventDisplay="block" dayMaxEvents={4} navLinks selectable={false} />
        </div>}
    </section>

    <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4"><DialogTitle className="text-sm">Choose a submission</DialogTitle><DialogDescription className="text-xs">Only submissions visible in your permitted scope are listed. Interview stage rules are checked when you open the editor.</DialogDescription></DialogHeader>
        <div className="px-5 py-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search candidate or job" placeholder="Search candidate, job title, or code…" className="h-9 pl-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void openSubmissionPicker(); }} /></div></div>
        {selectionError && <p role="alert" className="px-5 pb-2 text-xs text-red-700">{selectionError}</p>}
        <div className="max-h-[52vh] overflow-y-auto border-t border-border">
          {loadingSubmissions ? <div role="status" className="flex items-center justify-center gap-2 p-10 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading submissions…</div> : submissions.length ? <ul className="divide-y divide-border">{submissions.map(item => <li key={item.id}><button type="button" disabled={loadingSelection} onClick={() => void chooseSubmission(item)} className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-muted/50 disabled:opacity-50"><span className="min-w-0"><span className="block truncate text-xs font-semibold">{item.candidateName || "Candidate"}</span><span className="mt-1 block truncate text-[10.5px] text-muted-foreground">{item.jobCode} · {item.jobTitle} · {item.finalStatus.replaceAll("_", " ")}</span></span><span className="shrink-0 text-[10.5px] text-[#1a4fa0]">Open interview form →</span></button></li>)}</ul> : <div className="p-10 text-center text-xs text-muted-foreground">No visible submissions found. Use search or check the submission table access.</div>}
        </div>
        <div className="flex justify-end border-t border-border px-5 py-3"><Button variant="outline" size="sm" className="text-xs" onClick={() => setChooseOpen(false)}>Close</Button></div>
      </DialogContent>
    </Dialog>

    <ScheduleInterviewModal isOpen={Boolean(selectedSubmission)} onClose={() => setSelectedSubmission(null)} submission={selectedSubmission} onSuccess={() => calendarRef.current?.getApi().refetchEvents()} />
    {loadingSelection && <div role="status" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"><Loader2 className="h-3.5 w-3.5 animate-spin" />Opening submission…</div>}
  </main>;
}
