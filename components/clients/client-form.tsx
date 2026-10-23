"use client";

import React, { useId, useRef, useState } from 'react';
import useSWR from 'swr';
import { Country, State, City } from 'country-state-city';
import { LockKeyhole, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi, activeRoleHeaders } from '@/lib/ats-api';
import { CLIENT_CATEGORIES, clientCreationErrors, type ClientCreationRequest, type ClientContactInput, type CreatedClient } from '@/lib/client-creation-contract';
import { ClientPocFields } from '@/components/clients/client-poc-fields';
import { Button } from '@/components/ui/button';

interface Props {
  initialClientName?: string;
  expectedMarket?: 'INDIA' | 'US';
  onSaved: (client: CreatedClient) => void | Promise<void>;
  onCancel: () => void;
}
const control = 'h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900';

export function ClientForm({ initialClientName = '', expectedMarket, onSaved, onCancel }: Props) {
  const id = useId();
  const scope = typeof window === 'undefined' ? '' : JSON.stringify([atsApi.auth.getCurrentUser()?.id, activeRoleHeaders(), ...['active_branch_id', 'tenant_id'].map(key => localStorage.getItem(key) || '')]);
  const { data: context, error, isLoading, mutate } = useSWR(['client-creation-context', scope], () => atsApi.clients.creationContext(), { revalidateOnFocus: true });
  const [draft, setDraft] = useState<Partial<ClientCreationRequest>>({ client_name: initialClientName, payment_terms: 'Net 30' });
  const [country, setCountry] = useState<string | null>(null);
  const [stateIso, setStateIso] = useState('');
  const [addContact, setAddContact] = useState(false);
  const [contact, setContact] = useState<ClientContactInput>({ firstName: '', lastName: '', designation: '', otherDesignation: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [existingClient, setExistingClient] = useState<CreatedClient | null>(null);
  const { data: directory } = useSWR<CreatedClient[]>(context && (draft.client_name?.trim().length || 0) >= 2 ? ['client-options', scope] : null,
    () => atsApi.clients.list(), { revalidateOnFocus: false });
  const matches = (directory || []).filter(client => client.client_name?.toLowerCase().includes(draft.client_name?.trim().toLowerCase() || '')).slice(0, 5);
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  // Keep the successful response if updating the parent fails: retries cannot create a second account.
  const savedClient = useRef<CreatedClient | null>(null);
  const countryIso = country ?? (context?.market === 'INDIA' ? 'IN' : context?.market === 'US' ? 'US' : '');
  const mismatch = !!context && !!expectedMarket && context.market !== expectedMarket;
  const set = (key: keyof ClientCreationRequest, value: unknown) => setDraft(prev => ({ ...prev, [key]: value }));
  const field = (key: keyof ClientCreationRequest, label: string, type = 'text', placeholder = '') => (
    <div className="space-y-1">
      <label htmlFor={`${id}-${key}`} className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{label}</label>
      <input id={`${id}-${key}`} className={control} type={type} placeholder={placeholder} value={String(draft[key] ?? '')}
        min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100 : undefined} step={type === 'number' ? '0.01' : undefined}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
        onChange={event => set(key, type === 'number' ? (event.target.value === '' ? undefined : Number(event.target.value)) : event.target.value)} />
      {errors[key] && <p id={`${id}-${key}-error`} className="text-xs text-red-600">{errors[key]}</p>}
    </div>
  );
  const select = (key: keyof ClientCreationRequest, label: string, options: readonly string[]) => (
    <div className="space-y-1"><label htmlFor={`${id}-${key}`} className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{label}</label>
      <select id={`${id}-${key}`} className={control} value={String(draft[key] || '')} onChange={e => set(key, e.target.value)} aria-invalid={!!errors[key]}>
        <option value="">Select {label.replace(' *', '').toLowerCase()}</option>{options.map(option => <option key={option}>{option}</option>)}
      </select>{errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>}</div>
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !context || mismatch) return;
    busy.current = true;
    setSaving(true);
    try {
      if (savedClient.current) { await onSaved(savedClient.current); return; }
      const current = await mutate();
      if (!current || current.branchId !== context.branchId || current.businessUnitId !== context.businessUnitId || current.market !== context.market || current.ownerId !== context.ownerId || current.currency !== context.currency) {
        throw new Error('Your staffing context changed. Review the form and submit again.');
      }
      if (existingClient) {
        const validation = clientCreationErrors({ client_name: existingClient.client_name, category: CLIENT_CATEGORIES[0], contact: addContact ? contact : undefined });
        setErrors(validation);
        if (Object.keys(validation).length) return;
        if (addContact) await atsApi.clients.createContact(existingClient.id, { ...contact, isPrimary: false });
        savedClient.current = existingClient;
        toast.success(addContact ? 'Contact added to the existing client.' : 'Existing client selected.');
        await onSaved(existingClient);
        return;
      }
      requestId.current ||= crypto.randomUUID();
      const payload = { ...draft, request_id: requestId.current, client_name: draft.client_name?.trim() || '',
        branch_id: current.branchId, business_unit_id: current.businessUnitId, market: current.market, currency: current.currency,
        country: countryIso, state: stateIso ? State.getStateByCodeAndCountry(stateIso, countryIso)?.name : '',
        gstin: draft.gstin?.trim().toUpperCase(), pan_number: draft.pan_number?.trim().toUpperCase(),
        email_id: draft.email_id?.trim(), contact: addContact ? contact : undefined,
      } as ClientCreationRequest;
      const validation = clientCreationErrors(payload);
      setErrors(validation);
      if (Object.keys(validation).length) return;
      const saved = await atsApi.clients.create(payload);
      savedClient.current = saved;
      toast.success(saved.approval_status === 'PENDING_APPROVAL' ? 'Client submitted for approval.' : 'Client added.');
      await onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save the client.');
    } finally { busy.current = false; setSaving(false); }
  }

  if (isLoading) return <p className="flex items-center gap-2 text-xs" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading staffing context…</p>;
  if (error || !context || mismatch) return <div className="space-y-3" role="alert"><p className="text-xs text-red-600">{mismatch ? 'This job market does not match your staffing unit. Select the correct staffing context.' : error?.message || 'Staffing context is unavailable.'}</p><Button variant="outline" onClick={() => void mutate()}>Retry</Button><Button variant="ghost" onClick={onCancel}>Cancel</Button></div>;

  return <form onSubmit={submit} className="space-y-5 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-slate-800">
      <p className="text-neutral-500">Branch: {context.branchName}{context.businessUnitName ? ` · Unit: ${context.businessUnitName}` : ''}</p>
      <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 font-semibold dark:bg-slate-800"><LockKeyhole className="h-3 w-3" />{context.market === 'INDIA' ? 'India Domestic Market (₹)' : 'US IT Staffing Market ($)'}</span>
    </div>
    <fieldset disabled={saving} className="space-y-5">
      {existingClient && <div className="rounded-lg bg-neutral-100 p-3 dark:bg-slate-800"><p>Using existing client: <strong>{existingClient.client_name}</strong></p><Button type="button" variant="ghost" onClick={() => setExistingClient(null)}>Create a new client instead</Button></div>}
      <fieldset disabled={!!existingClient}>
      <section className="space-y-3"><h3 className="text-sm font-bold">Client details</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('client_name', 'Legal company name *')}{select('category', 'Client category *', CLIENT_CATEGORIES)}
        {field('client_short_name', 'Display name (optional)')}{field('email_id', 'Company email', 'email')}
        {field('website', 'Website', 'url', 'https://company.com')}{select('industry', 'Industry', ['Information Technology', 'Banking & Financial Services', 'Healthcare & Pharma', 'Manufacturing', 'Telecommunications', 'Retail & eCommerce', 'Other'])}
        <div className="space-y-1"><label htmlFor={`${id}-country`} className="font-semibold">Country</label><select id={`${id}-country`} className={control} value={countryIso} onChange={e => { setCountry(e.target.value); setStateIso(''); set('city', ''); }}><option value="">Select country</option>{Country.getAllCountries().map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor={`${id}-state`} className="font-semibold">State / Province</label><select id={`${id}-state`} className={control} value={stateIso} disabled={!countryIso} onChange={e => { setStateIso(e.target.value); set('city', ''); }}><option value="">Select state</option>{State.getStatesOfCountry(countryIso).map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor={`${id}-city`} className="font-semibold">City</label><select id={`${id}-city`} className={control} value={draft.city || ''} disabled={!stateIso} onChange={e => set('city', e.target.value)}><option value="">Select city</option>{City.getCitiesOfState(countryIso, stateIso).map((c, i) => <option key={`${c.name}-${i}`}>{c.name}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor={`${id}-owner`} className="font-semibold">Account owner</label><input id={`${id}-owner`} className={control} readOnly value={context.ownerName} /></div>
      </div><p className="text-neutral-500">{context.canDirectAdd ? 'Your permissions allow direct client creation.' : 'This client will require approval before use.'} Market and currency are set by your staffing context.</p></section>
      </fieldset>
      {!existingClient && matches.length > 0 && <div className="space-y-1 rounded-lg border border-neutral-200 p-3 dark:border-slate-800"><p className="font-semibold">Matching clients — reuse an account or add another contact</p>{matches.map(client => <Button key={client.id} type="button" variant="ghost" className="block text-xs" onClick={() => { setExistingClient(client); setAddContact(true); setErrors({}); }}>{client.client_name}</Button>)}</div>}
      {!existingClient && <details open={!!(errors.gstin || errors.pan_number || errors.commission_percentage) || undefined} className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-slate-800"><summary className="cursor-pointer text-sm font-bold">Billing & commercial terms (optional)</summary><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('address', 'Billing address')}{field('postal_code', 'Postal code')}
        {select('payment_terms', 'Payment terms', ['Net 30', 'Net 45', 'Net 60', 'Paid When Paid', 'Immediate'])}
        {field('commission_percentage', 'Placement commission (%)', 'number')}
        {context.market === 'INDIA' ? <>{field('gstin', 'GSTIN')}{field('pan_number', 'PAN number')}</> : field('federal_id', 'Federal EIN / Tax ID')}
      </div><p className="text-neutral-500">Commission is the agreed placement fee as a percentage of compensation.</p>
        <div className="flex flex-wrap gap-4">{(['msa_signed', 'sow_executed', 'coi_received', 'vendor_portal_created'] as const).map((key, i) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={!!draft[key]} onChange={e => set(key, e.target.checked)} />{['MSA signed', 'SOW executed', 'COI received', 'Vendor portal created'][i]}</label>)}</div>
      </details>}
      <section className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-slate-800">
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={addContact} onChange={e => setAddContact(e.target.checked)} />Add primary point of contact (optional)</label>
        {addContact && <ClientPocFields id={id} value={contact} onChange={setContact} market={context.market} errors={errors} disabled={saving} />}
        {errors.contact && <p role="alert" className="text-red-600">{errors.contact}</p>}
      </section>
      {!existingClient && <details className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-slate-800"><summary className="cursor-pointer text-sm font-bold">Advanced qualification (optional)</summary><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {select('tier_rating', 'Client tier', ['TIER_1', 'TIER_2', 'TIER_3'])}{select('credit_check_status', 'Credit check', ['PENDING_CHECK', 'APPROVED', 'HIGH_RISK'])}{select('fillability_score', 'Fillability', ['HIGH', 'MEDIUM', 'LOW'])}
      </div>{field('vetting_notes', 'Internal qualification notes')}</details>}
      {!existingClient && <div className="space-y-1"><label htmlFor={`${id}-about`} className="font-semibold">About company</label><textarea id={`${id}-about`} rows={3} className={`${control} h-auto py-2`} value={draft.about_company || ''} onChange={e => set('about_company', e.target.value)} /></div>}
      {Object.entries(errors).filter(([key]) => !key.startsWith('contact.') && !['client_name', 'category', 'email_id', 'website', 'commission_percentage', 'gstin', 'pan_number', 'contact'].includes(key)).map(([key, message]) => <p role="alert" key={key} className="text-red-600">{message}</p>)}
    </fieldset>
    <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-slate-800"><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving} className="bg-indigo-600 text-xs text-white hover:bg-indigo-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{existingClient ? addContact ? 'Add contact' : 'Use existing client' : context.canDirectAdd ? 'Add Client' : 'Submit for approval'}</Button></div>
  </form>;
}
