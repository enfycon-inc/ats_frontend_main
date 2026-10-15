"use client";

import { useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Loader2, Pencil, Plus } from 'lucide-react';
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

type RoundDraft = { status: string; date: string; time: string; remarks: string };
type Draft = { rounds: Record<RoundKey, RoundDraft>; outcome: string; remarks: string };
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60';
const closed = (status: string) => ['REJECTED', 'NOT_SELECTED', 'WITHDRAWN', 'JOIN'].includes(status);

function initialDraft(sub: TrackerSubmission): Draft {
  const zone = validTimezone(sub.timezone);
  return {
    rounds: Object.fromEntries(ROUNDS.map(({ key }) => [key, {
      status: sub[`${key}Status`] || 'PENDING', ...localInterviewParts(sub[`${key}Date`], zone),
      remarks: sub[`${key}Remarks`] || '',
    }])) as Record<RoundKey, RoundDraft>,
    outcome: sub.finalStatus, remarks: sub.remarks || '',
  };
}

function Remarks({ id, value, stage, templates, disabled, onChange }: {
  id: string; value: string; stage: string; templates: StageRemark[]; disabled: boolean; onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = value.trim() ? stageRemarkSuggestions(templates, stage).filter(item => item.remarkText.toLowerCase().includes(value.trim().toLowerCase()) && item.remarkText.trim().toLowerCase() !== value.trim().toLowerCase()).slice(0, 4) : [];
  return <div className="space-y-1.5">
    <Textarea id={id} aria-label={`${stage.toUpperCase()} remarks`} rows={2} maxLength={4000} value={value} disabled={disabled}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.relatedTarget?.closest('[data-remark-suggestions]')) setFocused(false); }} onChange={event => onChange(event.target.value)} className="text-xs" placeholder="Add remarks…" />
    {!disabled && focused && suggestions.length > 0 && <div data-remark-suggestions onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} aria-label={stage.toUpperCase() + ' remark suggestions'} className="rounded-md border border-border bg-popover p-1 shadow-sm">{suggestions.map(remark => <button key={remark.id} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(remark.remarkText); setFocused(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted">{remark.remarkText}</button>)}</div>}
  </div>;
}

export function UpdateSubmissionDialog({ submission, href, onClose, onSaved, onReview }: {
  submission: TrackerSubmission; href: string; onClose: () => void;
  onSaved: (submission: TrackerSubmission) => void; onReview: () => void;
}) {
  const [expanded, setExpanded] = useState<RoundKey | null>(null);
  const [editorInstance] = useState(() => crypto.randomUUID());
  const [nextRound, setNextRound] = useState<RoundKey | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);
  const requestId = useRef<string | null>(null);
  const { data, error: loadError, mutate, isValidating } = useSWR(['submission-editor', submission.id, submission.updatedAt, editorInstance], async () => {
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
  const canMaintain = Boolean(caps?.schedule || caps?.outcome || Object.values(caps?.results || {}).some(Boolean));
  const approved = current && current.finalStatus !== 'PENDING_APPROVAL';
  const internalRejected = current?.finalStatus === 'REJECTED' && current.rejectionFromStatus === 'PENDING_APPROVAL';
  const reopening = current && draft && closed(current.finalStatus) && draft.outcome === 'SUBMITTED' && caps?.outcome && !internalRejected;
  const active = Boolean(approved && !internalRejected && (!closed(current!.finalStatus) || reopening));
  const resetIndex = current && draft ? ROUNDS.findIndex(({ key }, index) => current[`${key}Status`] === 'CLEARED' && draft.rounds[key].status !== 'CLEARED' &&
    ROUNDS.slice(index + 1).some(({ key: next }) => ![null, 'PENDING'].includes(current[`${next}Status`]) || current[`${next}Date`] || current[`${next}Remarks`] || current[`${next}Interviewer`])) : -1;
  const affectedRounds = resetIndex < 0 ? [] : ROUNDS.slice(resetIndex + 1);
  const canFinish = Boolean(draft && draft.rounds.l1.status === 'CLEARED' && !ROUNDS.some(({ key }) => draft.rounds[key].status === 'REJECTED'));
  const needsBypass = Boolean(current && draft && ['SELECTED', 'OFFER', 'JOIN'].includes(draft.outcome) && (ROUNDS.some(({key}) => ['SCHEDULED', 'AWAITING_FEEDBACK'].includes(draft.rounds[key].status)) || (draft.outcome === 'OFFER' && current.finalStatus !== 'SELECTED' && current.finalStatus !== 'OFFER') || (draft.outcome === 'JOIN' && current.finalStatus !== 'OFFER' && current.finalStatus !== 'JOIN')));
  const newlyRejected = Boolean(current && draft && ROUNDS.some(({ key }) => draft.rounds[key].status === 'REJECTED' && current[`${key}Status`] !== 'REJECTED'));
  const invalidatesClearance = Boolean(current && draft && ROUNDS.some(({key}) => current[`${key}Status`] === 'CLEARED' && draft.rounds[key].status !== 'CLEARED'));
  const outcome = newlyRejected ? 'NOT_SELECTED' : draft && (!canFinish || invalidatesClearance) && ['SELECTED', 'OFFER', 'JOIN'].includes(draft.outcome) ? 'SUBMITTED' : draft?.outcome;
  const progression = ['SUBMITTED', 'SELECTED', 'OFFER', 'JOIN'];
  const needsCorrection = Boolean(current && draft && (outcome !== current.finalStatus && (closed(current.finalStatus) || progression.indexOf(outcome || '') < progression.indexOf(current.finalStatus) && progression.includes(outcome || '')) ||
    ROUNDS.some(({ key }) => JSON.stringify(draft.rounds[key]) !== JSON.stringify(initialDraft(current).rounds[key]) && ['CLEARED', 'REJECTED'].includes(current[`${key}Status`] || ''))));

  function editRound(key: RoundKey, field: keyof RoundDraft, value: string) {
    requestId.current = null; setConfirmReset(false); setError('');
    setDraft(previous => previous && ({ ...previous, rounds: { ...previous.rounds, [key]: { ...previous.rounds[key], [field]: value } } }));
  }
  function editField(field: 'outcome' | 'remarks', value: string) {
    requestId.current = null; setError(''); setDraft(previous => previous && ({ ...previous, [field]: value }));
  }
  async function save() {
    if (!current || !draft || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try {
      if (needsBypass && !draft.remarks.trim()) throw new Error('Add final remarks explaining the direct outcome or unfinished interview.');
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
        if (row.date !== original.date || row.time !== original.time) {
          payload[`${key}Date`] = row.date && row.time ? interviewInstant(row.date, row.time, validTimezone(current.timezone)) : null;
        }
      }
      if (needsBypass) payload.bypassReason = draft.remarks.trim();
      if (outcome !== current.finalStatus) payload.finalStatus = outcome as TrackerUpdate['finalStatus'];
      if (draft.remarks !== (current.remarks || '') || (!newlyRejected && outcome !== current.finalStatus && ['NOT_SELECTED', 'WITHDRAWN'].includes(outcome || ''))) payload.remarks = draft.remarks.trim() || null;
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
    <DialogContent className={`flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 ${showHistory ? 'sm:w-[calc(100vw-2rem)] sm:max-w-[1280px]' : 'sm:max-w-xl'}`} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}>
      <DialogHeader className="border-b border-border px-6 py-4 pr-12">{showHistory && <Button type="button" variant="link" className="mb-1 h-auto w-fit gap-2 p-0 text-xs" onClick={() => setShowHistory(false)}><ArrowLeft className="h-4 w-4" />Back to update</Button>}<DialogTitle>{showHistory ? 'Submission history' : current && !canMaintain ? 'Submission details' : 'Update submission'}</DialogTitle>
        <DialogDescription className="text-xs">{submission.candidateName || 'Candidate'} · {submission.jobTitle || submission.jobCode}</DialogDescription>
      </DialogHeader>
      {loadError ? <div role="alert" className="p-6 text-xs">Unable to load the latest submission.<Button variant="outline" className="ml-2 text-xs" onClick={() => void mutate()}>Retry</Button></div>
        : !current || !draft ? <p role="status" className="p-8 text-center text-xs"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading submission…</p>
        : showHistory ? <div className="min-h-0 overflow-y-auto px-6 py-5"><SubmissionHistory submission={current} /></div> : <form className="flex min-h-0 flex-col" onSubmit={event => { event.preventDefault(); void save(); }}>
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {!canMaintain && <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">Submission statuses are maintained by the Account Manager. Your access is read-only.</p>}
            {!approved && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">Internal approval is required before updating interviews.
              {caps?.review && <Button type="button" variant="outline" className="ml-3 text-xs" onClick={onReview}>Review submission</Button>}</div>}
            {internalRejected && <p className="text-xs text-muted-foreground">Internal review rejected this submission. Interview rounds are read-only.</p>}
            {closed(current.finalStatus) && !internalRejected && <p className="text-xs text-muted-foreground">To correct interview statuses, change Final outcome to In progress and provide a correction reason.</p>}
            <section aria-label="Interview rounds"><h2 className="mb-3 text-sm font-bold">Interview rounds</h2>
              {ROUNDS.map(({ key, label }, index) => {
                const resetting = affectedRounds.some(round => round.key === key);
                const unlocked = index === 0 || ROUNDS.slice(0, index).every(({ key: prior }) => draft.rounds[prior].status === 'CLEARED');
                if (!unlocked || resetting) return null;
                if (index > 0 && draft.rounds[key].status === 'PENDING' && nextRound !== key && !current[`${key}Date`]) return null;
                const editable = active && unlocked && !resetting && !saving && (!['CLEARED', 'REJECTED'].includes(current[`${key}Status`] || '') || Boolean(caps?.results[key]));
                const row = draft.rounds[key];
                const resultPermission = Boolean(caps?.results[key]);
                const statusEditable = editable && (resultPermission || Boolean(caps?.schedule));
                const detailsEditable = editable && (resultPermission || Boolean(caps?.schedule));
                const remarkEditable = editable && (resultPermission || (['SCHEDULED', 'CANCELLED'].includes(row.status) && Boolean(caps?.schedule)));
                const savedStatus = current[`${key}Status`];
                const hasSavedInterview = Boolean(current[`${key}Date`] && ['SCHEDULED', 'AWAITING_FEEDBACK', 'CLEARED', 'REJECTED'].includes(savedStatus || ''));
                if (row.status === 'CLEARED' && expanded !== key) return <div key={key} className="mb-2 flex items-center justify-between rounded-lg border border-border px-3 py-2"><span className="text-xs font-semibold">{label} <span className="ml-3 rounded bg-green-50 px-2 py-1 text-green-700 dark:bg-green-950 dark:text-green-300">Cleared</span></span><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={'Edit ' + label} onClick={() => setExpanded(key)}><Pencil className="h-3.5 w-3.5" /></Button></div>;
                return <div key={key} className="mb-2 space-y-3 rounded-lg border border-border p-3">
                  <span className="text-xs font-semibold">{label}</span><div className="grid gap-2 sm:grid-cols-2"><div className="space-y-1"><Label className="text-xs">Status</Label>
                    <select aria-label={`${label} status`} className={selectClass} disabled={!statusEditable} value={resetting ? 'PENDING' : row.status} onChange={event => editRound(key, 'status', event.target.value)}>
                      {Object.values(InterviewRoundStatus).map(status => <option key={status} value={status} disabled={status !== row.status &&
                        ((!resultPermission && !['SCHEDULED', 'CANCELLED', ...(['SCHEDULED', 'CANCELLED'].includes(savedStatus || '') ? ['PENDING'] : [])].includes(status)) || (['CLEARED', 'AWAITING_FEEDBACK'].includes(status) && !hasSavedInterview) ||
                          (['SELECTED', 'OFFER', 'JOIN'].includes(current.finalStatus) && status !== 'CLEARED' && !caps?.outcome))}>{ROUND_STATUS_LABELS[status]}</option>)}
                    </select>
                  </div>{row.status !== 'PENDING' && <div className="space-y-1"><Label className="text-xs">Date &amp; time</Label><Input aria-label={label + ' date and time'} type="datetime-local" className="h-9 text-xs" disabled={!detailsEditable || row.status === 'PENDING'} value={row.status === 'PENDING' || !row.date ? '' : row.date + 'T' + row.time} onChange={event => { const [date = '', time = ''] = event.target.value.split('T'); requestId.current = null; setDraft(previous => previous && ({...previous, rounds: {...previous.rounds, [key]: {...previous.rounds[key], date, time}}})); }} /></div>}</div><div><Label className="text-xs">Remarks</Label><Remarks id={`${key}-remarks`} stage={key} templates={data.templates} value={resetting ? '' : row.remarks} disabled={!remarkEditable} onChange={value => editRound(key, 'remarks', value)} /></div>
                </div>;
              })}
              {active && caps?.schedule && draft.outcome === 'SUBMITTED' && ROUNDS.map(({key,label},index) => index > 0 && ROUNDS.slice(0,index).every(round => draft.rounds[round.key].status === 'CLEARED') && draft.rounds[key].status === 'PENDING' && nextRound !== key && !current[`${key}Date`] && <Button key={key} type="button" variant="outline" className="h-8 text-xs" onClick={() => { setNextRound(key); editRound(key, 'status', 'SCHEDULED'); }}><Plus className="h-3 w-3" />Schedule {label} interview</Button>)}
            </section>
            <section className="space-y-3 border-t border-border pt-4" aria-label="Final outcome"><h2 className="text-sm font-bold">Final status</h2>
              <select aria-label="Final outcome" className={selectClass} value={outcome} disabled={saving || !approved || !caps?.outcome || internalRejected} onChange={event => editField('outcome', event.target.value)}>
                {!Object.values(SubmissionOutcome).includes(current.finalStatus as SubmissionOutcome) && <option value={current.finalStatus}>{current.finalStatus === 'REJECTED' ? 'Not selected (round rejected)' : 'Awaiting internal approval'}</option>}
                {Object.values(SubmissionOutcome).map(status => <option key={status} value={status} disabled={status !== outcome && ['SELECTED', 'OFFER', 'JOIN'].includes(status) && !canFinish}>{OUTCOME_LABELS[status]}</option>)}
              </select>
              {needsBypass && <p className="text-xs text-amber-700 dark:text-amber-300">Add remarks explaining the direct outcome or unfinished interview.</p>}
              <Remarks id="final-remarks" stage="final" templates={data.templates} value={draft.remarks} disabled={saving || !approved || !(caps?.outcome || caps?.notes) || Boolean(internalRejected)} onChange={value => editField('remarks', value)} />
            </section>
            {(needsCorrection || affectedRounds.length > 0) && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <Label htmlFor="correction-reason" className="text-xs">Correction reason (required)</Label><Textarea id="correction-reason" required maxLength={4000} rows={2} className="text-xs" value={correctionReason} disabled={saving} onChange={event => { requestId.current = null; setCorrectionReason(event.target.value); }} />
              {affectedRounds.length > 0 && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmReset} disabled={saving} onChange={event => { requestId.current = null; setConfirmReset(event.target.checked); }} className="mt-0.5" /><span>Reset {affectedRounds.map(round => round.label).join(' and ')} to Pending and clear their current appointments and feedback. Their original values will remain in history.</span></label>}
            </section>}
            {data.templatesUnavailable && <p role="status" className="text-xs text-muted-foreground">Remark suggestions are unavailable. You can enter remarks manually.</p>}
            <div className="flex flex-wrap items-center gap-4 text-xs"><Button type="button" variant="link" className="h-auto p-0 text-xs" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Hide change history' : 'View change history'}</Button><Link href={href} onClick={onClose} className="text-[#1a4fa0] hover:underline dark:text-blue-300">View submission</Link></div>

            {error && <div role="alert" className="text-xs text-red-700 dark:text-red-300">{error}<Button type="button" variant="link" disabled={saving || isValidating} className="ml-2 h-auto p-0 text-xs" onClick={() => void mutate()}>Reload latest values</Button></div>}
          </div>
          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4"><Button type="button" variant="outline" disabled={saving} onClick={onClose} className="text-xs">{canMaintain ? 'Cancel' : 'Close'}</Button>{canMaintain && <Button type="submit" disabled={saving || isValidating || !approved || Boolean(internalRejected) || !(caps?.outcome || caps?.schedule || caps?.notes || Object.values(caps?.results || {}).some(Boolean))} className="bg-[#1a4fa0] text-xs text-white hover:bg-[#154181]">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save changes</Button>}</DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>;
}
