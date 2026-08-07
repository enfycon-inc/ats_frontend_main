"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bold, Italic, Link2, List, ListOrdered, Send, Clock, X, Paperclip, PlusCircle, Mail, Globe, Server, Settings, Lock, ShieldCheck } from "lucide-react";
import { SmtpConfigModal } from "@/components/email/smtp-config-modal";
import Link from 'next/link';
import { atsApi } from "@/lib/ats-api";

export function MassMailForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [campaignName, setCampaignName] = useState("");
  
  // History State
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [selectedCampaignLogs, setSelectedCampaignLogs] = useState<{ campaign: any, recipients: any[] } | null>(null);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  
  const [accounts, setAccounts] = useState<{ id: string; email: string; provider: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("none");
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);

  // CSV State
  const [csvRecipients, setCsvRecipients] = useState<{ firstName: string; lastName: string; email: string; metadata?: any }[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body'>('body');

  // Delivery Settings
  const [ratePerMinute, setRatePerMinute] = useState(30);
  const [ratePerHour, setRatePerHour] = useState(500);
  const [randomizeDelay, setRandomizeDelay] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // User Profile & Delivery Settings Permissions
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    atsApi.auth.me().then((res) => {
      if (res) setUserProfile(res);
    }).catch(() => {
      const local = atsApi.auth.getCurrentUser();
      if (local) setUserProfile(local);
    });
  }, []);

  const canEditDeliverySettings = useMemo(() => {
    const u = userProfile || (typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null);
    if (!u) return true;
    const mainRole = String(u.role || u.roleName || "").toUpperCase();
    const rolesArr: string[] = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toUpperCase()) : [];
    
    const privileged = [
      "SUPER_ADMIN", "TENANT_ADMIN", "ADMIN", "BRANCH_ADMIN",
      "BRANCH_MANAGER", "BRANCH_HEAD", "BRANCH_LEAD", "ACCOUNT_MANAGER"
    ];
    
    if (privileged.includes(mainRole)) return true;
    if (rolesArr.some((r) => privileged.includes(r))) return true;
    if (mainRole.includes("ADMIN") || mainRole.includes("BRANCH") || mainRole.includes("MANAGER")) return true;
    if (rolesArr.some((r) => r.includes("ADMIN") || r.includes("BRANCH") || r.includes("MANAGER"))) return true;
    
    return false;
  }, [userProfile]);

  const activeBranchId = useMemo(() => {
    if (typeof window !== "undefined") {
      const branchFromStorage = localStorage.getItem("active_branch_id");
      if (branchFromStorage) return branchFromStorage;
    }
    return userProfile?.branchId || userProfile?.branchName || "default_branch";
  }, [userProfile]);

  const branchSettingsKey = `mass_mail_delivery_settings_${activeBranchId}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(branchSettingsKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.ratePerMinute === "number") setRatePerMinute(parsed.ratePerMinute);
          if (typeof parsed.ratePerHour === "number") setRatePerHour(parsed.ratePerHour);
          if (typeof parsed.randomizeDelay === "boolean") setRandomizeDelay(parsed.randomizeDelay);
        } catch (e) {
          console.error("Error loading branch delivery settings", e);
        }
      }
    }
  }, [branchSettingsKey]);

  const updateBranchSettings = (min: number, hr: number, rand: boolean) => {
    setRatePerMinute(min);
    setRatePerHour(hr);
    setRandomizeDelay(rand);
    if (canEditDeliverySettings && typeof window !== "undefined") {
      localStorage.setItem(branchSettingsKey, JSON.stringify({
        ratePerMinute: min,
        ratePerHour: hr,
        randomizeDelay: rand,
      }));
    }
  };

  // Status Polling
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaignStats, setCampaignStats] = useState<{ total: number; sent: number; pending: number; failed: number } | null>(null);

  const fetchHistory = () => {
    fetch("http://localhost:5000/email/campaigns")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCampaignHistory(data);
        }
      })
      .catch(console.error);
  };

  const fetchLogs = async (camp: any) => {
    try {
      const res = await fetch(`http://localhost:5000/email/campaigns/${camp.id}/recipients`);
      const data = await res.json();
      setSelectedCampaignLogs({ campaign: camp, recipients: data });
      setIsLogsDialogOpen(true);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchAccounts = () => {
    fetch("http://localhost:5000/email/accounts")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (data.length > 0) {
            // only set default if none is selected
            setSelectedAccount(prev => prev === "none" ? data[0].email : prev);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchAccounts();

    fetchHistory();

    // Fetch active campaign on load to restore status overlay
    fetch("http://localhost:5000/email/campaigns/active")
      .then(res => res.json())
      .then(data => {
        if (data.activeCampaignId) {
          setActiveCampaignId(data.activeCampaignId);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeCampaignId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/email/campaigns/${activeCampaignId}/status`);
        const stats = await res.json();
        setCampaignStats(stats);
        
        if (stats.pending === 0) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeCampaignId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        const parsed = results.data.map((row: any) => ({
          firstName: row.firstName || row.first_name || row['First Name'] || row.first || '',
          lastName: row.lastName || row.last_name || row['Last Name'] || row.last || '',
          email: row.email || row.Email || row['Email Address'] || '',
          metadata: row,
        })).filter((r: any) => r.email);
        setCsvRecipients(parsed);
      }
    });
  };

  const handleSend = async () => {
    if (selectedAccount === 'none') {
      alert("Please connect an email account first.");
      return;
    }
    if (csvRecipients.length === 0) {
      alert("Please upload a CSV with recipients.");
      return;
    }
    if (!subject || !body) {
      alert("Please enter subject and body.");
      return;
    }

    setIsSending(true);
    try {
      const selectedAccId = accounts.find(a => a.email === selectedAccount)?.id;
      const res = await fetch("http://localhost:5000/email/campaigns", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName || "Untitled Campaign",
          accountId: selectedAccId,
          subject,
          body,
          ratePerMinute,
          ratePerHour,
          randomizeDelay,
          recipients: csvRecipients
        })
      });
      const data = await res.json();
      if (data.success) {
        setCsvRecipients([]);
        if (data.campaignId) {
          setActiveCampaignId(data.campaignId);
          setCampaignStats({ total: csvRecipients.length, sent: 0, pending: csvRecipients.length, failed: 0 });
        } else {
          alert(data.message);
        }
      } else {
        alert("Failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error starting campaign.");
    } finally {
      setIsSending(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "First Name,Last Name,Email,Job Title,Company Name\nJohn,Doe,john@example.com,Software Engineer,Tech Corp\nJane,Smith,jane@example.com,Product Manager,Innovate LLC\nAlice,Johnson,alice@example.com,Designer,Creative Inc";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConnect = (provider: string) => {
    setIsConnecting(provider);
    if (provider === 'google') {
      window.location.href = "http://localhost:5000/api/v1/auth/google?returnTo=/email";
    } else if (provider === 'microsoft') {
      window.location.href = "http://localhost:5000/api/v1/auth/microsoft?returnTo=/email";
    } else if (provider === 'smtp') {
      setIsConnecting(null);
      setIsDialogOpen(false);
      setIsSmtpModalOpen(true);
    } else {
      setIsConnecting(null);
      setIsDialogOpen(false);
    }
  };
  
  const insertMergeField = useCallback((field: string) => {
    const tag = `{{${field}}}`;
    if (lastFocusedField === 'subject' && subjectInputRef.current) {
      const el = subjectInputRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const newVal = subject.slice(0, start) + tag + subject.slice(end);
      setSubject(newVal);
      // Restore cursor after the inserted tag
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      });
    } else {
      const el = bodyTextareaRef.current;
      if (el) {
        const start = el.selectionStart ?? body.length;
        const end = el.selectionEnd ?? body.length;
        const newVal = body.slice(0, start) + tag + body.slice(end);
        setBody(newVal);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + tag.length, start + tag.length);
        });
      } else {
        setBody((prev) => prev + tag);
      }
    }
  }, [lastFocusedField, subject, body]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-full">
      
      {/* STANDARD PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-default-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-default-900 dark:text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" /> Mass Email Campaigns
          </h1>
          <p className="text-xs text-default-500 dark:text-neutral-400 mt-1">
            Send personalized bulk emails to candidates and track engagement.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-slate-800/80 p-1 rounded-lg border border-neutral-200 dark:border-slate-700">
          <button 
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'new' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold' 
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
            onClick={() => setActiveTab('new')}
          >
            New Campaign
          </button>
          <button 
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold' 
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
            onClick={() => { setActiveTab('history'); fetchHistory(); }}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'history' && (
        <Card className="border shadow-sm p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
                <tr>
                  <th className="px-4 py-4 font-medium whitespace-nowrap">Campaign Name</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap">Date</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap">Start Time</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap">End Time</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap text-center">Rate(Set)</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap text-center">Rate(Act)</th>
                  <th className="px-4 py-4 font-medium whitespace-nowrap text-center">Avg Wait</th>
                  <th className="px-4 py-4 font-medium text-center">Total</th>
                  <th className="px-4 py-4 font-medium text-center text-green-600">Sent</th>
                  <th className="px-4 py-4 font-medium text-center text-blue-600">Pending</th>
                  <th className="px-4 py-4 font-medium text-center text-red-600">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaignHistory.map((camp) => {
                  const actualRate = (() => {
                    if (!camp.start_time || !camp.end_time) return '-';
                    const mins = (new Date(camp.end_time).getTime() - new Date(camp.start_time).getTime()) / 60000;
                    if (mins <= 0) return '-';
                    return (camp.sent_count / mins).toFixed(1);
                  })();
                  
                  return (
                  <tr 
                    key={camp.id} 
                    onClick={() => fetchLogs(camp)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                    title="Click to view per-email logs"
                  >
                    <td className="px-4 py-4 font-medium text-blue-600 hover:underline whitespace-nowrap">{camp.name || 'Untitled Campaign'}</td>
                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{camp.start_time ? new Date(camp.start_time).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        camp.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        camp.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                        camp.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">{camp.start_time ? new Date(camp.start_time).toLocaleTimeString() : '-'}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">{camp.end_time ? new Date(camp.end_time).toLocaleTimeString() : '-'}</td>
                    <td className="px-4 py-4 text-center text-slate-500 whitespace-nowrap">{camp.rate_set || '-'}</td>
                    <td className="px-4 py-4 text-center text-slate-500 whitespace-nowrap">{actualRate}</td>
                    <td className="px-4 py-4 text-center text-slate-500 whitespace-nowrap">{camp.avg_wait_seconds ? (camp.avg_wait_seconds / 60).toFixed(1) + 'm' : '-'}</td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">{camp.total_recipients}</td>
                    <td className="px-4 py-4 text-center font-medium text-green-600 whitespace-nowrap">{camp.sent_count}</td>
                    <td className="px-4 py-4 text-center text-blue-600 whitespace-nowrap">{camp.pending_count}</td>
                    <td className="px-4 py-4 text-center text-red-600 whitespace-nowrap">{camp.failed_count}</td>
                  </tr>
                )})}
                {campaignHistory.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-slate-500">
                      No campaigns found. Send your first campaign to see history here!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'new' && (
      <Card className="p-6 border border-default-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 w-full">
        <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-4">
        <div className="flex-1 mr-4">
          <Input 
            placeholder="Campaign Name (e.g. Q3 Outreach)" 
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="text-xl font-semibold border-none focus-visible:ring-0 shadow-none px-0 h-auto"
          />
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {csvRecipients.length > 0 ? `Sending to ${csvRecipients.length} recipients` : 'Upload a CSV to add recipients'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={downloadSampleCsv} className="text-neutral-500 hover:text-neutral-800 text-xs h-9">
            Download Sample
          </Button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex gap-2 h-9">
            <List className="w-4 h-4" /> Import CSV
          </Button>
        </div>
      </div>

      {/* CSV Preview Table */}
      {csvRecipients.length > 0 && (
        <div className="border border-neutral-200 dark:border-slate-800 rounded-md p-4 bg-neutral-50 dark:bg-slate-800/50 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold mb-2">Recipient Preview</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-slate-700">
                {csvHeaders.map(header => (
                  <th key={header} className="pb-2 font-medium px-4">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvRecipients.slice(0, 5).map((r, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-slate-700/50 last:border-0">
                  {csvHeaders.map(header => (
                    <td key={header} className="py-2 px-4 truncate max-w-[200px]">{r.metadata[header] || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {csvRecipients.length > 5 && (
            <p className="text-xs text-neutral-500 mt-2 text-center">...and {csvRecipients.length - 5} more recipients</p>
          )}
        </div>
      )}

      {/* Live Status Overlay / Banner */}
      {activeCampaignId && campaignStats && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300">Campaign Sending Status</h3>
            {campaignStats.pending === 0 && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">Completed</span>
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-neutral-100 dark:border-slate-700 text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-bold">{campaignStats.total}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-neutral-100 dark:border-slate-700 text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Sent</p>
              <p className="text-xl font-bold text-green-600">{campaignStats.sent}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-neutral-100 dark:border-slate-700 text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-xl font-bold text-blue-600">{campaignStats.pending}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-neutral-100 dark:border-slate-700 text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Failed</p>
              <p className="text-xl font-bold text-red-600">{campaignStats.failed}</p>
            </div>
          </div>
          
          <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${(campaignStats.sent + campaignStats.failed) / Math.max(campaignStats.total, 1) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex gap-2 mt-4">
            {campaignStats.pending === 0 ? (
              <Button variant="outline" size="sm" onClick={() => { setActiveCampaignId(null); setCampaignStats(null); }}>
                Dismiss
              </Button>
            ) : (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={async () => {
                  try {
                    await fetch(`http://localhost:5000/email/campaigns/${activeCampaignId}/cancel`, { method: 'POST' });
                    setCampaignStats(s => s ? { ...s, pending: 0 } : null);
                    alert("Campaign cancelled. Remaining emails will not be sent.");
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Cancel Remaining Emails
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="flex flex-col gap-5">
        
        {/* From / Template Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>From Account</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="No accounts connected" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="none" disabled>No connected accounts</SelectItem>
                  ) : (
                    accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.email}>
                        {acc.email} ({acc.provider === 'google' ? 'Gmail' : acc.provider === 'microsoft' ? 'Office365' : 'SMTP'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Connect New Account">
                    <PlusCircle className="w-4 h-4 text-neutral-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Connect Email Account</DialogTitle>
                    <DialogDescription>
                      Choose your email provider to connect for 2-way mass mail sync.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center p-4 border border-neutral-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-4">
                        <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Google Workspace / Gmail</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Connect via Google OAuth</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => handleConnect('google')} disabled={isConnecting !== null}>
                        {isConnecting === 'google' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center p-4 border border-neutral-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Microsoft 365 / Outlook</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Connect via Microsoft Graph</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => handleConnect('microsoft')} disabled={isConnecting !== null}>
                        {isConnecting === 'microsoft' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center p-4 border border-neutral-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center mr-4">
                        <Server className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Custom SMTP / IMAP</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Use standard mail protocols</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => handleConnect('smtp')} disabled={isConnecting !== null}>
                        {isConnecting === 'smtp' ? 'Connecting...' : 'Setup'}
                      </Button>
                    </div>

                    <div className="mt-4 text-center">
                      <Link href="/view-profile?tab=email_integration">
                        <Button variant="link" className="text-blue-600 text-xs">
                          <Settings className="w-3 h-3 mr-1" />
                          Manage Advanced Email Settings
                        </Button>
                      </Link>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <SmtpConfigModal 
                isOpen={isSmtpModalOpen} 
                onClose={() => setIsSmtpModalOpen(false)} 
                onSave={fetchAccounts} 
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label>Template</Label>
            <Select
              onValueChange={(val) => {
                const templates: Record<string, { subject: string; body: string }> = {
                  initial_outreach: {
                    subject: "Exciting Opportunity: {{Job_Title}} at {{Company_Name}}",
                    body: `Hi {{Candidate_Name}},\n\nI came across your profile and was impressed by your background in {{Candidate_Skill}}.\n\nWe have an exciting opening for a {{Job_Title}} role at {{Company_Name}} that I think could be a great fit for you.\n\nHere's a quick overview:\n- Role: {{Job_Title}}\n- Location: {{Job_Location}}\n- Department: {{Department}}\n\nI'd love to schedule a quick 15-minute call to share more details. Would you be open to connecting this week?\n\nBest regards,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  job_alert: {
                    subject: "New Job Match: {{Job_Title}} – {{Company_Name}}",
                    body: `Hi {{Candidate_Name}},\n\nBased on your profile, we think you'd be a great fit for a new opportunity we just posted:\n\n📌 Role: {{Job_Title}}\n📍 Location: {{Job_Location}}\n💼 Department: {{Department}}\n📅 Start Date: {{Start_Date}}\n\nApply now or reply to this email to express interest. We'd love to hear from you!\n\nBest,\n{{Recruiter_Name}}\n{{Company_Name}} Talent Team`,
                  },
                  re_engagement: {
                    subject: "We'd love to reconnect, {{Candidate_Name}}!",
                    body: `Hi {{Candidate_Name}},\n\nIt's been a while since we last spoke, and we have some exciting new opportunities that might interest you.\n\nWe currently have openings in {{Department}} that align with your experience in {{Candidate_Skill}}.\n\nWould you be open to a quick call to catch up?\n\nWarm regards,\n{{Recruiter_Name}}\n{{Company_Name}} Talent Team`,
                  },
                  application_ack: {
                    subject: "We received your application – {{Job_Title}}",
                    body: `Hi {{Candidate_Name}},\n\nThank you for applying for the {{Job_Title}} position at {{Company_Name}}!\n\nWe have received your application and our team is currently reviewing it. We will be in touch within {{Response_Days}} business days with an update.\n\nThank you for your interest!\n\nBest regards,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  interview_invite: {
                    subject: "Interview Invitation – {{Job_Title}} at {{Company_Name}}",
                    body: `Hi {{Candidate_Name}},\n\nCongratulations! We'd like to invite you to interview for the {{Job_Title}} position at {{Company_Name}}.\n\n📅 Date: {{Interview_Date}}\n⏰ Time: {{Interview_Time}}\n📍 Location / Link: {{Interview_Link}}\n👤 Interviewer: {{Interviewer_Name}}\n\nPlease confirm your availability by replying to this email.\n\nBest,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  interview_reminder: {
                    subject: "Reminder: Your Interview Tomorrow – {{Job_Title}}",
                    body: `Hi {{Candidate_Name}},\n\nThis is a friendly reminder about your upcoming interview for the {{Job_Title}} role at {{Company_Name}}.\n\n📅 Date: {{Interview_Date}}\n⏰ Time: {{Interview_Time}}\n📍 Location / Link: {{Interview_Link}}\n\nIf you need to reschedule, please let us know as soon as possible.\n\nSee you soon!\n\nBest,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  assessment_invite: {
                    subject: "Skills Assessment – {{Job_Title}} at {{Company_Name}}",
                    body: `Hi {{Candidate_Name}},\n\nAs part of our selection process for the {{Job_Title}} role, we'd like to invite you to complete a short skills assessment.\n\n🔗 Assessment Link: {{Assessment_Link}}\n⏱ Estimated Time: {{Assessment_Duration}} minutes\n📅 Deadline: {{Assessment_Deadline}}\n\nPlease reach out if you have any questions.\n\nBest,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  offer_notification: {
                    subject: "Congratulations! Job Offer – {{Job_Title}}",
                    body: `Hi {{Candidate_Name}},\n\nWe are thrilled to extend an offer for the {{Job_Title}} position at {{Company_Name}}!\n\n- 📋 Role: {{Job_Title}}\n- 💰 Compensation: {{Compensation}}\n- 📍 Location: {{Job_Location}}\n- 📅 Start Date: {{Start_Date}}\n\nYour formal offer letter will follow shortly. Please confirm your acceptance by {{Offer_Deadline}}.\n\nWe're excited to have you join the team!\n\nBest,\n{{Recruiter_Name}}\n{{Company_Name}} HR Team`,
                  },
                  onboarding_welcome: {
                    subject: "Welcome to {{Company_Name}}, {{Candidate_Name}}! 🎉",
                    body: `Hi {{Candidate_Name}},\n\nWelcome to the {{Company_Name}} family! We're so excited to have you join us as {{Job_Title}}.\n\n📅 Start Date: {{Start_Date}}\n📍 Location: {{Job_Location}}\n⏰ Reporting Time: {{Reporting_Time}}\n👤 Your Manager: {{Manager_Name}}\n\nSee you soon!\n\n{{Recruiter_Name}}\n{{Company_Name}} HR Team`,
                  },
                  rejection_pre_interview: {
                    subject: "Your Application – {{Job_Title}} at {{Company_Name}}",
                    body: `Hi {{Candidate_Name}},\n\nThank you for applying for the {{Job_Title}} position at {{Company_Name}}.\n\nAfter careful review, we have decided to move forward with other candidates whose experience more closely matches our current needs.\n\nWe will keep your profile on file for future openings.\n\nThank you again and we wish you all the best.\n\nKind regards,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  rejection_post_interview: {
                    subject: "Update on Your Application – {{Job_Title}}",
                    body: `Hi {{Candidate_Name}},\n\nThank you for taking the time to meet with us for the {{Job_Title}} role at {{Company_Name}}. We genuinely enjoyed learning more about your background.\n\nAfter careful consideration, we have decided to move forward with another candidate. We were impressed by your {{Candidate_Skill}} and would love to stay in touch for future opportunities.\n\nWarm regards,\n{{Recruiter_Name}}\n{{Company_Name}} Recruitment Team`,
                  },
                  event_invite: {
                    subject: "You're Invited: {{Event_Name}} – {{Company_Name}}",
                    body: `Hi {{Candidate_Name}},\n\nYou're invited to {{Event_Name}}, hosted by {{Company_Name}}!\n\n📅 Date: {{Event_Date}}\n⏰ Time: {{Event_Time}}\n📍 Location: {{Event_Location}}\n🔗 Register Here: {{Event_Link}}\n\nRSVP by {{RSVP_Deadline}}.\n\nBest,\n{{Recruiter_Name}}\n{{Company_Name}} Talent Team`,
                  },
                };
                if (templates[val]) {
                  setSubject(templates[val].subject);
                  setBody(templates[val].body);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_s" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Sourcing</SelectItem>
                <SelectItem value="initial_outreach">Initial Outreach</SelectItem>
                <SelectItem value="job_alert">Job Alert</SelectItem>
                <SelectItem value="re_engagement">Re-Engagement Campaign</SelectItem>
                <SelectItem value="_a" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Application</SelectItem>
                <SelectItem value="application_ack">Application Acknowledgement</SelectItem>
                <SelectItem value="_i" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Interview</SelectItem>
                <SelectItem value="interview_invite">Interview Invitation</SelectItem>
                <SelectItem value="interview_reminder">Interview Reminder</SelectItem>
                <SelectItem value="_as" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Assessment</SelectItem>
                <SelectItem value="assessment_invite">Skills Assessment Invite</SelectItem>
                <SelectItem value="_o" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Offer & Hiring</SelectItem>
                <SelectItem value="offer_notification">Job Offer Notification</SelectItem>
                <SelectItem value="onboarding_welcome">Onboarding Welcome</SelectItem>
                <SelectItem value="_r" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Rejections</SelectItem>
                <SelectItem value="rejection_pre_interview">Rejection (Pre-Interview)</SelectItem>
                <SelectItem value="rejection_post_interview">Rejection (Post-Interview)</SelectItem>
                <SelectItem value="_e" disabled className="text-xs font-semibold text-muted-foreground opacity-70 cursor-default">── Events</SelectItem>
                <SelectItem value="event_invite">Event / Job Fair Invite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-2">
          <Label>Subject</Label>
          <Input 
            ref={subjectInputRef}
            placeholder="Enter email subject" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setLastFocusedField('subject')}
          />
        </div>

        {/* Body & Rich Text Toolbar */}
        <div className="flex flex-col gap-0 border border-neutral-200 dark:border-slate-700 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          
          {/* Toolbar */}
          <div className="bg-neutral-50 dark:bg-slate-800/50 border-b border-neutral-200 dark:border-slate-700 p-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                <Italic className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-neutral-300 dark:bg-slate-600 mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                <List className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                <ListOrdered className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-neutral-300 dark:bg-slate-600 mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium">Insert Merge Field:</span>
              {csvHeaders.length > 0 && (
                <div className="flex gap-1 flex-wrap max-w-full overflow-hidden">
                  {csvHeaders.map(header => (
                    <Button key={header} variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => insertMergeField(header)}>
                      [{header}]
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <textarea
            ref={bodyTextareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setLastFocusedField('body')}
            placeholder="Type your message here..."
            className="w-full min-h-[300px] p-4 bg-transparent outline-none resize-y text-sm text-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* Delivery Settings (Branch Isolated & Role Protected) */}
        <div className="p-4 border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 rounded-lg space-y-3 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/30 pb-2">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Branch Delivery Rate & Anti-Spam Controls ({userProfile?.branchName || "HQ / Default Branch"})
            </span>
            {canEditDeliverySettings ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Tenant / Branch Admin Access (Editable)
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Managed by Tenant & Branch Admins
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-neutral-600 dark:text-neutral-300 font-semibold">Emails Per Minute (Max)</Label>
              <Input 
                type="number" 
                disabled={!canEditDeliverySettings}
                value={ratePerMinute} 
                onChange={e => {
                  const val = Number(e.target.value);
                  updateBranchSettings(val, val * 60, randomizeDelay);
                }} 
                className="h-9 disabled:opacity-75 disabled:bg-neutral-100 dark:disabled:bg-slate-800" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-neutral-600 dark:text-neutral-300 font-semibold">Emails Per Hour (Max)</Label>
              <Input 
                type="number" 
                disabled={!canEditDeliverySettings}
                value={ratePerHour} 
                onChange={e => {
                  const val = Number(e.target.value);
                  updateBranchSettings(Math.round(val / 60), val, randomizeDelay);
                }} 
                className="h-9 disabled:opacity-75 disabled:bg-neutral-100 dark:disabled:bg-slate-800" 
              />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <Label className={`flex items-center gap-2 text-xs font-semibold select-none ${!canEditDeliverySettings ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}>
                <input 
                  type="checkbox" 
                  disabled={!canEditDeliverySettings}
                  checked={randomizeDelay} 
                  onChange={e => updateBranchSettings(ratePerMinute, ratePerHour, e.target.checked)} 
                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:cursor-not-allowed" 
                />
                Randomize wait time (Anti-spam jitter)
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-slate-800">
        <Button variant="ghost" className="text-neutral-500 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attach Files
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button variant="secondary" className="flex items-center gap-2 text-primary bg-primary/10 hover:bg-primary/20">
            <Clock className="w-4 h-4" />
            Schedule
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
            <Send className="w-4 h-4" />
            {isSending ? 'Queuing...' : 'Send Campaign'}
          </Button>
        </div>
      </div>
      </div>
      </Card>
      )}

      {/* Logs Dialog */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="sm:max-w-7xl w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Campaign Logs: {selectedCampaignLogs?.campaign.name || 'Untitled'}</DialogTitle>
            <DialogDescription>
              Detailed per-email status for this campaign.
            </DialogDescription>
          </DialogHeader>

          {selectedCampaignLogs?.campaign && (
            <div className="grid grid-cols-5 gap-4 py-4 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-md border text-sm mb-4">
              <div>
                <p className="text-slate-500 text-xs mb-1 uppercase">Start Time</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCampaignLogs.campaign.start_time ? new Date(selectedCampaignLogs.campaign.start_time).toLocaleTimeString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1 uppercase">End Time</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCampaignLogs.campaign.end_time ? new Date(selectedCampaignLogs.campaign.end_time).toLocaleTimeString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1 uppercase">Rate (Set)</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedCampaignLogs.campaign.rate_set || '-'} /min</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1 uppercase">Rate (Actual)</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {(() => {
                    const c = selectedCampaignLogs.campaign;
                    if (!c.start_time || !c.end_time) return '-';
                    const mins = (new Date(c.end_time).getTime() - new Date(c.start_time).getTime()) / 60000;
                    if (mins <= 0) return '-';
                    return (c.sent_count / mins).toFixed(1) + ' /min';
                  })()}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1 uppercase">Avg Wait Time</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCampaignLogs.campaign.avg_wait_seconds 
                    ? (selectedCampaignLogs.campaign.avg_wait_seconds / 60).toFixed(1) + ' mins' 
                    : '-'}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedCampaignLogs?.recipients.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-2 truncate max-w-[150px]">{r.first_name} {r.last_name}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]">{r.email}</td>
                    <td className="px-4 py-2 truncate max-w-[150px]">{r.metadata?.jobTitle || r.metadata?.['Job Title'] || r.metadata?.job_title || '-'}</td>
                    <td className="px-4 py-2 truncate max-w-[150px]">{r.metadata?.companyName || r.metadata?.['Company Name'] || r.metadata?.Company || '-'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                        r.status === 'Sent' ? 'bg-green-100 text-green-700' :
                        r.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'Cancelled' ? 'bg-slate-100 text-slate-700' :
                        r.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 text-xs whitespace-nowrap">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
