"use client";
import { useEffect, useState } from 'react';
import DashboardBreadcrumb from '@/components/layout/dashboard-breadcrumb';
import { useNotifications } from '@/contexts/NotificationContext';
import { EMAIL_OPTIONS, type NotificationPreferences } from '@/lib/notification-preferences';
import { SOUND_OPTIONS, playPresetSound } from '@/lib/audio-synthesizer';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function NotificationSettingsPage() {
  const { settings, settingsLoading, settingsError, updateSettings } = useNotifications();
  const [draft, setDraft] = useState<NotificationPreferences>(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!dirty) setDraft(settings); }, [settings, dirty]);
  const change = (input: Partial<NotificationPreferences>) => { setDraft(value => ({ ...value, ...input })); setDirty(true); };
  const save = async () => {
    setSaving(true);
    try {
      const emailPreferences = Object.fromEntries(settings.eligibleEmails.map(key => [key, draft.emailPreferences[key] !== false]));
      await updateSettings({ soundEnabled: draft.soundEnabled, soundPreset: draft.soundPreset, toastEnabled: draft.toastEnabled,
        ...Object.fromEntries(settings.eligibleActivities.map(key => [key, draft[key]])), emailPreferences });
      setDirty(false); toast.success('Notification preferences saved.');
    } catch { toast.error('Could not save preferences. Your changes have not been saved.'); }
    finally { setSaving(false); }
  };
  const row = (label: string, checked: boolean, onChange: (value: boolean) => void) => <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 last:border-0 dark:border-slate-800"><span className="text-xs font-medium">{label}</span><Switch aria-label={label} checked={checked} onCheckedChange={onChange} disabled={saving} /></div>;
  if (settingsError) return <p role="alert" className="p-4 text-xs">Could not load notification preferences. Refresh to retry.</p>;
  if (settingsLoading) return <p role="status" className="p-4 text-xs">Loading your notification preferences...</p>;
  return <div className="space-y-4 pb-8">
    <DashboardBreadcrumb title="Notification Preferences" text="Settings" />
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-xl font-bold">Notification Preferences</h1><p className="text-xs text-neutral-500">Personal settings for emails, notification sounds and in-app popups.</p></div><Button className="h-9 bg-[#1a4fa0] text-xs" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving...' : 'Save Preferences'}</Button></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5 dark:bg-slate-900"><h2 className="text-sm font-bold">System email notifications</h2><p className="mt-1 text-xs text-neutral-500">Only options available to your current permissions are shown. Turning an option on does not grant access.</p>
        {EMAIL_OPTIONS.filter(option => settings.eligibleEmails.includes(option.key)).map(option => <div key={option.key}>{row(option.label, draft.emailPreferences[option.key] !== false, value => change({ emailPreferences: { ...draft.emailPreferences, [option.key]: value } }))}</div>)}
        {!settings.eligibleEmails.length && <p className="py-4 text-xs text-neutral-500">There are no optional email notifications for your current access.</p>}
        <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-slate-800 dark:text-neutral-300"><strong>Automatic account emails</strong><p className="mt-1">Registration acknowledgment, initial access approval, account invitations, password recovery and security alerts are sent when needed and cannot be disabled here.</p></div>
      </section>
      <section className="rounded-xl border bg-white p-5 dark:bg-slate-900"><h2 className="text-sm font-bold">Sound & popups</h2>
        {row('Notification sound', draft.soundEnabled, value => change({ soundEnabled: value }))}
        <label htmlFor="notification-tone" className="mt-3 block text-xs font-semibold">Notification tone</label><div className="mt-1 flex gap-2"><select id="notification-tone" className="h-9 flex-1 rounded-md border bg-transparent px-2 text-xs" value={draft.soundPreset} disabled={saving} onChange={event => change({ soundPreset: event.target.value as NotificationPreferences['soundPreset'] })}>{SOUND_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select><Button variant="outline" className="h-9 text-xs" onClick={() => playPresetSound(draft.soundPreset, 0.6)}>Preview sound</Button></div>
        {row('In-app popups', draft.toastEnabled, value => change({ toastEnabled: value }))}
        <h2 className="mt-5 text-sm font-bold">Activity alerts</h2><p className="mt-1 text-xs text-neutral-500">Control automatic sounds and popups. Authorized notifications remain in your notification history.</p>
        {settings.eligibleActivities.includes('jobAlerts') && row('Jobs', draft.jobAlerts, value => change({ jobAlerts: value }))}
        {settings.eligibleActivities.includes('reviewAlerts') && row('Reviews & approvals', draft.reviewAlerts, value => change({ reviewAlerts: value }))}
        {settings.eligibleActivities.includes('submissionAlerts') && row('Submissions & interviews', draft.submissionAlerts, value => change({ submissionAlerts: value }))}
      </section>
    </div>
  </div>;
}
