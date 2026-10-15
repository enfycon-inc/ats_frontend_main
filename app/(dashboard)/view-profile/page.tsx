"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Camera, Building2, MapPin, Mail, Save, UserRound, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmailIntegrationTab } from '@/components/profile/email-integration-tab';
import { EmailSignatureTab } from '@/components/profile/email-signature-tab';
import { UserAvatar } from '@/components/shared/user-identity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { useStaffProfile } from '@/hooks/use-staff-profile';
import { atsApi } from '@/lib/ats-api';

const tabs = [
  { id: 'personal_contacts', label: 'Profile', icon: UserRound },
  { id: 'email_integration', label: 'Email connections', icon: Mail },
  { id: 'email_signature', label: 'Email signatures', icon: Save },
];

export default function ViewProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : 'personal_contacts';
  const { data: profile, error, loading, mutate } = useStaffProfile();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const initialized = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || initialized.current === profile.id) return;
    initialized.current = profile.id;
    setFullName(profile.fullName || ''); setPhone(profile.phone || ''); setDesignation(profile.designation || '');
  }, [profile]);

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const saved = await atsApi.profile.saveDetails({ fullName, phone, designation });
      await mutate(saved, false);
      setFullName(saved.fullName); setPhone(saved.phone || ''); setDesignation(saved.designation || '');
      toast.success('Profile saved.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Your profile could not be saved.'); }
    finally { setSaving(false); }
  }
  async function uploadPhoto(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error('Choose a JPG, PNG, or WebP photo up to 5 MB.');
      if (photoInput.current) photoInput.current.value = ''; return;
    }
    setPhotoBusy(true);
    try { await mutate(await atsApi.profile.uploadPhoto(file), false); toast.success('Profile photo updated.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Your photo could not be uploaded.'); }
    finally { setPhotoBusy(false); if (photoInput.current) photoInput.current.value = ''; }
  }
  async function removePhoto() {
    setPhotoBusy(true);
    try { await mutate(await atsApi.profile.removePhoto(), false); toast.success('Profile photo removed.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Your photo could not be removed.'); }
    finally { setPhotoBusy(false); }
  }

  if (loading && !profile) return <div className="p-6 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading your profile…</div>;
  if (!profile) return <div className="p-6 space-y-3"><p className="text-sm">{error?.message || 'Your profile could not be loaded.'}</p><Button variant="outline" onClick={() => mutate()}>Try again</Button></div>;
  const roleNames = [...new Set((profile.assignedRoles || []).map(role => role.name).filter(Boolean))];
  return <div className="w-full bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-5">
    <section aria-label="Your profile" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <UserAvatar user={profile} className="h-24 w-24 [&_[data-slot=avatar-fallback]]:text-2xl" />
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload profile photo" onChange={event => uploadPhoto(event.target.files?.[0])} />
          <div className="flex gap-2"><Button variant="outline" size="sm" className="h-8 text-xs" disabled={photoBusy} onClick={() => photoInput.current?.click()}><Camera className="h-3.5 w-3.5 mr-1" />{photoBusy ? 'Updating…' : 'Upload photo'}</Button>{(profile.avatar || profile.profilePicture) && <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={photoBusy} onClick={removePhoto}>Remove</Button>}</div>
          <p className="text-[10px] text-slate-500">JPG, PNG or WebP · up to 5 MB</p>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{profile.fullName}</h1>
          <p className="text-xs text-slate-500 break-all">{profile.email}</p>
          <div aria-label="Assigned roles" className="flex flex-wrap gap-1.5">{roleNames.length ? roleNames.map(name => <span key={name} className="text-[10.5px] font-semibold rounded-md px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{name}</span>) : <span className="text-xs text-slate-500">No assigned roles</span>}</div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">{profile.branchName && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.branchName}</span>}{profile.businessUnitName && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{profile.businessUnitName}</span>}{profile.podName && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{profile.podName}</span>}{profile.tenant?.name && <span>{profile.tenant.name}</span>}</div>
        </div>
      </div>
    </section>
    <nav aria-label="Profile sections" className="flex gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => router.replace(`/view-profile?tab=${id}`)} className={`shrink-0 flex items-center gap-1.5 px-2 py-3 text-xs border-b-2 font-semibold ${activeTab === id ? 'text-blue-700 border-blue-700 dark:text-blue-400' : 'text-slate-500 border-transparent hover:text-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</nav>
    {activeTab === 'personal_contacts' && <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <form onSubmit={saveDetails} className="max-w-3xl space-y-5">
        <div><h2 className="text-sm font-bold">Personal details</h2><p className="text-xs text-slate-500 mt-1">Keep your contact information up to date.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><label htmlFor="profile-name" className="text-xs font-semibold">Display name <span aria-hidden className="text-red-600">*</span></label><Input id="profile-name" required maxLength={255} value={fullName} onChange={e => setFullName(e.target.value)} className="h-9 text-xs" autoComplete="name" /></div>
          <div className="space-y-1.5"><label htmlFor="profile-designation" className="text-xs font-semibold">Designation <span className="text-slate-400 font-normal">(optional)</span></label><Input id="profile-designation" maxLength={255} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Enter your job title" className="h-9 text-xs" autoComplete="organization-title" /></div>
          <div className="space-y-1.5"><label htmlFor="profile-phone" className="text-xs font-semibold">Phone <span className="text-slate-400 font-normal">(optional)</span></label><PhoneInput id="profile-phone" value={phone} onChange={value => setPhone(value || '')} market={profile.defaultMarket} placeholder="Enter your phone number" /></div>
          <div className="space-y-1.5"><label htmlFor="profile-email" className="text-xs font-semibold">Work email</label><Input id="profile-email" readOnly value={profile.email} className="h-9 text-xs bg-slate-50 dark:bg-slate-950" /><p className="text-[11px] text-slate-500">Contact your administrator to change your sign-in email.</p></div>
        </div>
        <Button type="submit" disabled={saving || !fullName.trim()} className="h-9 text-xs bg-[#1a4fa0] hover:bg-blue-800 text-white"><Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save changes'}</Button>
      </form>
    </section>}
    {activeTab === 'email_integration' && <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"><EmailIntegrationTab /></section>}
    <div hidden={activeTab !== 'email_signature'}><EmailSignatureTab profile={profile} /></div>
  </div>;
}
