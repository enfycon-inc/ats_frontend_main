"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { atsApi } from '@/lib/ats-api';
import type { EmailSignature, StaffProfile } from '@/lib/profile-contract';
import 'react-quill-new/dist/quill.snow.css';

const Quill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <p className="p-4 text-xs text-slate-500">Loading editor…</p> });
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
function professionalTemplate(profile: StaffProfile) {
  const lines = [profile.designation, profile.tenant?.name, profile.phone, profile.email].filter((value): value is string => !!value);
  return `<p><strong>${escape(profile.fullName)}</strong></p>${lines.map(value => `<p>${escape(value)}</p>`).join('')}`;
}

export function EmailSignatureTab({ profile }: { profile: StaffProfile }) {
  const { data, error, isLoading, mutate } = useSWR(['staff-signatures', profile.tenantId, profile.id], atsApi.profile.signatures);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailSignature | null>(null);
  const [baseline, setBaseline] = useState<EmailSignature | null>(null);
  const [newDefault, setNewDefault] = useState('');
  const [replyDefault, setReplyDefault] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const previewSequence = useRef(0);
  const dirty = !!draft && (!baseline || draft.name !== baseline.name || draft.html !== baseline.html);

  useEffect(() => {
    if (!data) return;
    setNewDefault(data.newMessageSignatureId || '');
    setReplyDefault(data.replySignatureId || '');
  }, [data]);
  useEffect(() => {
    if (selected === null && !draft && data?.signatures.length) {
      const first = data.signatures.find(signature => signature.id === data.newMessageSignatureId) || data.signatures[0];
      setSelected(first.id); setDraft(first); setBaseline(first);
    }
  }, [data, selected, draft]);
  useEffect(() => {
    const html = draft?.html || '';
    const sequence = ++previewSequence.current;
    setPreviewError(false);
    if (!html) { setPreview(''); return; }
    const timer = window.setTimeout(() => {
      atsApi.profile.previewSignature(html).then(result => {
        if (sequence === previewSequence.current) { setPreview(result.html); setPreviewError(false); }
      }).catch(() => { if (sequence === previewSequence.current) { setPreview(''); setPreviewError(true); } });
    }, 500);
    return () => { window.clearTimeout(timer); previewSequence.current++; };
  }, [draft?.html]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [[{ font: [false, 'serif'] }, { size: ['small', false, 'large'] }], ['bold', 'italic', 'underline'], [{ color: [] }, { align: [] }], ['link', 'image'], ['clean']],
      handlers: { image: () => { setImageUrl(''); setImageAlt(''); setImageDialog(true); } },
    },
  }), []);
  const canDiscard = () => !dirty || window.confirm('Discard unsaved signature changes?');
  function choose(signature: EmailSignature) {
    if (!canDiscard()) return;
    setSelected(signature.id); setDraft(signature); setBaseline(signature); setImageDialog(false);
  }
  function create() {
    if (!canDiscard()) return;
    if ((data?.signatures.length || 0) >= 20) { toast.error('You can save up to 20 signatures.'); return; }
    const names = new Set(data?.signatures.map(signature => signature.name));
    let name = 'Professional'; let suffix = 2;
    while (names.has(name)) name = `Professional ${suffix++}`;
    setSelected(null); setBaseline(null);
    setDraft({ id: crypto.randomUUID(), name, html: professionalTemplate(profile) }); setImageDialog(false);
  }
  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const result = await atsApi.profile.saveSignature(draft);
      const saved = result.signatures.find(signature => signature.id === draft.id)!;
      setSelected(saved.id); setDraft(saved); setBaseline(saved);
      await mutate(result, false); toast.success('Signature saved.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Your signature could not be saved.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!draft || !window.confirm(`Delete the signature “${draft.name}”?`)) return;
    if (!baseline) { setDraft(null); setSelected(null); return; }
    setSaving(true);
    try {
      const result = await atsApi.profile.deleteSignature(draft.id);
      await mutate(result, false);
      setDraft(null); setBaseline(null); setSelected(null); toast.success('Signature deleted.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Your signature could not be deleted.'); }
    finally { setSaving(false); }
  }
  async function saveDefaults() {
    setSaving(true);
    try {
      const result = await atsApi.profile.saveSignatureDefaults({ newMessageSignatureId: newDefault || null, replySignatureId: replyDefault || null });
      await mutate(result, false); toast.success('Signature defaults saved.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Your defaults could not be saved.'); }
    finally { setSaving(false); }
  }
  function insertImage() {
    try {
      const url = new URL(imageUrl);
      if (url.protocol !== 'https:') throw new Error('HTTPS required');
      if (draft) setDraft({ ...draft, html: draft.html + `<p><img src="${escape(url.href)}" alt="${escape(imageAlt)}" width="160"></p>` });
      setImageDialog(false);
    } catch { toast.error('Enter a valid HTTPS image URL.'); }
  }

  if (isLoading) return <p className="text-xs text-slate-500 p-5">Loading your signatures…</p>;
  if (error || !data) return <div className="p-5 space-y-3 text-xs"><p>Signatures could not be loaded.</p><Button variant="outline" onClick={() => mutate()}>Try again</Button></div>;
  const selectClass = 'h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs';
  const previewDocument = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{font-family:Arial,sans-serif;font-size:12px;color:#334155;padding:16px;line-height:1.5}p{margin:0 0 4px}img{max-width:100%;height:auto}a{color:#1a4fa0}</style></head><body><p>Hi,</p><p>This is how your signature will appear in an email.</p><br>${preview}</body></html>`;
  return <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
    <div><h2 className="text-sm font-bold">Email signatures</h2><p className="text-xs text-slate-500 mt-1">Create signatures for emails you send from ATS. These settings are saved in ATS.</p></div>
    <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_minmax(250px,0.7fr)] gap-4">
      <aside aria-label="Saved signatures" className="space-y-3"><h3 className="text-xs font-semibold">Your signatures</h3><div className="space-y-1">{data.signatures.map(signature => <button type="button" disabled={saving} key={signature.id} onClick={() => choose(signature)} className={`w-full text-left px-3 py-2 rounded-md text-xs truncate ${selected === signature.id ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700 dark:bg-blue-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{signature.name}</button>)}{!data.signatures.length && <p className="text-xs text-slate-500">No saved signatures yet.</p>}</div><Button type="button" variant="outline" size="sm" disabled={saving} onClick={create} className="h-8 text-xs"><Plus className="h-3.5 w-3.5 mr-1" />New signature</Button></aside>
      <div className="min-w-0 space-y-3">{draft ? <>
        <label htmlFor="signature-name" className="text-xs font-semibold">Signature name</label><Input id="signature-name" value={draft.name} maxLength={80} disabled={saving} onChange={event => setDraft({ ...draft, name: event.target.value })} className="h-9 text-xs" />
        <div className="signature-editor"><Quill key={draft.id} value={draft.html} onChange={html => setDraft(previous => previous ? { ...previous, html } : previous)} modules={modules} formats={['font', 'size', 'bold', 'italic', 'underline', 'color', 'align', 'link', 'image']} readOnly={saving} theme="snow" /></div>
        {imageDialog && <div className="space-y-2 rounded-lg border border-slate-200 p-3"><label htmlFor="signature-image-url" className="text-xs font-semibold">Image URL (HTTPS)</label><Input id="signature-image-url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://your-company.com/logo.png" className="h-9 text-xs" /><label htmlFor="signature-image-alt" className="text-xs font-semibold">Image description</label><Input id="signature-image-alt" value={imageAlt} onChange={event => setImageAlt(event.target.value)} placeholder="Company logo" className="h-9 text-xs" /><div className="flex gap-2"><Button size="sm" type="button" onClick={insertImage} className="h-8 text-xs">Insert image</Button><Button size="sm" variant="ghost" type="button" onClick={() => setImageDialog(false)} className="h-8 text-xs">Cancel</Button></div></div>}
        <div className="flex items-center justify-between gap-2"><Button variant="ghost" size="sm" disabled={saving} onClick={remove} className="h-8 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button><div className="flex items-center gap-2">{dirty && <span className="text-[11px] text-amber-700">Unsaved changes</span>}<Button disabled={saving || !draft.name.trim()} onClick={save} className="h-8 text-xs bg-[#1a4fa0] hover:bg-blue-800"><Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving…' : 'Save signature'}</Button></div></div>
      </> : <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Create a signature to add your name, contact details, links, and company logo.</div>}</div>
      <div className="space-y-2 min-w-0"><h3 className="text-xs font-semibold">Email preview</h3>{previewError ? <p className="text-xs text-amber-700">Preview unavailable. Check the signature size or try again.</p> : <iframe title="Email signature preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewDocument} className="h-[320px] w-full rounded-lg border border-slate-200 bg-white" />}</div>
    </div>
    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3 max-w-3xl"><h3 className="text-xs font-semibold">Signature defaults</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><label htmlFor="signature-new-default" className="text-xs font-semibold">New messages</label><select id="signature-new-default" className={selectClass} value={newDefault} disabled={saving} onChange={event => setNewDefault(event.target.value)}><option value="">None</option>{data.signatures.map(signature => <option key={signature.id} value={signature.id}>{signature.name}</option>)}</select></div>
      <div className="space-y-1.5"><label htmlFor="signature-reply-default" className="text-xs font-semibold">Replies and forwards</label><select id="signature-reply-default" className={selectClass} value={replyDefault} disabled={saving} onChange={event => setReplyDefault(event.target.value)}><option value="">None</option>{data.signatures.map(signature => <option key={signature.id} value={signature.id}>{signature.name}</option>)}</select></div>
    </div><p className="text-[11px] text-slate-500">New-message defaults apply to emails sent from this workspace. Reply and forward preferences are saved for when a reply composer is available.</p><Button disabled={saving || (newDefault === (data.newMessageSignatureId || '') && replyDefault === (data.replySignatureId || ''))} onClick={saveDefaults} className="h-8 text-xs bg-[#1a4fa0] hover:bg-blue-800">Save defaults</Button></div>
    <style jsx global>{`.signature-editor .ql-toolbar.ql-snow{border-color:#e2e8f0;border-radius:8px 8px 0 0}.signature-editor .ql-container.ql-snow{border-color:#e2e8f0;border-radius:0 0 8px 8px;font-size:12px;font-family:Arial,sans-serif}.signature-editor .ql-editor{min-height:220px}.signature-editor .ql-editor img{max-width:100%;max-height:180px}.dark .signature-editor .ql-container,.dark .signature-editor .ql-toolbar{border-color:#334155}.dark .signature-editor .ql-stroke{stroke:#94a3b8}.dark .signature-editor .ql-picker{color:#94a3b8}`}</style>
  </section>;
}
