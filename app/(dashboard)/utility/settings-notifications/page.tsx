"use client";

import React, { useState } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { useNotifications } from "@/contexts/NotificationContext";
import { SOUND_OPTIONS, SoundPreset, playPresetSound } from "@/lib/audio-synthesizer";
import { Volume2, VolumeX, Bell, Check, Sparkles, Shield, Play, Save } from "lucide-react";
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
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <DashboardBreadcrumb title="Notification Settings" text="Settings" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a4fa0] to-[#0f3470] rounded-xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-amber-400" />
              Notification & Audio Preferences
            </h2>
            <p className="text-white/80 text-sm">
              Customize real-time alert tones, toast popup behavior, and notification subscriptions.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400
              text-neutral-950 font-semibold text-sm transition-all shadow hover:shadow-lg disabled:opacity-50
            "
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Sound Selection Card */}
      <div className="bg-white dark:bg-[#1a233a] rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Notification Chime & Tone
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Choose the tone that plays when a new review request, job assignment, or announcement arrives.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {soundEnabled ? "Sound Enabled" : "Sound Muted"}
            </span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SOUND_OPTIONS.map((opt) => {
            const isSelected = selectedSound === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedSound(opt.id)}
                className={`
                  relative flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all
                  ${
                    isSelected
                      ? "border-[#1a4fa0] bg-[#1a4fa0]/5 dark:bg-[#1a4fa0]/20 shadow-sm"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {opt.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#1a4fa0] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {opt.id !== "MUTE" && (
                  <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-800 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestSound(opt.id);
                      }}
                      className="
                        flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded
                        bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700
                        text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
                      "
                    >
                      <Play className="w-3 h-3 text-primary fill-primary" />
                      <span>Test Sound</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Types & Subscriptions */}
      <div className="bg-white dark:bg-[#1a233a] rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Alert Subscriptions & Popups
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure in-app popups and specific notification channels.
          </p>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                In-App Toast Popups
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Display floating toast banners in the top-right corner on incoming events.
              </p>
            </div>
            <input
              type="checkbox"
              checked={toastEnabled}
              onChange={(e) => setToastEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Job Review & Approval Requests
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Notify when team members submit jobs for your review or when your jobs are approved/rejected.
              </p>
            </div>
            <input
              type="checkbox"
              checked={reviewAlerts}
              onChange={(e) => setReviewAlerts(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                New Job Assignments
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Notify when a newly published job requisition is assigned to you or your recruiting pod.
              </p>
            </div>
            <input
              type="checkbox"
              checked={jobAlerts}
              onChange={(e) => setJobAlerts(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Candidate Screening & Submissions
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Notify when candidate submissions progress through screening or require your feedback.
              </p>
            </div>
            <input
              type="checkbox"
              checked={submissionAlerts}
              onChange={(e) => setSubmissionAlerts(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="
              flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1a4fa0] hover:bg-[#153f80]
              text-white font-semibold text-sm transition-all shadow hover:shadow-md disabled:opacity-50
            "
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
