"use client";

import { useState, useEffect, useRef } from "react";
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
import { Bold, Italic, Link2, List, ListOrdered, Send, Clock, X, Paperclip, PlusCircle, Mail, Globe, Server, Settings } from "lucide-react";
import { SmtpConfigModal } from "@/components/email/smtp-config-modal";
import Link from 'next/link';

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

  // Delivery Settings
  const [ratePerMinute, setRatePerMinute] = useState(30);
  const [ratePerHour, setRatePerHour] = useState(500);
  const [randomizeDelay, setRandomizeDelay] = useState(true);
  const [isSending, setIsSending] = useState(false);

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
  
  const insertMergeField = (field: string) => {
    setBody((prev) => prev + `{{${field}}} `);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4">
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Mass Email Campaigns</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Send personalized bulk emails to candidates and track engagement.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
            <button 
              className={`px-4 py-1.5 text-sm rounded-sm transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('new')}
            >
              New Campaign
            </button>
            <button 
              className={`px-4 py-1.5 text-sm rounded-sm transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => { setActiveTab('history'); fetchHistory(); }}
            >
              History
            </button>
          </div>
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
      <Card className="p-6 border shadow-sm">
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
                if (val === "invite") {
                  setSubject("Interview Invitation: {{Job_Title}}");
                  setBody("Hi {{Candidate_Name}},\n\nWe would like to invite you for an interview for the {{Job_Title}} position.\n\nBest,\nRecruitment Team");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invite">Interview Invitation</SelectItem>
                <SelectItem value="sourcing">Initial Outreach</SelectItem>
                <SelectItem value="rejection">Application Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-2">
          <Label>Subject</Label>
          <Input 
            placeholder="Enter email subject" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
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
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message here..."
            className="w-full min-h-[300px] p-4 bg-transparent outline-none resize-y text-sm text-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* Delivery Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 rounded-md mt-2">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-neutral-500">Emails Per Minute (Max)</Label>
            <Input type="number" value={ratePerMinute} onChange={e => {
              const val = Number(e.target.value);
              setRatePerMinute(val);
              setRatePerHour(val * 60);
            }} className="h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-neutral-500">Emails Per Hour (Max)</Label>
            <Input type="number" value={ratePerHour} onChange={e => {
              const val = Number(e.target.value);
              setRatePerHour(val);
              setRatePerMinute(Math.round(val / 60));
            }} className="h-8" />
          </div>
          <div className="flex flex-col gap-2 justify-center">
            <Label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
              <input type="checkbox" checked={randomizeDelay} onChange={e => setRandomizeDelay(e.target.checked)} className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4" />
              Randomize wait time (Anti-spam jitter)
            </Label>
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
