"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EmailIntegrationTab } from '@/components/profile/email-integration-tab';
import { useSession } from "next-auth/react";

const TABS = [
  { id: 'personal_contacts', label: 'Personal Contacts' },
  { id: 'email_signature', label: 'Email Signature' },
  { id: 'job_boards', label: 'Job Boards' },
  { id: 'user_preferences', label: 'User Preferences' },
  { id: 'allocated_credits', label: 'Allocated Credits' },
  { id: 'social_accounts', label: 'Social Accounts' },
  { id: 'email_integration', label: 'Email Integration' },
];

export default function ViewProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'email_integration';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { data: session } = useSession();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/view-profile?tab=${tabId}`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900/50">
      
      {/* Profile Header (Mimics CEIPAL Blue Banner & Info) */}
      <div className="w-full bg-white dark:bg-slate-800 border-b shadow-sm mb-6 pb-6 pt-6">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-500 text-white rounded flex items-center justify-center text-xl font-bold uppercase shadow-sm">
              {session?.user?.name ? session.user.name.charAt(0) : 'A'}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {session?.user?.name || "Abhinav Mohanty"} 
                <span className="text-sm font-normal text-slate-500">- Administrator</span>
              </h1>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">EMPLOYEE ID</span>
              <span className="text-blue-600 font-medium">N/A</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">EMAIL</span>
              <span className="text-blue-600 font-medium">{session?.user?.email || "abhinav.m@enfycon.com"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">OFFICE NUMBER</span>
              <span className="text-blue-600 font-medium">2164356882</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">REPORTING TO</span>
              <span className="text-blue-600 font-medium">N/A</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">TEAM</span>
              <span className="text-blue-600 font-medium">N/A</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WORK LOCATION</span>
              <span className="text-blue-600 font-medium">N/A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="max-w-[1400px] w-full mx-auto px-6">
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-medium border rounded transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="bg-white dark:bg-slate-800 rounded-md border shadow-sm p-6 mb-12">
          {activeTab === 'email_integration' && <EmailIntegrationTab />}
          
          {activeTab !== 'email_integration' && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <p>This tab is currently under construction.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
