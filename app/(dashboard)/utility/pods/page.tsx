"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

interface PodMember {
  id: string;
  fullName: string;
  email: string;
  systemRole: string;
}

interface Pod {
  id: string;
  name: string;
  podHeadId: string | null;
  podHeadName: string | null;
  description: string | null;
  isAvailableForAssignment: boolean;
  members: PodMember[];
  jobsCount: number;
  createdAt: string;
}

type PanelMode = "create" | "edit" | null;

export default function PodsPage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pods, setPods] = useState<Pod[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [activeView, setActiveView] = useState<"all" | "cycle">("all");

  // Right-panel state
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);

  // Form fields
  const [podName, setPodName] = useState("");
  const [podHeadId, setPodHeadId] = useState("");
  const [podDescription, setPodDescription] = useState("");
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);

  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const canAccess =
      user?.roles?.includes("ADMIN") ||
      user?.roles?.includes("SUPER_ADMIN") ||
      user?.permissions?.includes("pod:view") ||
      user?.permissions?.includes("user:manage");

    setHasAccess(!!canAccess);
    if (canAccess) loadData();
    else setLoading(false);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [podsData, availRecruitersData, usersData] = await Promise.all([
        atsApi.pods.list(),
        atsApi.pods.getAvailableRecruiters(),
        atsApi.auth.listUsers(),
      ]);
      setPods(podsData);
      setAvailableRecruiters(availRecruitersData);
      setAllUsers(usersData.filter((u: any) => u.isActive));
    } catch (err: any) {
      toast.error("Failed to load recruitment pods: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreatePanel = () => {
    setPodName("");
    setPodHeadId("");
    setPodDescription("");
    setSelectedRecruiterIds([]);
    setSelectedPod(null);
    setPanelMode("create");
  };

  const openEditPanel = (pod: Pod) => {
    setSelectedPod(pod);
    setPodName(pod.name);
    setPodHeadId(pod.podHeadId || "");
    setPodDescription(pod.description || "");
    setSelectedRecruiterIds(pod.members.map((m) => m.id));
    setPanelMode("edit");
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedPod(null);
  };

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podName.trim()) return toast.error("Please provide a pod name.");
    try {
      setSubmitting(true);
      await atsApi.pods.create({
        name: podName.trim(),
        podHeadId: podHeadId || undefined,
        description: podDescription.trim() || undefined,
        recruiterIds: selectedRecruiterIds,
      });
      toast.success(`Recruitment pod "${podName}" created successfully!`);
      closePanel();
      await loadData();
    } catch (err: any) {
      toast.error("Failed to create pod: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPod) return;
    if (!podName.trim()) return toast.error("Please provide a pod name.");
    try {
      setSubmitting(true);
      await atsApi.pods.update(selectedPod.id, {
        name: podName.trim(),
        podHeadId: podHeadId || null,
        description: podDescription.trim() || null,
        recruiterIds: selectedRecruiterIds,
      });
      toast.success(`Recruitment pod "${podName}" updated successfully!`);
      closePanel();
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update pod: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePod = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the pod "${name}"? Members will be unassigned.`)) return;
    try {
      setSubmitting(true);
      await atsApi.pods.delete(id);
      toast.success(`Pod "${name}" deleted successfully.`);
      if (selectedPod?.id === id) closePanel();
      await loadData();
    } catch (err: any) {
      toast.error("Failed to delete pod: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRR = async () => {
    if (!confirm("Reset the round-robin cycle? All pods will become available for assignment again.")) return;
    try {
      setSubmitting(true);
      await atsApi.pods.resetCycle();
      toast.success("Round-robin cycle reset successfully!");
      await loadData();
    } catch (err: any) {
      toast.error("Failed to reset cycle: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecruiter = (id: string) => {
    setSelectedRecruiterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Loading / No-access states ──────────────────────────────────────
  if (loading) {
    return (
      <div>
        <SiteBreadcrumb />
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          <p className="mt-4 text-sm text-default-500 font-semibold">Loading Recruitment Pods…</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div>
        <SiteBreadcrumb />
        <Card className="border border-red-500/20 bg-red-950/10 max-w-2xl mx-auto mt-10">
          <div className="p-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-red-500/10 text-red-500 items-center justify-center text-2xl mb-4">
              <Icon icon="heroicons:shield-exclamation" />
            </div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
            <p className="text-sm text-default-600">Only workspace Administrators or Delivery Heads can view and manage recruitment teams (pods).</p>
          </div>
        </Card>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────
  const recruiterUsersForHead = allUsers.filter(
    (u) => u.roleName === "RECRUITER" || u.roles?.includes("RECRUITER") || u.roles?.includes("POD_LEAD")
  );

  // For edit panel: combine available + existing members
  const recruitersForPanel = [...availableRecruiters];
  if (panelMode === "edit" && selectedPod) {
    selectedPod.members.forEach((m) => {
      if (!recruitersForPanel.some((r) => r.id === m.id)) {
        recruitersForPanel.push({ id: m.id, fullName: m.fullName, email: m.email, roleName: m.systemRole });
      }
    });
  }

  const totalPodsCount = pods.length;
  const availablePodsCount = pods.filter((p) => p.isAvailableForAssignment).length;
  const usedPodsCount = pods.filter((p) => !p.isAvailableForAssignment).length;
  const cycleProgressPercent = totalPodsCount > 0 ? Math.round((usedPodsCount / totalPodsCount) * 100) : 0;

  const panelOpen = panelMode !== null;

  return (
    <div className="relative min-h-screen">
      {/* ── Main content area (shrinks when panel is open) ── */}
      <div className={`transition-all duration-300 ${panelOpen ? "pr-[440px]" : ""}`}>
        <SiteBreadcrumb />

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-default-100 pb-5 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-default-900 flex items-center gap-2">
              <Icon icon="heroicons:users" className="text-indigo-600 h-7 w-7" />
              Recruitment Pods Management
            </h1>
            <p className="text-sm text-default-600 mt-1">
              Create recruitment teams, assign heads, and review round-robin job assignment routing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleResetRR}
              disabled={submitting}
              variant="outline"
              className="flex items-center gap-1.5 border-default-300 font-semibold text-sm"
            >
              <Icon icon="heroicons:arrow-path" className="h-4 w-4" />
              Reset Cycle
            </Button>
            <Button
              onClick={openCreatePanel}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm text-sm"
            >
              <Icon icon="heroicons:plus" className="h-4 w-4" />
              Create Pod
            </Button>
          </div>
        </div>

        {/* VIEW TABS */}
        <div className="flex border-b border-default-200 mt-4">
          {(["all", "cycle"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`flex items-center gap-1.5 px-5 py-2.5 border-b-2 text-xs uppercase tracking-wider font-bold transition cursor-pointer ${
                activeView === tab
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-default-500 hover:text-default-800"
              }`}
            >
              <Icon
                icon={tab === "all" ? "heroicons:list-bullet" : "heroicons:arrow-path-20-solid"}
                className="h-4 w-4"
              />
              {tab === "all" ? "All Pods" : "Assignment Cycle Status"}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════
            TAB 1 — ALL PODS TABLE
            ═══════════════════════════════════════ */}
        {activeView === "all" ? (
          <Card className="border border-default-150 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-xl mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50/50 dark:bg-slate-800/20 border-b border-default-150">
                    {["Pod Name", "Pod Lead", "Recruiters", "Jobs Assigned", "Status", "Actions"].map((h) => (
                      <th key={h} className={`py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-default-600 ${h === "Actions" ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100 text-xs">
                  {pods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-default-500 font-semibold italic">
                        <div className="flex flex-col items-center gap-3">
                          <Icon icon="heroicons:users" className="h-10 w-10 text-default-300" />
                          <span>No recruitment pods configured yet. Click <strong>Create Pod</strong> to get started.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pods.map((pod) => (
                      <tr
                        key={pod.id}
                        className={`hover:bg-indigo-50/30 dark:hover:bg-slate-800/10 transition-colors ${
                          selectedPod?.id === pod.id ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""
                        }`}
                      >
                        {/* Pod Name */}
                        <td className="py-4 px-4 font-bold text-default-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${pod.isAvailableForAssignment ? "bg-emerald-500" : "bg-pink-500"}`} />
                            <div>
                              <div>{pod.name}</div>
                              {pod.description && (
                                <div className="text-[10px] text-default-450 font-normal mt-0.5 max-w-[180px] truncate">{pod.description}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Pod Lead */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {pod.podHeadName ? (
                            <div>
                              <div className="font-bold text-default-900">{pod.podHeadName}</div>
                              <div className="text-[10px] text-indigo-500 font-semibold">POD LEAD</div>
                            </div>
                          ) : (
                            <span className="text-default-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        {/* Recruiters */}
                        <td className="py-4 px-4">
                          {pod.members.length === 0 ? (
                            <span className="text-default-400 italic text-[11px]">No members</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {pod.members.slice(0, 3).map((m) => (
                                <Badge key={m.id} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] px-1.5 py-0.5 border-0 font-semibold">
                                  {m.fullName.split(" ")[0]}
                                </Badge>
                              ))}
                              {pod.members.length > 3 && (
                                <Badge className="bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 border-0 font-bold">
                                  +{pod.members.length - 3}
                                </Badge>
                              )}
                              <div className="w-full text-[9px] text-default-400 mt-0.5">{pod.members.length} member{pod.members.length !== 1 ? "s" : ""}</div>
                            </div>
                          )}
                        </td>

                        {/* Jobs */}
                        <td className="py-4 px-4">
                          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 border-0 font-bold px-2 py-1">
                            {pod.jobsCount} jobs
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <Badge className={`text-[9px] uppercase tracking-wider font-bold border-0 px-2 py-1 ${
                            pod.isAvailableForAssignment
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            {pod.isAvailableForAssignment ? "Available" : "Used"}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditPanel(pod)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Edit pod"
                            >
                              <Icon icon="heroicons:pencil-square" className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePod(pod.id, pod.name)}
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete pod"
                            >
                              <Icon icon="heroicons:trash" className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* ═══════════════════════════════════════
             TAB 2 — CYCLE STATUS DASHBOARD
             ═══════════════════════════════════════ */
          <div className="space-y-6 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Pods", value: totalPodsCount, icon: "heroicons:users", color: "indigo" },
                { label: "Available", value: availablePodsCount, icon: "heroicons:check-circle", color: "emerald" },
                { label: "Used This Cycle", value: usedPodsCount, icon: "heroicons:clock", color: "amber" },
                { label: "Cycle Progress", value: `${cycleProgressPercent}%`, icon: "heroicons:arrow-path-20-solid", color: "pink" },
              ].map(({ label, value, icon, color }) => (
                <Card key={label} className={`border border-default-150 bg-white dark:bg-slate-900 p-4 flex items-center gap-3 shadow-xs`}>
                  <div className={`h-10 w-10 rounded-lg bg-${color}-50 text-${color}-600 dark:bg-${color}-950/20 dark:text-${color}-400 flex items-center justify-center text-lg shrink-0`}>
                    <Icon icon={icon} />
                  </div>
                  <div>
                    <div className="text-[10px] text-default-450 font-bold uppercase tracking-wider">{label}</div>
                    <div className={`text-xl font-bold text-${color === "indigo" ? "default-900" : color + "-600"} mt-0.5`}>{value}</div>
                  </div>
                </Card>
              ))}
            </div>

            {cycleProgressPercent === 100 && (
              <div className="border border-red-200 bg-red-50/30 p-3 rounded-lg text-xs text-red-700 font-bold flex items-center gap-2">
                <Icon icon="heroicons:exclamation-triangle" className="h-5 w-5 shrink-0" />
                Cycle Complete — All pods have been used. Click "Reset Cycle" to start a new round.
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-default-800 uppercase tracking-wider mb-3">Pod Slot Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pods.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-default-500 italic">No pods configured.</div>
                ) : (
                  pods.map((pod, idx) => (
                    <Card key={pod.id} className="border border-default-150 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-[10px] text-default-400 font-bold uppercase tracking-wider">Pod {idx + 1}</div>
                          <div className="text-sm font-bold text-default-900 mt-0.5">{pod.name}</div>
                        </div>
                        <Badge className={`text-[9px] uppercase font-bold border-0 px-2 py-0.5 ${
                          pod.isAvailableForAssignment
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {pod.isAvailableForAssignment ? "Available" : "Used"}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-xs text-default-600">
                        <div className="flex justify-between py-1 border-b border-default-100">
                          <span>Pod Lead</span>
                          <span className="font-bold text-default-900">{pod.podHeadName || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-default-100">
                          <span>Recruiters</span>
                          <span className="font-bold text-default-900">{pod.members.length}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Jobs Assigned</span>
                          <span className="font-bold text-indigo-600">{pod.jobsCount}</span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT SIDE PANEL — Create / Edit Pod
          ═══════════════════════════════════════════════════ */}
      {/* Backdrop overlay (subtle) */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/10"
          onClick={closePanel}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[430px] bg-white dark:bg-slate-900 border-l border-default-200 shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default-150 shrink-0 bg-default-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Icon icon={panelMode === "create" ? "heroicons:plus" : "heroicons:pencil"} className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-default-900">
                {panelMode === "create" ? "Create New Pod" : `Edit Pod`}
              </h2>
              {panelMode === "edit" && selectedPod && (
                <p className="text-[11px] text-default-500 font-medium">{selectedPod.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={closePanel}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-default-500 hover:text-default-800 hover:bg-default-100 transition cursor-pointer"
          >
            <Icon icon="heroicons:x-mark" className="h-5 w-5" />
          </button>
        </div>

        {/* Panel Form — scrollable body */}
        <form
          onSubmit={panelMode === "create" ? handleCreatePod : handleUpdatePod}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Pod Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-default-800 block">
                Pod Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Engineering Pod Alpha"
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {/* Pod Lead */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-default-800 block">Assign Pod Lead</label>
              <select
                value={podHeadId}
                onChange={(e) => setPodHeadId(e.target.value)}
                className="w-full text-sm border border-default-250 dark:border-slate-700 rounded-md px-3 py-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">— None (Unassigned) —</option>
                {recruiterUsersForHead.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.roleName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-default-450 leading-relaxed">
                💡 Selecting a Pod Lead automatically upgrades their role to <strong>POD_LEAD</strong>. Removing them reverts them to a standard Recruiter.
              </p>
            </div>

            {/* Recruiters */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-default-800">Assign Recruiters</label>
                <span className="text-[10px] text-default-450 font-semibold">{selectedRecruiterIds.length} selected</span>
              </div>

              {panelMode === "create" && availableRecruiters.length === 0 ? (
                <div className="border border-dashed border-default-200 rounded-lg p-4 text-center text-[11px] text-default-400 italic">
                  No unassigned recruiters available.
                </div>
              ) : (
                <div className="border border-default-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {(panelMode === "create" ? availableRecruiters : recruitersForPanel).map((r, idx) => {
                    const isChecked = selectedRecruiterIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRecruiter(r.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          idx !== 0 ? "border-t border-default-100 dark:border-slate-700/50" : ""
                        } ${isChecked ? "bg-indigo-50/60 dark:bg-indigo-950/20" : "hover:bg-default-50/60"}`}
                      >
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-default-300 bg-white dark:bg-slate-800"
                        }`}>
                          {isChecked && <Icon icon="heroicons:check" className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-default-900 truncate">{r.fullName}</div>
                          <div className="text-[10px] text-default-450 truncate">{r.email}</div>
                        </div>
                        <Badge className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 font-semibold shrink-0">
                          {r.roleName}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-default-400">Select one or more recruiters to join this pod (max 10).</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-default-800 block">Pod Description</label>
              <textarea
                placeholder="Optional — describe this pod's focus, goals, or specialization..."
                value={podDescription}
                onChange={(e) => setPodDescription(e.target.value)}
                className="w-full text-sm border border-default-250 dark:border-slate-700 rounded-md px-3 py-2 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none"
                rows={4}
              />
            </div>

            {/* Edit-only: danger zone */}
            {panelMode === "edit" && selectedPod && (
              <div className="border border-red-200 dark:border-red-900/30 rounded-lg p-4 bg-red-50/30 dark:bg-red-950/10">
                <div className="text-xs font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                  <Icon icon="heroicons:exclamation-triangle" className="h-4 w-4" />
                  Danger Zone
                </div>
                <p className="text-[11px] text-red-600 dark:text-red-400/80 mb-3">
                  Deleting a pod will unassign all its members and remove all job assignments.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeletePod(selectedPod.id, selectedPod.name)}
                  disabled={submitting}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-bold"
                >
                  <Icon icon="heroicons:trash" className="h-3.5 w-3.5 mr-1" />
                  Delete This Pod
                </Button>
              </div>
            )}
          </div>

          {/* Panel Footer — always visible at bottom */}
          <div className="shrink-0 border-t border-default-150 bg-default-50/60 dark:bg-slate-800/40 px-6 py-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closePanel}
              disabled={submitting}
              className="font-semibold text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !podName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 shadow-sm"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {panelMode === "create" ? "Creating…" : "Saving…"}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Icon icon={panelMode === "create" ? "heroicons:plus" : "heroicons:check"} className="h-3.5 w-3.5" />
                  {panelMode === "create" ? "Create Pod" : "Save Changes"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
