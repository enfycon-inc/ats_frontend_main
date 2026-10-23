"use client";

import { PhoneInput } from '@/components/ui/phone-input';
import { POC_DESIGNATIONS, type ClientContactInput } from '@/lib/client-creation-contract';

const control = 'h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900';
interface Props {
  id: string;
  value: ClientContactInput;
  onChange: (value: ClientContactInput) => void;
  market: 'INDIA' | 'US';
  errors: Record<string, string>;
  disabled?: boolean;
}

export function ClientPocFields({ id, value, onChange, market, errors, disabled }: Props) {
  const set = (key: keyof ClientContactInput, text: string) => onChange({ ...value, [key]: text });
  const field = (key: 'firstName' | 'lastName' | 'email' | 'otherDesignation', label: string, required = false) => <div className="space-y-1">
    <label htmlFor={`${id}-contact-${key}`} className="text-xs font-semibold">{label}{required ? ' *' : ''}</label>
    <input id={`${id}-contact-${key}`} className={control} type={key === 'email' ? 'email' : 'text'} required={required} maxLength={255}
      autoComplete={key === 'firstName' ? 'given-name' : key === 'lastName' ? 'family-name' : key === 'email' ? 'email' : 'organization-title'}
      value={value[key] || ''} onChange={e => set(key, e.target.value)} disabled={disabled}
      aria-invalid={!!errors[`contact.${key}`]} aria-describedby={errors[`contact.${key}`] ? `${id}-error-${key}` : undefined} />
    {errors[`contact.${key}`] && <p id={`${id}-error-${key}`} className="text-xs text-red-600">{errors[`contact.${key}`]}</p>}
  </div>;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {field('firstName', 'First name', true)}{field('lastName', 'Last name')}
    <div className="space-y-1"><label htmlFor={`${id}-contact-designation`} className="text-xs font-semibold">Designation</label>
      <select id={`${id}-contact-designation`} className={control} value={value.designation || ''} disabled={disabled} onChange={e => onChange({ ...value, designation: e.target.value, otherDesignation: '' })}>
        <option value="">Select designation</option>{POC_DESIGNATIONS.map(title => <option key={title}>{title}</option>)}
      </select>
    </div>
    {field('email', 'Work email', true)}
    {value.designation === 'Other' && field('otherDesignation', 'Specify designation', true)}
    <div className="space-y-1 sm:col-span-2"><label htmlFor={`${id}-contact-phone`} className="text-xs font-semibold">Mobile number</label>
      <PhoneInput id={`${id}-contact-phone`} name="contactPhone" value={value.phone || ''} onChange={phone => set('phone', phone || '')}
        defaultCountry={market === 'INDIA' ? 'IN' : 'US'} market={market} disabled={disabled} />
      <p className="text-xs text-neutral-500">Choose the contact’s country. Country code is included automatically.</p>
      {errors['contact.phone'] && <p role="alert" className="text-xs text-red-600">{errors['contact.phone']}</p>}
    </div>
  </div>;
}
