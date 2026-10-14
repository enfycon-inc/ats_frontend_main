"use client";

import { useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Loader2, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import {
  InterviewRoundStatus, SubmissionOutcome, ROUND_STATUS_LABELS, OUTCOME_LABELS,
  type RoundKey, type TrackerSubmission, type TrackerUpdate,
} from '@/lib/submission-contract';
import { ROUNDS, interviewInstant, localInterviewParts, validTimezone } from '@/lib/submission-tracker';
import { stageRemarkSuggestions, type StageRemark } from '@/lib/stage-remarks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubmissionHistory } from './submission-history';

type RoundDraft = { status: string; date: string; time: string; remarks: string; interviewer: string };
type Draft = { rounds: Record<RoundKey, RoundDraft>; outcome: string; remarks: string; meetingLink: string };
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60';
const closed = (status: string) => ['REJECTED', 'NOT_SELECTED', 'WITHDRAWN', 'JOIN'].includes(status);

function initialDraft(sub: TrackerSubmission): Draft {
  const zone = validTimezone(sub.timezone);
  return {
    rounds: Object.fromEntries(ROUNDS.map(({ key }) => [key, {
      status: sub[`${key}Status`] || 'PENDING', ...localInterviewParts(sub[`${key}Date`], zone),
      remarks: sub[`${key}Remarks`] || '', interviewer: sub[`${key}Interviewer`] || '',
    }])) as Record<RoundKey, RoundDraft>,
    outcome: sub.finalStatus, remarks: sub.remarks || '', meetingLink: sub.meetingLink || '',
  };
}

function Remarks({ id, value, stage, templates, disabled, onChange }: {
  id: string; value: string; stage: string; templates: StageRemark[]; disabled: boolean; onChange: (value: string) => void;
}) {
  const suggestions = stageRemarkSuggestions(templates, stage);
  return <div className="space-y-1.5">
    <Textarea id={id} aria-label={`${stage.toUpperCase()} remarks`} rows={2} maxLength={4000} value={value} disabled={disabled}
      onChange={event => onChange(event.target.value)} className="text-xs" placeholder="Add remarks…" />
    {!disabled && suggestions.length > 0 && <select aria-label={`${stage.toUpperCase()} remark suggestions`} className={selectClass} value=""
      onChange={event => { const remark = suggestions.find(item => String(item.id) === event.target.value); if (remark) onChange(remark.remarkText); }}>
      <option value="">Choose a configured remark…</option>{suggestions.map(remark => <option key={remark.id} value={remark.id}>{remark.remarkText}</option>)}
    </select>}
  </div>;
}

export function UpdateSubmissionDialog({ submission, href, onClose, onSaved, onReview }: {
  submission: TrackerSubmission; href: string; onClose: () => void;
  onSaved: (submission: TrackerSubmission) => void; onReview: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);
  const requestId = useRef<string | null>(null);
  const { data, error: loadError, mutate, isValidating } = useSWR(['submission-editor', submission.id, submission.updatedAt], async () => {
    const current = await atsApi.submissions.get(submission.id);
    let templates: StageRemark[] = [];
    let templatesUnavailable = false;
    try { templates = await atsApi.submissions.getCustomRemarks(current.branchId || undefined); }
    catch { templatesUnavailable = true; }
    return { current, templates, templatesUnavailable };
  }, {
    revalidateOnFocus: false, revalidateOnReconnect: false,
    onSuccess: value => {
      setDraft(initialDraft(value.current)); setError(''); setCorrectionReason(''); setConfirmReset(false); requestId.current = null;
    },
  });
  const current = data?.current;
  const caps = current?.capabilities;
  const approved = current && current.finalStatus !== 'PENDING_APPROVAL';
  const internalRejected = current?.finalStatus === 'REJECTED' && current.rejectionFromStatus === 'PENDING_APPROVAL';
  const reopening = current && draft && closed(current.finalStatus) && draft.outcome === 'SUBMITTED' && caps?.outcome && !internalRejected;
  const active = Boolean(approved && !internalRejected && (!closed(current!.finalStatus) || reopening));
  const resetIndex = current && draft ? ROUNDS.findIndex(({ key }, index) => current[`${key}Status`] === 'CLEARED' && draft.rounds[key].status !== 'CLEARED' &&
    ROUNDS.slice(index + 1).some(({ key: next }) => ![null, 'PENDING'].includes(current[`${next}Status`]) || current[`${next}Date`] || current[`${next}Remarks`] || current[`${next}Interviewer`])) : -1;
  const affectedRounds = resetIndex < 0 ? [] : ROUNDS.slice(resetIndex + 1);
  const allCleared = Boolean(draft && ROUNDS.every(({ key }) => draft.rounds[key].status === 'CLEARED'));
  const newlyRejected = Boolean(current && draft && ROUNDS.some(({ key }) => draft.rounds[key].status === 'REJECTED' && current[`${key}Status`] !== 'REJECTED'));
  const outcome = newlyRejected ? 'NOT_SELECTED' : draft && !allCleared && ['SELECTED', 'OFFER', 'JOIN'].includes(draft.outcome) ? 'SUBMITTED' : draft?.outcome;
  const progression = ['SUBMITTED', 'SELECTED', 'OFFER', 'JOIN'];
  const needsCorrection = Boolean(current && draft && (outcome !== current.finalStatus && (closed(current.finalStatus) || progression.indexOf(outcome || '') < progression.indexOf(current.finalStatus) && progression.includes(outcome || '')) ||
    ROUNDS.some(({ key }) => JSON.stringify(draft.rounds[key]) !== JSON.stringify(initialDraft(current).rounds[key]) && ['CLEARED', 'REJECTED'].includes(current[`${key}Status`] || ''))));

  function editRound(key: RoundKey, field: keyof RoundDraft, value: string) {
    requestId.current = null; setConfirmReset(false); setError('');
    setDraft(previous => previous && ({ ...previous, rounds: { ...previous.rounds, [key]: { ...previous.rounds[key], [field]: value } } }));
  }
  function editField(field: 'outcome' | 'remarks' | 'meetingLink', value: string) {
    requestId.current = null; setError(''); setDraft(previous => previous && ({ ...previous, [field]: value }));
  }
  async function save() {
    if (!current || !draft || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try {
      if (needsCorrection && !correctionReason.trim()) throw new Error('Enter a reason for correcting the recorded status.');
      if (affectedRounds.length && !confirmReset) throw new Error('Confirm resetting the affected later rounds before saving.');
      const payload: TrackerUpdate = { expectedUpdatedAt: current.updatedAt };
      for (const { key } of ROUNDS) {
        if (affectedRounds.some(round => round.key === key)) continue;
        const row = draft.rounds[key];
        const original = initialDraft(current).rounds[key];
        if (row.status !== original.status) payload[`${key}Status`] = row.status as InterviewRoundStatus;
        if (row.remarks !== original.remarks) payload[`${key}Remarks`] = row.remarks.trim() || null;
        // Rejections/cancellations require a current reason, even when the text was already saved.
        if (row.status !== original.status && ['REJECTED', 'CANCELLED'].includes(row.status)) payload[`${key}Remarks`] = row.remarks.trim();
        if (row.interviewer !== original.interviewer) payload[`${key}Interviewer`] = row.interviewer.trim() || null;
        if (row.date !== original.date || row.time !== original.time) {
          payload[`${key}Date`] = row.date && row.time ? interviewInstant(row.date, row.time, validTimezone(current.timezone)) : null;
        }
      }
      if (outcome !== current.finalStatus) payload.finalStatus = outcome as TrackerUpdate['finalStatus'];
      if (draft.remarks !== (current.remarks || '') || (!newlyRejected && outcome !== current.finalStatus && ['NOT_SELECTED', 'WITHDRAWN'].includes(outcome || ''))) payload.remarks = draft.remarks.trim() || null;
      if (draft.meetingLink !== (current.meetingLink || '')) payload.meetingLink = draft.meetingLink.trim() || null;
      if (Object.keys(payload).length === 1) throw new Error('No changes to save.');
      if (needsCorrection || affectedRounds.length) payload.correctionReason = correctionReason.trim();
      if (affectedRounds.length) payload.resetFollowingRounds = true;
      requestId.current ??= crypto.randomUUID(); payload.requestId = requestId.current;
      const saved = await atsApi.submissions.update(current.id, payload);
      toast.success('Submission updated'); onSaved(saved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save. Please try again.'); }
    finally { saveLock.current = false; setSaving(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saveLock.current) onClose(); }}>
    <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl" onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}>
      <DialogHeader className="border-b border-border px-6 py-4 pr-12"><DialogTitle>Update submission</DialogTitle>
        <DialogDescription className="text-xs">{submission.candidateName || 'Candidate'} · {submission.jobTitle || submission.jobCode}</DialogDescription>
      </DialogHeader>
      {loadError ? <div role="alert" className="p-6 text-xs">Unable to load the latest submission.<Button variant="outline" className="ml-2 text-xs" onClick={() => void mutate()}>Retry</Button></div>
        : !current || !draft ? <p role="status" className="p-8 text-center text-xs"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading submission…</p>
        : <form className="flex min-h-0 flex-col" onSubmit={event => { event.preventDefault(); void save(); }}>
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {!approved && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">Internal approval is required before updating interviews.
              {caps?.review && <Button type="button" variant="outline" className="ml-3 text-xs" onClick={onReview}>Review submission</Button>}</div>}
            {internalRejected && <p className="text-xs text-muted-foreground">Internal review rejected this submission. Interview rounds are read-only.</p>}
            {closed(current.finalStatus) && !internalRejected && <p className="text-xs text-muted-foreground">To correct interview statuses, change Final outcome to In progress and provide a correction reason.</p>}
            <section aria-label="Interview rounds"><h2 className="mb-3 text-sm font-bold">Interview rounds</h2>
              <div className="hidden grid-cols-[50px_155px_1fr_1fr] gap-3 rounded-t-lg border border-border bg-muted/40 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground md:grid"><span>Round</span><span>Status</span><span>Interview details</span><span>Remarks</span></div>
              {ROUNDS.map(({ key, label }, index) => {
                const resetting = affectedRounds.some(round => round.key === key);
                const unlocked = index === 0 || ROUNDS.slice(0, index).every(({ key: prior }) => draft.rounds[prior].status === 'CLEARED');
                const editable = active && unlocked && !resetting && !saving && (!['CLEARED', 'REJECTED'].includes(current[`${key}Status`] || '') || Boolean(caps?.results[key]));
                const row = draft.rounds[key];
                const resultPermission = Boolean(caps?.results[key]);
                const statusEditable = editable && (resultPermission || Boolean(caps?.schedule));
                const detailsEditable = editable && (resultPermission || Boolean(caps?.schedule));
                const remarkEditable = editable && (resultPermission || (['SCHEDULED', 'CANCELLED'].includes(row.status) && Boolean(caps?.schedule)));
                const savedStatus = current[`${key}Status`];
                const hasSavedInterview = Boolean(current[`${key}Date`] && ['SCHEDULED', 'AWAITING_FEEDBACK', 'CLEARED', 'REJECTED'].includes(savedStatus || ''));
                return <div key={key} className="grid gap-3 border border-border p-3 last:rounded-b-lg md:grid-cols-[50px_155px_1fr_1fr] md:border-t-0">
                  <span className="text-xs font-semibold">{label}</span><div className="space-y-2">
                    <select aria-label={`${label} status`} className={selectClass} disabled={!statusEditable} value={resetting ? 'PENDING' : row.status} onChange={event => editRound(key, 'status', event.target.value)}>
                      {Object.values(InterviewRoundStatus).map(status => <option key={status} value={status} disabled={status !== row.status &&
                        ((!resultPermission && !['SCHEDULED', 'CANCELLED', ...(['SCHEDULED', 'CANCELLED'].includes(savedStatus || '') ? ['PENDING'] : [])].includes(status)) || (['CLEARED', 'AWAITING_FEEDBACK'].includes(status) && !hasSavedInterview) ||
                          (['SELECTED', 'OFFER', 'JOIN'].includes(current.finalStatus) && status !== 'CLEARED' && !caps?.outcome))}>{ROUND_STATUS_LABELS[status]}</option>)}
                    </select>
                    {!unlocked && <p className="flex items-center gap-1 text-[10.5px] text-muted-foreground"><LockKeyhole className="h-3 w-3" />Clear {ROUNDS[index - 1]?.label} to unlock</p>}
                    {resetting && <p className="text-[10.5px] text-amber-700 dark:text-amber-300">Will reset to Pending</p>}
                  </div>
                  <div className="space-y-2"><Input aria-label={`${label} interview date`} type="date" className="h-9 text-xs" disabled={!detailsEditable || row.status === 'PENDING'} value={resetting || row.status === 'PENDING' ? '' : row.date} onChange={event => editRound(key, 'date', event.target.value)} />
                    <Input aria-label={`${label} interview time`} type="time" className="h-9 text-xs" disabled={!detailsEditable || row.status === 'PENDING'} value={resetting || row.status === 'PENDING' ? '' : row.time} onChange={event => editRound(key, 'time', event.target.value)} />
                    <Input aria-label={`${label} interviewer`} placeholder="Interviewer" maxLength={255} className="h-9 text-xs" disabled={!detailsEditable || row.status === 'PENDING'} value={resetting || row.status === 'PENDING' ? '' : row.interviewer} onChange={event => editRound(key, 'interviewer', event.target.value)} />
                  </div><Remarks id={`${key}-remarks`} stage={key} templates={data.templates} value={resetting ? '' : row.remarks} disabled={!remarkEditable} onChange={value => editRound(key, 'remarks', value)} />
                </div>;
              })}
              <p className="mt-2 text-[10.5px] text-muted-foreground">Interview times use {validTimezone(current.timezone)}. Save a schedule before recording interview feedback or clearance.</p>
            </section>
            <div className="space-y-1.5"><Label htmlFor="update-meeting-link" className="text-xs">Meeting link</Label><Input id="update-meeting-link" type="url" value={draft.meetingLink} className="h-9 text-xs" disabled={saving || !active || !(caps?.schedule || Object.values(caps?.results || {}).some(Boolean))} onChange={event => editField('meetingLink', event.target.value)} placeholder="https://…" /></div>
            <section className="space-y-3 border-t border-border pt-4" aria-label="Final outcome"><h2 className="text-sm font-bold">Final outcome</h2>
              <select aria-label="Final outcome" className={selectClass} value={outcome} disabled={saving || !approved || !caps?.outcome || internalRejected} onChange={event => editField('outcome', event.target.value)}>
                {!Object.values(SubmissionOutcome).includes(current.finalStatus as SubmissionOutcome) && <option value={current.finalStatus}>{current.finalStatus === 'REJECTED' ? 'Not selected (round rejected)' : 'Awaiting internal approval'}</option>}
                {Object.values(SubmissionOutcome).map(status => <option key={status} value={status} disabled={status !== outcome && (
                  (['SELECTED', 'OFFER', 'JOIN'].includes(status) && !allCleared) ||
                  (status === 'OFFER' && current.finalStatus !== 'SELECTED') || (status === 'JOIN' && current.finalStatus !== 'OFFER'))}>{OUTCOME_LABELS[status]}</option>)}
              </select>
              <p className="text-[10.5px] text-muted-foreground">Clear L3 before selecting the candidate. Then record Offer issued, followed by Joined. Not selected and Withdrawn are available at any stage after internal approval. Rejecting an interview round closes the submission as Not selected.</p>
              <Remarks id="final-remarks" stage="final" templates={data.templates} value={draft.remarks} disabled={saving || !approved || !(caps?.outcome || caps?.notes) || Boolean(internalRejected)} onChange={value => editField('remarks', value)} />
            </section>
            {(needsCorrection || affectedRounds.length > 0) && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <Label htmlFor="correction-reason" className="text-xs">Correction reason (required)</Label><Textarea id="correction-reason" required maxLength={4000} rows={2} className="text-xs" value={correctionReason} disabled={saving} onChange={event => { requestId.current = null; setCorrectionReason(event.target.value); }} />
              {affectedRounds.length > 0 && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmReset} disabled={saving} onChange={event => { requestId.current = null; setConfirmReset(event.target.checked); }} className="mt-0.5" /><span>Reset {affectedRounds.map(round => round.label).join(' and ')} to Pending and clear their current appointments and feedback. Their original values will remain in history.</span></label>}
            </section>}
            {data.templatesUnavailable && <p role="status" className="text-xs text-muted-foreground">Remark suggestions are unavailable. You can enter remarks manually.</p>}
            <div className="flex flex-wrap items-center gap-4 text-xs"><Button type="button" variant="link" className="h-auto p-0 text-xs" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Hide change history' : 'View change history'}</Button><Link href={href} onClick={onClose} className="text-[#1a4fa0] hover:underline dark:text-blue-300">View submission</Link></div>
            {showHistory && <SubmissionHistory submission={current} />}
            {error && <div role="alert" className="text-xs text-red-700 dark:text-red-300">{error}<Button type="button" variant="link" disabled={saving || isValidating} className="ml-2 h-auto p-0 text-xs" onClick={() => void mutate()}>Reload latest values</Button></div>}
          </div>
          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4"><Button type="button" variant="outline" disabled={saving} onClick={onClose} className="text-xs">Cancel</Button><Button type="submit" disabled={saving || isValidating || !approved || Boolean(internalRejected) || !(caps?.outcome || caps?.schedule || caps?.notes || Object.values(caps?.results || {}).some(Boolean))} className="bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save changes</Button></DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>;
}
