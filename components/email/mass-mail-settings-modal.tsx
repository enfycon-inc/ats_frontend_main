'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { atsApi } from '@/lib/ats-api';
import { Trash2, Share2, Mail, Loader2, Plus, ChevronDown, ChevronRight, Monitor, Server } from 'lucide-react';

interface MassMailSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverySettings: {
    ratePerMinute: number;
    ratePerHour: number;
    randomizeDelay: boolean;
  };
  onDeliverySettingsChange: (settings: any) => void;
  canEditDeliverySettings: boolean;
  user: any;
}

export function MassMailSettingsModal({
  open,
  onOpenChange,
  deliverySettings,
  onDeliverySettingsChange,
  canEditDeliverySettings,
  user
}: MassMailSettingsModalProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shareAccount, setShareAccount] = useState<any | null>(null);
  const [shareConfig, setShareConfig] = useState<{
    sharedWithAll: boolean;
    sharedWithUsers: string[];
    sharedWithBranches: string[];
  }>({ sharedWithAll: false, sharedWithUsers: [], sharedWithBranches: [] });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [showAddMailbox, setShowAddMailbox] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSmtpExpanded, setIsSmtpExpanded] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    email: '', profileName: '', password: '',
    smtpHost: 'smtp.gmail.com', smtpPort: 587,
    imapHost: 'imap.gmail.com', imapPort: 993,
    requireSsl: true, requireTls: true,
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchUsersAndBranches();
    }
  }, [open]);

  const fetchUsersAndBranches = async () => {
    const [uResult, bResult] = await Promise.allSettled([
      atsApi.auth.listUsers(),
      atsApi.branches.list()
    ]);
    if (uResult.status === 'fulfilled') setUsersList(uResult.value || []);
    if (bResult.status === 'fulfilled') setBranchesList(bResult.value || []);
  };

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await atsApi.email.getAccounts();
      setAccounts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await atsApi.email.deleteAccount(id);
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (!shareAccount) return;
    try {
      await atsApi.email.shareAccount(shareAccount.id, {
        sharedWithAll: shareConfig.sharedWithAll,
        sharedWithUsers: shareConfig.sharedWithUsers,
        sharedWithBranches: shareConfig.sharedWithBranches
      });
      setShareAccount(null);
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectOAuth = (provider: 'google' | 'microsoft') => {
    setIsConnecting(provider);
    const currentUser = atsApi.auth.getCurrentUser();
    const tenantId = currentUser?.tenantId || '';
    const userId = currentUser?.id || '';
    const returnTo = encodeURIComponent(window.location.origin + window.location.pathname + '?settings=1');
    window.location.href = `http://localhost:5000/api/v1/auth/${provider}?tenantId=${tenantId}&userId=${userId}&returnTo=${returnTo}`;
  };

  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true);
    try {
      await atsApi.email.addCustomAccount(smtpForm);
      setIsSmtpExpanded(false);
      setShowAddMailbox(false);
      setSmtpForm({ email: '', profileName: '', password: '', smtpHost: 'smtp.gmail.com', smtpPort: 587, imapHost: 'imap.gmail.com', imapPort: 993, requireSsl: true, requireTls: true });
      fetchAccounts();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingSmtp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[860px] w-[90vw] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Email Settings & Accounts</DialogTitle>
        </DialogHeader>

        {shareAccount ? (
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold text-base">Share: {shareAccount.email}</h3>
              <p className="text-sm text-neutral-500 mt-1">Allow other members of your tenant to use this email account to send campaigns.</p>
            </div>

            <div className="flex flex-col gap-4 mt-2 p-4 border rounded-lg bg-neutral-50 dark:bg-slate-900/40">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareConfig.sharedWithAll}
                  onChange={e => setShareConfig({ ...shareConfig, sharedWithAll: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">Share with everyone in Tenant</span>
              </label>

              {!shareConfig.sharedWithAll && (
                <div className="grid grid-cols-2 gap-6 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Specific Branches</Label>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {branchesList.map(b => (
                        <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={shareConfig.sharedWithBranches.includes(b.id)}
                            onChange={(e) => {
                              const newBranches = e.target.checked
                                ? [...shareConfig.sharedWithBranches, b.id]
                                : shareConfig.sharedWithBranches.filter(id => id !== b.id);
                              setShareConfig({ ...shareConfig, sharedWithBranches: newBranches });
                            }}
                          />
                          {b.name}
                        </label>
                      ))}
                      {branchesList.length === 0 && <span className="text-xs text-neutral-400 px-2">No branches found</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Specific Users</Label>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {usersList.filter(u => u.id !== user?.id && u.id !== shareAccount?.user_id).map(u => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={shareConfig.sharedWithUsers.includes(u.id)}
                            onChange={(e) => {
                              const newUsers = e.target.checked
                                ? [...shareConfig.sharedWithUsers, u.id]
                                : shareConfig.sharedWithUsers.filter(id => id !== u.id);
                              setShareConfig({ ...shareConfig, sharedWithUsers: newUsers });
                            }}
                          />
                          {u.full_name || u.email}
                        </label>
                      ))}
                      {usersList.filter(u => u.id !== user?.id && u.id !== shareAccount?.user_id).length === 0 && <span className="text-xs text-neutral-400 px-2">No other users found</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShareAccount(null)}>Cancel</Button>
              <Button onClick={handleShare}>Save Sharing</Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="accounts" className="mt-1">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="delivery">Delivery & Anti-Spam</TabsTrigger>
              <TabsTrigger value="accounts">Manage Accounts</TabsTrigger>
            </TabsList>

            {/* ── DELIVERY SETTINGS ── */}
            <TabsContent value="delivery" className="space-y-6 pt-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-medium">Emails per Minute</Label>
                  <Input
                    type="number"
                    disabled={!canEditDeliverySettings}
                    value={deliverySettings.ratePerMinute}
                    onChange={e => onDeliverySettingsChange({ ...deliverySettings, ratePerMinute: Number(e.target.value) })}
                  />
                  <p className="text-xs text-neutral-500">Max sending rate per minute.</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Emails per Hour</Label>
                  <Input
                    type="number"
                    disabled={!canEditDeliverySettings}
                    value={deliverySettings.ratePerHour}
                    onChange={e => onDeliverySettingsChange({ ...deliverySettings, ratePerHour: Number(e.target.value) })}
                  />
                  <p className="text-xs text-neutral-500">Daily limit safety threshold.</p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEditDeliverySettings}
                  checked={deliverySettings.randomizeDelay}
                  onChange={e => onDeliverySettingsChange({ ...deliverySettings, randomizeDelay: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Randomize wait time between emails <span className="text-neutral-500">(Anti-spam jitter)</span></span>
              </label>
            </TabsContent>

            {/* ── MANAGE ACCOUNTS ── */}
            <TabsContent value="accounts" className="space-y-4 pt-4">

              {/* Connected Accounts List */}
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-sm">
                  No connected accounts yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map(acc => {
                    const privileged = ["SUPER_ADMIN", "TENANT_ADMIN", "ADMIN", "BRANCH_ADMIN"];
                    const mainRole = String(user?.role || user?.roleName || "").toUpperCase();
                    const rolesArr: string[] = Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toUpperCase()) : [];
                    const isAdmin = privileged.includes(mainRole) || rolesArr.some((r) => privileged.includes(r));
                    const isOwner = acc.user_id === user?.id || isAdmin;
                    const isSharedAll = acc.shared_with_all;
                    const sharedUsersCount = acc.shared_with_users?.length || 0;
                    const sharedBranchesCount = acc.shared_with_branches?.length || 0;

                    let shareText = isOwner ? 'Owned by you' + (isAdmin ? ' (or Tenant Admin)' : '') : 'Shared with you';
                    if (isOwner) {
                      if (isSharedAll) shareText += ' • Shared with All';
                      else if (sharedUsersCount > 0 || sharedBranchesCount > 0) shareText += ` • Shared (${sharedUsersCount} users, ${sharedBranchesCount} branches)`;
                    }

                    return (
                      <div key={acc.id} className="flex items-center justify-between px-4 py-3 border rounded-lg bg-neutral-50 dark:bg-slate-900/40 hover:bg-neutral-100 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{acc.email}</p>
                            <p className="text-xs text-neutral-500 capitalize">
                              {acc.provider === 'microsoft' ? 'Microsoft / Office 365' : acc.provider === 'google' ? 'Google / Gmail' : acc.provider} • {shareText}
                            </p>
                          </div>
                        </div>
                        {isOwner && (
                          <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5" onClick={() => {
                              setShareConfig({
                                sharedWithAll: acc.shared_with_all || false,
                                sharedWithUsers: acc.shared_with_users || [],
                                sharedWithBranches: acc.shared_with_branches || []
                              });
                              setShareAccount(acc);
                            }}>
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" onClick={() => handleDisconnect(acc.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Mailbox Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-neutral-50 dark:bg-slate-900/40 hover:bg-neutral-100 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setShowAddMailbox(v => !v)}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" />
                    Add Mailbox
                  </span>
                  {showAddMailbox ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                </button>

                {showAddMailbox && (
                  <div className="p-4 border-t space-y-4">
                    {/* OAuth providers */}
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Connect via OAuth</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleConnectOAuth('microsoft')}
                          disabled={isConnecting === 'microsoft'}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors text-left disabled:opacity-60"
                        >
                          <div className="w-8 h-8 rounded bg-[#0078d4]/10 flex items-center justify-center flex-shrink-0">
                            <Monitor className="w-4 h-4 text-[#0078d4]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Microsoft</p>
                            <p className="text-xs text-neutral-500">Outlook / Office 365</p>
                          </div>
                          {isConnecting === 'microsoft' && <Loader2 className="w-4 h-4 animate-spin ml-auto text-neutral-400" />}
                        </button>

                        <button
                          onClick={() => handleConnectOAuth('google')}
                          disabled={isConnecting === 'google'}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors text-left disabled:opacity-60"
                        >
                          <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Google</p>
                            <p className="text-xs text-neutral-500">Gmail / Workspace</p>
                          </div>
                          {isConnecting === 'google' && <Loader2 className="w-4 h-4 animate-spin ml-auto text-neutral-400" />}
                        </button>
                      </div>
                    </div>

                    {/* SMTP */}
                    <div className="border-t pt-3">
                      <button
                        className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        onClick={() => setIsSmtpExpanded(v => !v)}
                      >
                        <Server className="w-4 h-4 text-neutral-400" />
                        Custom SMTP / IMAP
                        {isSmtpExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-1 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 ml-1 text-neutral-400" />}
                      </button>

                      {isSmtpExpanded && (
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Email Address</Label>
                              <Input placeholder="you@example.com" value={smtpForm.email} onChange={e => setSmtpForm({ ...smtpForm, email: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Display Name</Label>
                              <Input placeholder="My Mailbox" value={smtpForm.profileName} onChange={e => setSmtpForm({ ...smtpForm, profileName: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Password / App Password</Label>
                              <Input type="password" placeholder="••••••••" value={smtpForm.password} onChange={e => setSmtpForm({ ...smtpForm, password: e.target.value })} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">SMTP Host</Label>
                              <Input value={smtpForm.smtpHost} onChange={e => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">SMTP Port</Label>
                              <Input type="number" value={smtpForm.smtpPort} onChange={e => setSmtpForm({ ...smtpForm, smtpPort: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <Button size="sm" onClick={handleSaveSmtp} disabled={isSavingSmtp || !smtpForm.email || !smtpForm.password}>
                              {isSavingSmtp ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving...</> : 'Save SMTP Account'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
