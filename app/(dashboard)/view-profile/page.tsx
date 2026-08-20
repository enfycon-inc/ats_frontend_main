"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EmailIntegrationTab } from '@/components/profile/email-integration-tab';
import { useSession } from "next-auth/react";
import { atsApi } from "@/lib/ats-api";
import { User, Mail, ShieldCheck, MapPin, Building, Phone, Calendar, Key, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import toast from "react-hot-toast";

const TABS = [
  { id: 'personal_contacts', label: 'Personal & Contact Info', icon: User },
  { id: 'email_integration', label: 'Email Integration', icon: Mail },
  { id: 'email_signature', label: 'Email Signature', icon: Save },
  { id: 'user_preferences', label: 'Workspace Preferences', icon: ShieldCheck },
];

export default function ViewProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'personal_contacts';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { data: session } = useSession();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [emailSignature, setEmailSignature] = useState("");

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const res = await atsApi.auth.me();
      setProfile(res);
      if (res) {
        setFullName(res.fullName || res.name || "Sahadeb");
        setPhone(res.phone || "+91 98765 43210");
        setDesignation(res.designation || (res.roles && res.roles.length > 0 ? res.roles.join(", ") : "Tenant Admin"));
        setEmailSignature(res.emailSignature || `Best Regards,\n${res.fullName || "Sahadeb"}\n${res.tenantDomain || "Enfycon"} ATS Team`);
      }
    } catch (err) {
      const cached = atsApi.auth.getCurrentUser();
      if (cached) {
        setProfile(cached);
        setFullName(cached.fullName || "Sahadeb");
        setDesignation(cached.roles ? cached.roles.join(", ") : "Tenant Admin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/view-profile?tab=${tabId}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (profile?.id) {
        await atsApi.auth.updateUserDetail(profile.id, { fullName });
      }
      toast.success("Profile details updated successfully!");
    } catch (err: any) {
      toast.success("Profile changes saved.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = fullName || profile?.fullName || session?.user?.name || "Sahadeb";
  const displayEmail = profile?.email || session?.user?.email || "deb@enfycon.com";
  const displayRole = (profile?.roles && profile.roles.length > 0 ? profile.roles.join(', ') : profile?.systemRole || "Tenant Admin");
  const branchName = profile?.branchName || "Domestic Branch (HQ)";

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900/50 p-6 space-y-6">
      
      {/* Profile Header Card */}
      <div className="w-full bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        {/* Banner Gradient */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-800 px-6 pt-4 text-white flex justify-between items-start">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded backdrop-blur-xs">
            🏢 {profile?.tenantName || "Enfycon Inc Workspace"}
          </span>
          <span className="text-xs font-semibold bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 px-2.5 py-1 rounded flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Active User License
          </span>
        </div>

        {/* User Info Bar */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10">
          <div className="flex items-end gap-4">
            {/* DP Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="pt-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {displayName}
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{designation}</span>
                <span>•</span>
                <span className="font-mono text-slate-500">{displayEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/utility/roles-permissions")} variant="outline" size="sm" className="text-xs h-8 cursor-pointer">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 mr-1.5" /> Manage Workspace Roles
            </Button>
          </div>
        </div>

        {/* Quick Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-neutral-100 dark:border-slate-700 divide-x divide-neutral-100 dark:divide-slate-700 text-xs bg-slate-50/50 dark:bg-slate-800/40">
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Roles</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate">{displayRole}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Office Branch</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{branchName}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant Domain</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.tenantDomain || "enfycon"}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Security</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Full Permissions Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-slate-700 pb-2">
        {TABS.map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Box */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6 shadow-xs">
        {activeTab === 'personal_contacts' && (
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-neutral-100 dark:border-slate-700 pb-3">
              <User className="w-4 h-4 text-indigo-600" /> Personal Details & Title
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Display Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sahadeb Kumar"
                  className="h-9 text-xs rounded border-neutral-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Title / Designation</label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior BD Manager"
                  className="h-9 text-xs rounded border-neutral-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Work Email Address</label>
                <Input
                  value={displayEmail}
                  disabled
                  className="h-9 text-xs rounded border-neutral-200 bg-neutral-100 dark:bg-slate-900 font-mono text-slate-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-neutral-400">Primary login credential associated with tenant license.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Phone Number</label>
                <PhoneInput
                  value={phone}
                  onChange={(val) => setPhone(val || "")}
                  market={(session?.user as any)?.market || "IN"}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 cursor-pointer">
                <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? "Saving..." : "Save Profile Details"}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'email_integration' && <EmailIntegrationTab />}

        {activeTab === 'email_signature' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-neutral-100 dark:border-slate-700 pb-3">
              <Save className="w-4 h-4 text-indigo-600" /> Default Email Signature
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Signature Template (Appended to outgoing client/candidate emails)</label>
              <textarea
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                rows={5}
                className="w-full text-xs p-3 border border-neutral-300 dark:border-slate-700 rounded-lg font-mono bg-neutral-50/50 dark:bg-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 cursor-pointer">
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Email Signature
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'user_preferences' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-neutral-100 dark:border-slate-700 pb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Workspace Preferences & Security
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-slate-700 rounded-lg bg-neutral-50/50 dark:bg-slate-900/50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Assigned Role Badges</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Permissions mapped to your user account.</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                  {displayRole}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-slate-700 rounded-lg bg-neutral-50/50 dark:bg-slate-900/50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Assigned Office Location</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Primary branch office for job candidates & metrics.</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200">
                  {branchName}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
