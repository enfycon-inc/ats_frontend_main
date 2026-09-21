"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Globe, Key, Mail, Video, ArrowRight, CheckCircle2, Sparkles, Cpu } from "lucide-react";
import Link from "next/link";

interface IntegrationCardProps {
  title: string;
  category: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  status: "ACTIVE" | "AVAILABLE" | "COMING_SOON";
  href?: string;
  actionText?: string;
}

function IntegrationCard({
  title,
  category,
  description,
  icon: IconComponent,
  iconBg,
  iconColor,
  status,
  href,
  actionText = "Configure Integration",
}: IntegrationCardProps) {
  return (
    <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className={`h-11 w-11 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} shrink-0 shadow-xs`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            {status === "ACTIVE" ? (
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Connected
              </Badge>
            ) : status === "AVAILABLE" ? (
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold border border-blue-200">
                Ready to Connect
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-neutral-400 border-neutral-300">
                Coming Soon
              </Badge>
            )}
          </div>
        </div>
        <div className="pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">{category}</span>
          <CardTitle className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">{title}</CardTitle>
          <CardDescription className="text-xs text-neutral-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2 border-t border-neutral-100 dark:border-slate-800/80 mt-auto flex items-center justify-between">
        <span className="text-[11px] text-neutral-400 font-medium">Enterprise Integration</span>
        {href ? (
          <Link href={href}>
            <Button size="sm" className="h-8 text-xs font-bold bg-neutral-900 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 flex items-center gap-1">
              {actionText} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : (
          <Button size="sm" disabled variant="outline" className="h-8 text-xs font-semibold">
            Planned
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsHubPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              SaaS Ecosystem Hub
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Cpu className="h-6 w-6 text-indigo-400" />
            Integrations & Partner Marketplace
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Connect your ATS workspace with job boards, identity providers, video interviewing suites, and mass outreach tools.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <Link href="/integrations/dice">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg">
              <Database className="h-4 w-4" /> Open Dice.com Workspace →
            </Button>
          </Link>
        </div>

        <div className="absolute -right-10 -bottom-10 h-48 w-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dice.com */}
        <IntegrationCard
          title="Dice.com Sourcing & Jobs"
          category="US IT Job Board"
          description="Search Dice’s premier US IT resume database, view profiles, and 1-click import candidates directly into your ATS candidate pool."
          icon={Database}
          iconBg="bg-red-50 dark:bg-red-950/40"
          iconColor="text-red-600"
          status="ACTIVE"
          href="/integrations/dice"
          actionText="Open Dice Sourcing Workspace"
        />

        {/* Keycloak SSO */}
        <IntegrationCard
          title="Keycloak OIDC & SSO"
          category="Identity & Access (IAM)"
          description="Enterprise single sign-on (SSO) supporting Microsoft Azure AD, Google Workspace, and SAML 2.0 multi-tenant authentication."
          icon={Key}
          iconBg="bg-indigo-50 dark:bg-indigo-950/40"
          iconColor="text-indigo-600"
          status="ACTIVE"
          href="/company"
          actionText="Manage Identity Settings"
        />

        {/* Mass Mail & Outreach */}
        <IntegrationCard
          title="Mass Mail & Campaign Outreach"
          category="Communication"
          description="Integrated SMTP email marketing engine with automatic rate limits, tracking metrics, and candidate email templates."
          icon={Mail}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-600"
          status="ACTIVE"
          href="/email"
          actionText="Open Email Campaigns"
        />

        {/* Video Interviewing */}
        <IntegrationCard
          title="Zoom & Google Meet Scheduling"
          category="Interviewing"
          description="Auto-generate calendar invite links and video interview meeting rooms when scheduling candidate interviews."
          icon={Video}
          iconBg="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600"
          status="AVAILABLE"
          href="/calendar"
          actionText="Schedule Interview"
        />

        {/* LinkedIn Recruiter */}
        <IntegrationCard
          title="LinkedIn Recruiter Connect"
          category="Social Sourcing"
          description="Sync candidate messages, InMails, and candidate profile links directly into your ATS talent pipeline."
          icon={Globe}
          iconBg="bg-sky-50 dark:bg-sky-950/40"
          iconColor="text-sky-600"
          status="COMING_SOON"
        />
      </div>
    </div>
  );
}
