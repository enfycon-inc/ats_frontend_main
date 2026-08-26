"use client";

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Globe, Trash2, ShieldAlert } from "lucide-react";
import { SmtpConfigModal } from "@/components/email/smtp-config-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { atsApi } from "@/lib/ats-api";

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  is_default: boolean;
  profile_name?: string;
}

const ACTION_TYPES = [
  { id: 'consent', label: 'Consent Emails', desc: 'Consent related emails (GDPR, POPI etc) will be sent from the selected email address' },
  { id: 'interview', label: 'Interview Schedule Emails', desc: 'Interview schedule-related Schedule, Reschedule, and Cancel emails will be sent from the specified email ID' },
  { id: 'client_submission', label: 'Client Submission', desc: 'Client submission emails will be sent from the selected email address' },
  { id: 'applicant_send', label: 'Applicant Send Mail', desc: 'Applicant sent emails will be sent from the selected email address' },
];

export function EmailIntegrationTab() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchPreferences();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await atsApi.email.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPreferences = async () => {
    try {
      const data = await atsApi.email.getPreferences();
      const prefMap: Record<string, string> = {};
      data.forEach((p: any) => {
        prefMap[p.action_name] = p.email_account_id;
      });
      setPreferences(prefMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnect = (provider: string) => {
    setIsConnecting(provider);
    const user = atsApi.auth.getCurrentUser();
    const tenantId = user?.tenantId || '';
    if (provider === 'google') {
      window.location.href = `${getApiBase()}/api/v1/auth/google?tenantId=${tenantId}&userId=${user?.id || ''}&returnTo=${encodeURIComponent(window.location.origin + window.location.pathname + '?tab=email_integration')}`;
    } else if (provider === 'microsoft') {
      window.location.href = `${getApiBase()}/api/v1/auth/microsoft?tenantId=${tenantId}&userId=${user?.id || ''}&returnTo=${encodeURIComponent(window.location.origin + window.location.pathname + '?tab=email_integration')}`;
    } else if (provider === 'smtp') {
      setIsConnecting(null);
      setIsSmtpModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await atsApi.email.deleteAccount(deleteId);
        fetchAccounts();
        setDeleteId(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await atsApi.email.setDefaultAccount(id);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreferenceChange = async (actionId: string, accountId: string) => {
    setPreferences(prev => ({ ...prev, [actionId]: accountId }));
    try {
      await atsApi.email.savePreference(actionId, accountId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          enfySync uses this integrated email to send emails when submitting profiles or contacting applicants.
        </p>
      </div>

      <Card className="p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Email Integrations</h3>
        <div className="flex gap-4 mb-6">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2"
            onClick={() => handleConnect('google')}
            disabled={isConnecting !== null}
          >
            <Mail className="w-4 h-4" /> Sign in with Google
          </Button>
          
          <Button 
            variant="secondary" 
            className="bg-slate-500 hover:bg-slate-600 text-white flex gap-2"
            onClick={() => handleConnect('smtp')}
            disabled={isConnecting !== null}
          >
            <ShieldAlert className="w-4 h-4" /> Other Email Providers
          </Button>
          
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white flex gap-2"
            onClick={() => handleConnect('microsoft')}
            disabled={isConnecting !== null}
          >
            <Globe className="w-4 h-4" /> Connect to Office 365
          </Button>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">EMAIL</th>
                <th className="px-4 py-3 font-medium">EMAIL PROVIDER</th>
                <th className="px-4 py-3 font-medium text-center">STATUS</th>
                <th className="px-4 py-3 font-medium text-center">DEFAULT</th>
                <th className="px-4 py-3 font-medium text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-blue-600 font-medium">
                    {acc.profile_name ? `${acc.profile_name} (${acc.email})` : acc.email}
                  </td>
                  <td className="px-4 py-3 capitalize">{acc.provider === 'google' ? 'Gmail' : acc.provider === 'microsoft' ? 'Office 365' : 'SMTP/IMAP'}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">Active</td>
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="radio" 
                      name="default_account" 
                      checked={acc.is_default} 
                      onChange={() => handleSetDefault(acc.id)} 
                      className="cursor-pointer w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" 
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(acc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-col gap-2 mt-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Email Integrations</h3>
          <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-1 h-8">EMAIL CONFIGURATIONS</Button>
        </div>
        <p className="text-sm text-slate-500">Select the email addresses below for the actions to send the email through the integrated emails</p>
      </div>

      <Card className="p-6 border shadow-sm">
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-[1fr_300px] gap-4 pb-2 border-b font-medium text-xs text-slate-500 uppercase tracking-wider">
            <div>EMAIL NOTIFICATION</div>
            <div>DEFAULT FROM EMAIL ADDRESS</div>
          </div>
          
          {ACTION_TYPES.map(action => (
            <div key={action.id} className="grid grid-cols-[1fr_300px] gap-4 items-center pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
              <div>
                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{action.label}</h4>
                <p className="text-xs text-slate-500 mt-1">( {action.desc} )</p>
              </div>
              <div>
                <select 
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={preferences[action.id] || ''}
                  onChange={(e) => handlePreferenceChange(action.id, e.target.value)}
                >
                  <option value="">Select</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.email}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          
          <div className="pt-4 flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-24">Submit</Button>
            <Button variant="outline" className="w-24">Cancel</Button>
          </div>
        </div>
      </Card>

      <SmtpConfigModal 
        isOpen={isSmtpModalOpen} 
        onClose={() => setIsSmtpModalOpen(false)} 
        onSave={fetchAccounts} 
      />

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Email Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this email account? This action cannot be undone and will stop any automated emails configured for this account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
