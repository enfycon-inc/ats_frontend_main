"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/ui/icon";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { Database, Search, UserPlus, CheckCircle2, ShieldAlert, Cpu, Sparkles, RefreshCw } from "lucide-react";

interface DiceCandidate {
  diceId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  jobTitle: string;
  skills: string[];
  workAuthorization: string;
  experienceYears: number;
  lastActive: string;
  summary: string;
  isAlreadyInDb: boolean;
  localCandidateId?: number;
}

export default function DiceIntegrationPage() {
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Settings State
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [dailyViewLimit, setDailyViewLimit] = useState(500);
  const [viewsUsedToday, setViewsUsedToday] = useState(0);
  const [mode, setMode] = useState<"LIVE" | "SANDBOX">("SANDBOX");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiceCandidate[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [activeSearchTab, setActiveSearchTab] = useState<"search" | "settings">("search");

  useEffect(() => {
    loadSettings();
    handleSearch();
  }, []);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await atsApi.integrations.dice.getSettings();
      setClientId(settings.clientId || "");
      setAccountId(settings.accountId || "");
      setIsActive(settings.isActive !== false);
      setDailyViewLimit(settings.dailyViewLimit || 500);
      setViewsUsedToday(settings.viewsUsedToday || 0);
      setMode(settings.mode || "SANDBOX");
    } catch (err: any) {
      console.error("Failed to load Dice settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const updated = await atsApi.integrations.dice.saveSettings({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        accountId: accountId.trim(),
        isActive,
        dailyViewLimit: Number(dailyViewLimit),
      });
      setMode(updated.mode);
      toast.success(`Dice.com API settings updated! Operating in ${updated.mode} mode.`);
      setClientSecret(""); // Clear cleartext secret input
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSearching(true);
      const res = await atsApi.integrations.dice.search({
        q: searchQuery,
        location: locationQuery,
      });
      setSearchResults(res.results || []);
      setTotalFound(res.totalFound || 0);
      setMode(res.mode);
    } catch (err: any) {
      toast.error("Dice candidate search failed: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (candidate: DiceCandidate) => {
    try {
      setImportingId(candidate.diceId);
      const res = await atsApi.integrations.dice.importCandidate(candidate.diceId);
      toast.success(res.message || `Imported ${candidate.fullName} into candidate pool!`);
      
      // Update local state to mark as imported
      setSearchResults((prev) =>
        prev.map((item) =>
          item.diceId === candidate.diceId ? { ...item, isAlreadyInDb: true } : item
        )
      );
      setViewsUsedToday((prev) => prev + 1);
    } catch (err: any) {
      toast.error("Failed to import candidate: " + err.message);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              Job Board Integration
            </span>
            <Badge className={mode === "LIVE" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}>
              {mode === "LIVE" ? "Live OAuth 2.0 API Active" : "Sandbox / Demo Mode"}
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-red-500" />
            Dice.com Talent Sourcing & Job Syndication
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Search Dice’s premier US IT resume database, view profile details, and 1-click import candidates directly into your ATS pool with automated de-duplication.
          </p>
        </div>

        {/* View Meter & Mode Badge */}
        <div className="z-10 bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Daily View Credits Used</div>
            <div className="text-xl font-black text-white">
              {viewsUsedToday} <span className="text-xs font-normal text-slate-400">/ {dailyViewLimit}</span>
            </div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
            {Math.round((viewsUsedToday / dailyViewLimit) * 100)}%
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 h-48 w-48 bg-red-600/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSearchTab("search")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSearchTab === "search"
              ? "border-red-600 text-red-600 dark:text-red-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Search className="h-4 w-4" />
          Dice Resume Search ({totalFound})
        </button>
        <button
          onClick={() => setActiveSearchTab("settings")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSearchTab === "settings"
              ? "border-red-600 text-red-600 dark:text-red-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Cpu className="h-4 w-4" />
          API Credentials & Settings
        </button>
      </div>

      {/* ── TAB 1: RESUME SEARCH & SOURCING WORKSPACE ─────────────────── */}
      {activeSearchTab === "search" && (
        <div className="space-y-4">
          {/* Search Toolbar */}
          <Card className="border border-neutral-200 dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Search title, skills (e.g. React, Java, DevOps)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
                <div className="w-full md:w-64 relative">
                  <Input
                    placeholder="Location (e.g. Dallas, TX, Remote)..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={searching}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-6 flex items-center gap-2"
                >
                  {searching ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search Dice Resumes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Mode Indicator Banner */}
          {mode === "SANDBOX" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Sandbox / Demo Mode Active</strong>: Displaying simulated Dice candidate sourcing search results. Enter live Enterprise keys under <strong>API Credentials</strong> to connect to live Dice OAuth 2.0 API.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSearchTab("settings")}
                className="text-[11px] font-bold border-amber-300 text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 shrink-0"
              >
                Configure Keys
              </Button>
            </div>
          )}

          {/* Results Grid */}
          <div className="space-y-3">
            {searchResults.map((cand) => (
              <Card
                key={cand.diceId}
                className="border border-neutral-200 dark:border-slate-800 hover:border-red-500/30 transition-all shadow-2xs bg-white dark:bg-slate-900"
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {cand.fullName}
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-bold border-neutral-300">
                        {cand.jobTitle}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold border border-blue-200">
                        {cand.workAuthorization}
                      </Badge>
                      {cand.isAlreadyInDb && (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Already in Database
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-slate-300 max-w-2xl">
                      {cand.summary}
                    </p>

                    {/* Skill Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {cand.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-neutral-500 dark:text-slate-400 pt-1">
                      <span>📍 {cand.location}</span>
                      <span>💼 {cand.experienceYears} Years Experience</span>
                      <span>🕒 Active {cand.lastActive}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {cand.isAlreadyInDb ? (
                      <Button
                        disabled
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold border-emerald-300 text-emerald-700 bg-emerald-50/50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Imported
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={importingId === cand.diceId}
                        onClick={() => handleImport(cand)}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5"
                      >
                        {importingId === cand.diceId ? (
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            1-Click Import CV
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: API CREDENTIALS & SETTINGS ─────────────────────────── */}
      {activeSearchTab === "settings" && (
        <Card className="border border-neutral-200 dark:border-slate-800 max-w-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-red-600" />
              Configure Dice Enterprise API Credentials
            </CardTitle>
            <CardDescription className="text-xs">
              Enter your agency’s official Dice API keys to enable Live OAuth 2.0 candidate searching & job posting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-800/40 rounded-lg border border-neutral-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Enable Dice Integration</div>
                  <div className="text-[11px] text-neutral-500">Enable candidate search & job syndication for this workspace</div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">Dice Client ID</label>
                <Input
                  placeholder="e.g. dice_client_live_891041"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">Dice Client Secret</label>
                <Input
                  type="password"
                  placeholder="Enter secret key..."
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">Dice Account / Group ID</label>
                <Input
                  placeholder="e.g. ACC-DICE-99410"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">Daily View Credit Limit</label>
                <Input
                  type="number"
                  placeholder="500"
                  value={dailyViewLimit}
                  onChange={(e) => setDailyViewLimit(parseInt(e.target.value, 10) || 500)}
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  {savingSettings ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Credentials & Update Mode
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
