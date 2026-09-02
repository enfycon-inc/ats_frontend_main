"use client";

import React, { useState } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { useNotifications } from "@/contexts/NotificationContext";
import { SOUND_OPTIONS, SoundPreset, playPresetSound } from "@/lib/audio-synthesizer";
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  Check, 
  Sparkles, 
  Play, 
  Save, 
  Radio, 
  CheckCircle2, 
  Layers, 
  Briefcase, 
  Users, 
  Megaphone, 
  ShieldCheck, 
  Info,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";

export default function NotificationSettingsPage() {
  const { settings, updateSettings } = useNotifications();

  const [selectedSound, setSelectedSound] = useState<SoundPreset>(settings.soundPreset || "CLASSIC_CHIME");
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [toastEnabled, setToastEnabled] = useState(settings.toastEnabled);
  const [jobAlerts, setJobAlerts] = useState(settings.jobAlerts);
  const [reviewAlerts, setReviewAlerts] = useState(settings.reviewAlerts);
  const [submissionAlerts, setSubmissionAlerts] = useState(settings.submissionAlerts);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestSound = (preset: SoundPreset) => {
    playPresetSound(preset, 0.7);
  };

  const handleTestToast = () => {
    if (soundEnabled && selectedSound !== "MUTE") {
      playPresetSound(selectedSound, 0.7);
    }
    toast.success("Sample Notification: Candidate submitted to Senior DevOps Engineer", {
      icon: "🔔",
      duration: 4000,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        soundPreset: selectedSound,
        soundEnabled,
        toastEnabled,
        jobAlerts,
        reviewAlerts,
        submissionAlerts,
      });
      toast.success("Notification preferences saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <DashboardBreadcrumb title="Sound & Tone Preferences" text="Settings" />

      {/* ─── ENTERPRISE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              Sound & Tone Preferences
              <Badge variant="outline" className="text-[11px] font-normal border-blue-200 dark:border-blue-900/50 text-[#1a4fa0] dark:text-blue-300">
                User Preferences
              </Badge>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Configure real-time audio alert synthesizers, in-app toast popups, and event notification subscriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestToast}
            className="text-xs font-semibold h-9 px-3.5 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-[#1a4fa0] hover:text-white hover:border-[#1a4fa0] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Preview Alert
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#1a4fa0] hover:bg-[#153f80] text-white text-xs font-semibold px-4 py-2 h-9 rounded-lg shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>

      {/* ─── SECTION 1: AUDIO CHIME & SYNTHESIZER ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50 dark:bg-slate-900/50">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#1a4fa0] dark:text-blue-400" />
              Audio Chime & Tone Synthesizer
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Web Audio API real-time synthesis engine (instant playback without external audio downloads).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-slate-700">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {soundEnabled ? "Audio Enabled" : "Audio Muted"}
            </span>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SOUND_OPTIONS.map((opt) => {
              const isSelected = selectedSound === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedSound(opt.id)}
                  className={`
                    relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all
                    ${
                      isSelected
                        ? "border-[#1a4fa0] bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-[#1a4fa0]/40 shadow-xs"
                        : "border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isSelected ? "text-[#1a4fa0] dark:text-blue-400" : "text-neutral-900 dark:text-neutral-100"}`}>
                          {opt.name}
                        </span>
                        {opt.id === "MUTE" ? (
                          <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                        {opt.description}
                      </p>
                    </div>

                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all
                      ${isSelected ? "bg-[#1a4fa0] border-[#1a4fa0] text-white" : "border-neutral-300 dark:border-slate-700"}
                    `}>
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </div>

                  {opt.id !== "MUTE" && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                        <Activity className="w-3 h-3 text-[#1a4fa0]" /> Synth Live
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestSound(opt.id);
                        }}
                        className="h-7 px-3 text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-[#1a4fa0] hover:text-white dark:hover:bg-[#1a4fa0] dark:hover:text-white hover:border-[#1a4fa0] transition-all cursor-pointer shadow-none"
                      >
                        <Play className="w-3 h-3 mr-1 fill-current" />
                        Test
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: NOTIFICATION CHANNELS & POPUPS ───────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1a4fa0] dark:text-blue-400" />
            Display Channels & Desktop Popups
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Control visual toast popups and on-screen alert overlays.
          </p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50/30 dark:bg-slate-800/30">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                In-App Toast Banners
                <Badge variant="outline" className="text-[10.5px] font-normal bg-blue-50/60 dark:bg-blue-950/40 text-[#1a4fa0] dark:text-blue-300 border-blue-200 dark:border-blue-900">
                  Visual Overlay
                </Badge>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Display animated floating toast alerts in the top-right corner whenever a new activity event is received.
              </p>
            </div>
            <Switch
              checked={toastEnabled}
              onCheckedChange={setToastEnabled}
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: EVENT SUBSCRIPTIONS ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1a4fa0] dark:text-blue-400" />
            Operational Event Subscriptions
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Select which recruitment events trigger audio notifications and toast banners for your account.
          </p>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-slate-800">
          {/* Subscription 1 */}
          <div className="p-5 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/40 shrink-0 mt-0.5">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Job Review & Approval Workflow
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Notify when team members submit requisitions for your approval or when your pending jobs are approved/rejected.
                </p>
              </div>
            </div>
            <Switch
              checked={reviewAlerts}
              onCheckedChange={setReviewAlerts}
            />
          </div>

          {/* Subscription 2 */}
          <div className="p-5 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40 shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Job Assignments & Pod Distribution
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Notify when a newly activated job requisition is routed to your recruitment pod or assigned directly to you.
                </p>
              </div>
            </div>
            <Switch
              checked={jobAlerts}
              onCheckedChange={setJobAlerts}
            />
          </div>

          {/* Subscription 3 */}
          <div className="p-5 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40 shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Candidate Screening & Pipeline Progression
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Notify when candidate submittals advance through internal screening (L1, L2, L3 rounds) or receive client feedback.
                </p>
              </div>
            </div>
            <Switch
              checked={submissionAlerts}
              onCheckedChange={setSubmissionAlerts}
            />
          </div>

          {/* Subscription 4 (Always Active) */}
          <div className="p-5 flex items-center justify-between bg-neutral-50/20 dark:bg-slate-800/20">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800/40 shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    System Broadcasts & Announcements
                  </p>
                  <Badge variant="outline" className="text-[10px] text-neutral-500 font-normal">
                    Mandatory
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Important company-wide and branch-wide administrative notices dispatched by system administrators.
                </p>
              </div>
            </div>
            <Switch
              checked={true}
              disabled={true}
            />
          </div>
        </div>

        <div className="p-6 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Info className="w-4 h-4 text-neutral-400" />
            <span>Preferences are stored in your user profile and persist across devices.</span>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#1a4fa0] hover:bg-[#153f80] text-white text-xs font-semibold px-6 py-2 h-9 rounded-lg shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
