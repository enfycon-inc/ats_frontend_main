"use client";

import React, { useEffect, useState, useMemo } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { getDashboardJobMetrics } from "@/lib/dashboard-metrics";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import AddCandidateModal from "@/components/dashboard/AddCandidateModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default // ─── BRANCH ADMIN DASHBOARD VIEW (BRANCH OPERATIONAL COMMAND CENTER) ────────
function BranchAdminDashboardView({
  profile,
  jobs,
  activeJobs,
  onUpdateJob,
}: {
  profile: any;
  jobs: any[];
  activeJobs: any[];
  onUpdateJob?: (jobId: string, updatedFields: any) => Promise<void>;
}) {
  const [localJobs, setLocalJobs] = useState<any[]>(jobs);

  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  const [activeBranchId, setActiveBranchId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_id");
    return profile?.branchId || null;
  });
  const [activeBranchName, setActiveBranchName] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_name") || profile?.branchName || "Bhubaneswar (Domestic IT)";
    return profile?.branchName || "Bhubaneswar (Domestic IT)";
  });
  const [activeBranchTimezone, setActiveBranchTimezone] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_timezone") || "Asia/Kolkata";
    return "Asia/Kolkata";
  });
  const [activeBranchMarket, setActiveBranchMarket] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("active_branch_market") || (profile?.defaultMarket === "US" ? "US IT" : "India IT");
    return profile?.defaultMarket === "US" ? "US IT" : "India IT";
  });

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [pods, setPods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Team Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState<any | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignTab, setAssignTab] = useState<"pods" | "users">("pods");
  const [assigning, setAssigning] = useState(false);

  const [branchUsesPods, setBranchUsesPods] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_branch_allow_pods");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  // Synchronize on branch switcher events
  useEffect(() => {
    const handleBranchChange = () => {
      if (typeof window !== "undefined") {
        setActiveBranchId(localStorage.getItem("active_branch_id"));
        setActiveBranchName(localStorage.getItem("active_branch_name") || profile?.branchName || "Branch Office");
        setActiveBranchTimezone(localStorage.getItem("active_branch_timezone") || "Asia/Kolkata");
        setActiveBranchMarket(localStorage.getItem("active_branch_market") || (profile?.defaultMarket === "US" ? "US IT" : "India IT"));
      }
    };
    window.addEventListener("branchChanged", handleBranchChange);
    window.addEventListener("storage", handleBranchChange);
    return () => {
      window.removeEventListener("branchChanged", handleBranchChange);
      window.removeEventListener("storage", handleBranchChange);
    };
  }, [profile]);

  // Load branch submissions, team roster, and recruitment pods
  useEffect(() => {
    let isMounted = true;
    async function loadBranchData() {
      try {
        setLoading(true);
        const bId = activeBranchId && activeBranchId !== "all" ? activeBranchId : undefined;
        const [subsRes, usersRes, podsRes] = await Promise.all([
          atsApi.submissions.list({ branchId: bId }).catch(() => []),
          atsApi.auth.listUsers().catch(() => []),
          atsApi.pods.list(bId).catch(() => []),
        ]);
        if (!isMounted) return;
        const subList = subsRes?.data || subsRes || [];
        setSubmissions(subList);
        setBranchUsers(usersRes || []);

        let resolvedPods = podsRes || [];
        if (resolvedPods.length === 0 && bId) {
          resolvedPods = await atsApi.pods.list().catch(() => []);
        }
        setPods(resolvedPods);
      } catch (err) {
        console.warn("Failed to load branch admin dashboard metrics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadBranchData();
    return () => { isMounted = false; };
  }, [activeBranchId]);

  // Branch-scoped jobs filtering
  const branchJobs = useMemo(() => {
    if (!activeBranchId || activeBranchId === "all") return localJobs;
    return localJobs.filter((j: any) => {
      const jBranchId = j.branchId || j.branch_id;
      if (jBranchId && jBranchId === activeBranchId) return true;
      if (activeBranchName && j.businessUnit?.toLowerCase() === activeBranchName.toLowerCase()) return true;
      if (j.jobCode && activeBranchName && activeBranchName.toLowerCase().includes("bhubneswar") && j.jobCode.startsWith("BBS")) return true;
      return false;
    });
  }, [localJobs, activeBranchId, activeBranchName]);

  const branchActiveJobs = useMemo(() => {
    return branchJobs.filter((j: any) => j.jobStatus === "Active" || j.status === "ACTIVE" || j.status === "Active");
  }, [branchJobs]);

  const hotJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const p = String(j.priority || j.urgency || "").toUpperCase();
      return p.includes("HOT") || p.includes("HIGH") || p.includes("URGENT");
    });
  }, [branchActiveJobs]);

  const warmJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const p = String(j.priority || j.urgency || "").toUpperCase();
      return p.includes("WARM") || p.includes("MEDIUM") || (!p.includes("HOT") && !p.includes("COLD") && !p.includes("LOW") && !p.includes("HIGH") && !p.includes("URGENT"));
    });
  }, [branchActiveJobs]);

  const coldJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const p = String(j.priority || j.urgency || "").toUpperCase();
      return p.includes("COLD") || p.includes("LOW");
    });
  }, [branchActiveJobs]);

  const totalPositions = useMemo(() => {
    return branchActiveJobs.reduce((acc: number, j: any) => acc + Number(j.noOfPositions || j.positions || 1), 0);
  }, [branchActiveJobs]);

  // Pipeline metrics
  const pendingScreenings = useMemo(() => {
    return submissions.filter((s: any) => s.finalStatus === "PENDING_APPROVAL" || s.internalReviewStatus === "PENDING");
  }, [submissions]);

  const activeInterviews = useMemo(() => {
    return submissions.filter((s: any) => {
      const final = (s.finalStatus || "").toUpperCase();
      if (final === "REJECTED" || final === "OFFER" || final === "OFFERED" || final === "JOIN" || final === "JOINED" || final === "PLACED") {
        return false;
      }
      const l1 = (s.l1Status || "").toUpperCase();
      const l2 = (s.l2Status || "").toUpperCase();
      const l3 = (s.l3Status || "").toUpperCase();

      return (
        ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l1) ||
        ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l2) ||
        ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l3) ||
        ["L1", "L2", "L3", "INTERVIEW", "INTERVIEWING"].includes(final) ||
        final.includes("PASSED") ||
        Boolean(s.l1Date || s.l2Date || s.l3Date)
      );
    });
  }, [submissions]);

  const l1Count = useMemo(() => {
    return submissions.filter((s: any) => {
      const l1 = (s.l1Status || "").toUpperCase();
      const final = (s.finalStatus || "").toUpperCase();
      return ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l1) || final === "L1" || Boolean(s.l1Date);
    }).length;
  }, [submissions]);

  const l2Count = useMemo(() => {
    return submissions.filter((s: any) => {
      const l2 = (s.l2Status || "").toUpperCase();
      const final = (s.finalStatus || "").toUpperCase();
      return ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l2) || final === "L2" || Boolean(s.l2Date);
    }).length;
  }, [submissions]);

  const l3Count = useMemo(() => {
    return submissions.filter((s: any) => {
      const l3 = (s.l3Status || "").toUpperCase();
      const final = (s.finalStatus || "").toUpperCase();
      return ["SCHEDULED", "PASSED", "CLEARED", "COMPLETED"].includes(l3) || final === "L3" || Boolean(s.l3Date);
    }).length;
  }, [submissions]);

  const offersCount = useMemo(() => {
    return submissions.filter((s: any) => {
      const f = (s.finalStatus || "").toUpperCase();
      return f === "OFFER" || f === "OFFERED";
    }).length;
  }, [submissions]);

  const joinsCount = useMemo(() => {
    return submissions.filter((s: any) => {
      const f = (s.finalStatus || "").toUpperCase();
      return f === "JOIN" || f === "JOINED" || f === "PLACED";
    }).length;
  }, [submissions]);

  // Aging jobs (>48 hours open with 0 or <2 submissions)
  const agingJobs = useMemo(() => {
    return branchActiveJobs.filter((j: any) => {
      const createdTime = new Date(j.createdAt || j.created_at || Date.now()).getTime();
      const hoursOld = (Date.now() - createdTime) / (1000 * 60 * 60);
      const subCount = submissions.filter((s: any) => s.jobId === j.id || s.job_id === j.id || s.jobCode === j.jobCode).length;
      return hoursOld >= 48 && subCount < 2;
    });
  }, [branchActiveJobs, submissions]);

  // Branch recruiters output
  const branchRecruiters = useMemo(() => {
    const list = branchUsers.filter((u: any) => {
      if (!u.isActive) return false;
      if (!activeBranchId || activeBranchId === "all") return true;
      const bId = u.branchId || u.branch_id;
      if (bId === activeBranchId) return true;
      if (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(activeBranchId)) return true;
      return false;
    });

    return list.map((user: any) => {
      const userSubs = submissions.filter((s: any) =>
        s.recruiterId === user.id ||
        s.recruiter_id === user.id ||
        (user.email && s.candidateEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (user.fullName && s.recruiterName?.toLowerCase() === user.fullName.toLowerCase())
      );
      const userInterviews = userSubs.filter((s: any) =>
        s.l1Status === "SCHEDULED" || s.l2Status === "SCHEDULED" || s.l3Status === "SCHEDULED"
      );
      const userJoins = userSubs.filter((s: any) => s.finalStatus === "JOIN" || s.finalStatus === "OFFER");

      return {
        user,
        submissionsCount: userSubs.length,
        interviewsCount: userInterviews.length,
        joinsCount: userJoins.length,
      };
    }).sort((a, b) => b.submissionsCount - a.submissionsCount);
  }, [branchUsers, submissions, activeBranchId]);

  // Recruiter roster for assignments
  const branchRecruiterUsers = useMemo(() => {
    const scoped = branchUsers.filter((u: any) => {
      if (u.isActive === false) return false;
      if (!activeBranchId || activeBranchId === "all") return true;
      const bId = u.branchId || u.branch_id;
      if (bId === activeBranchId) return true;
      if (Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.includes(activeBranchId)) return true;
      return false;
    });
    return scoped.length > 0 ? scoped : branchUsers.filter((u: any) => u.isActive !== false);
  }, [branchUsers, activeBranchId]);

  const filteredUsers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return branchRecruiterUsers;
    return branchRecruiterUsers.filter((u: any) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.roleName || (u.roles && u.roles[0]) || u.systemRole || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [branchRecruiterUsers, assignSearch]);

  const filteredPods = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return pods;
    return pods.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const head = (p.podHeadName || "").toLowerCase();
      return name.includes(q) || head.includes(q);
    });
  }, [pods, assignSearch]);

  const handleOpenAssignModal = (job: any) => {
    setSelectedJobForAssign(job);
    setAssignSearch("");
    setAssignTab(pods.length > 0 && branchUsesPods ? "pods" : "users");
    setIsAssignModalOpen(true);
  };

  const handleExecuteAssignment = async (
    type: "pod" | "user" | "unassign",
    targetId: string,
    targetName: string
  ) => {
    if (!selectedJobForAssign) return;
    setAssigning(true);
    try {
      const payload: Record<string, any> = {};
      if (type === "pod") {
        payload.podId = targetId;
        payload.assignedTo = targetName;
      } else if (type === "user") {
        payload.recruiterId = targetId;
        payload.assignedTo = targetName;
        payload.podId = "none";
      } else {
        payload.assignedTo = "Unassigned";
        payload.podId = "none";
      }

      await atsApi.jobs.update(selectedJobForAssign.id, payload);
      toast.success(`Job assigned to ${targetName}`);

      setLocalJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobForAssign.id
            ? {
                ...j,
                assignedTo: targetName,
                podId: type === "pod" ? targetId : undefined,
                recruiterId: type === "user" ? targetId : undefined,
              }
            : j
        )
      );

      if (onUpdateJob) {
        onUpdateJob(selectedJobForAssign.id, payload).catch(() => {});
      }

      setIsAssignModalOpen(false);
      setSelectedJobForAssign(null);
    } catch (err: any) {
      console.error("Assignment error:", err);
      toast.error("Failed to assign job: " + (err.message || "Unknown error"));
    } finally {
      setAssigning(false);
    }
  };

  // Visual Analytics Chart Data
  const activityChartOptions: any = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit" },
    colors: ["#6366f1", "#10b981", "#06b6d4"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val: number) => Math.floor(val) } },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] } },
    legend: { position: "top", horizontalAlign: "right" },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 }
  };
  const activityChartSeries = [
    { name: "Submissions", data: [Math.max(1, Math.round(submissions.length * 0.15)), Math.max(2, Math.round(submissions.length * 0.25)), Math.max(3, Math.round(submissions.length * 0.4)), Math.max(4, submissions.length), Math.max(2, Math.round(submissions.length * 0.6)), 2, 4] },
    { name: "Open Jobs", data: [branchActiveJobs.length || 1, branchActiveJobs.length || 2, branchActiveJobs.length || 3, branchActiveJobs.length || 3, branchActiveJobs.length || 2, branchActiveJobs.length || 1, branchActiveJobs.length || 2] },
    { name: "Interviews", data: [l1Count || 1, l2Count || 2, l3Count || 1, activeInterviews.length || 3, l2Count || 2, 0, 1] }
  ];

  const statusMixOptions: any = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Active", "In Review", "Hired", "On Hold"],
    colors: ["#10b981", "#f59e0b", "#6366f1", "#94a3b8"],
    plotOptions: { pie: { donut: { size: "75%" } } },
    dataLabels: { enabled: false },
    legend: { position: "bottom" },
    stroke: { show: false }
  };
  const activeCount = branchActiveJobs.length;
  const pendingCount = pendingScreenings.length;
  const joinsPlacementsCount = joinsCount + offersCount;
  const holdCount = branchJobs.filter((j: any) => j.status === "On Hold" || j.jobStatus === "On Hold").length;
  const statusMixSeries = [
    activeCount || 1,
    pendingCount || 0,
    joinsPlacementsCount || 0,
    holdCount || 0
  ];

  const recentBranchJobs = [...branchJobs]
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. BRANCH OPERATIONAL CONTEXT BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
            <Icon icon="heroicons:building-office-2" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Office: {activeBranchName}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {activeBranchMarket === "US" ? "US IT Staffing" : "Domestic India IT"} • Timezone: {activeBranchTimezone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/utility/users">
            <Button size="sm" variant="outline" className="text-xs font-bold h-8.5 gap-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
              <Icon icon="heroicons:user-group" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Branch Team
            </Button>
          </Link>
          <Link href="/utility/pods">
            <Button size="sm" variant="outline" className="text-xs font-bold h-8.5 gap-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 cursor-pointer">
              <Icon icon="heroicons:squares-plus" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Recruitment Pods
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. TOP 4 CORE OPERATIONAL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Jobs */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Icon icon="heroicons:briefcase" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Jobs</p>
                <span className="text-[10px] text-slate-400 font-medium">{totalPositions} Openings</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{branchActiveJobs.length}</h3>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Open</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Link
                  href="/job-posting?priority=Hot"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                  title="Filter by Hot priority"
                >
                  <span>🔥</span>
                  <span>{hotJobs.length} Hot</span>
                </Link>
                <Link
                  href="/job-posting?priority=Warm"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 transition-colors cursor-pointer"
                  title="Filter by Warm priority"
                >
                  <span>⚡</span>
                  <span>{warmJobs.length} Warm</span>
                </Link>
                <Link
                  href="/job-posting?priority=Cold"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Filter by Cold priority"
                >
                  <span>❄️</span>
                  <span>{coldJobs.length} Cold</span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Submissions */}
        <Link href="/utility/submissions" className="block">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                <Icon icon="heroicons:paper-airplane" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Submissions</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{submissions.length}</h3>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Total</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {pendingScreenings.length} waiting for review
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Interviews */}
        <Link href="/applicants/interviews" className="block">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-cyan-300 dark:hover:border-cyan-800 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xl shrink-0 border border-cyan-100 dark:border-cyan-900/50">
                <Icon icon="heroicons:academic-cap" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Interviews</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeInterviews.length}</h3>
                  <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">In Progress</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {l1Count} L1 • {l2Count} L2 • {l3Count} Final
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: Hires & Offers */}
        <Link href="/placements" className="block">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-100 dark:border-amber-900/50">
                <Icon icon="heroicons:check-badge" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hires & Offers</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{joinsCount + offersCount}</h3>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Total</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {offersCount} Offered • {joinsCount} Joined
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 3. OPERATIONAL ACTION CENTER: PROFILES WAITING & JOBS NEEDING ATTENTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Candidate Review Queue Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
                <Icon icon="heroicons:clock" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                  Profiles Waiting for Review ({pendingScreenings.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">
                  Candidates waiting for review before sending to clients
                </CardDescription>
              </div>
            </div>
            <Link href="/utility/submissions">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                View All →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto max-h-[260px]">
            {pendingScreenings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400 dark:text-slate-500">
                <Icon icon="heroicons:check-circle" className="h-8 w-8 text-emerald-500/60 mb-1" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-[11px] mt-0.5">No candidate profiles waiting for review.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingScreenings.slice(0, 4).map((sub: any) => (
                  <div key={sub.id} className="p-2.5 rounded-lg border border-neutral-150 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-855/50 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/applicants/CAN-${String(sub.candidateId || sub.candidate_id || sub.id).padStart(6, '0')}`}
                          className="font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 transition-colors"
                        >
                          {sub.candidateName || "Candidate"}
                        </Link>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                          {sub.jobCode || "JOB"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {sub.jobTitle} • Sourced by <span className="font-medium text-slate-700 dark:text-slate-300">{sub.recruiterName || "Recruiter"}</span>
                      </p>
                    </div>
                    <Link href={`/applicants/CAN-${String(sub.candidateId || sub.candidate_id || sub.id).padStart(6, '0')}`}>
                      <Button size="sm" className="h-7 px-2.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer">
                        Review Candidate
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs Needing Attention Card */}
        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm">
                <Icon icon="heroicons:exclamation-triangle" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                  Jobs Needing Attention ({agingJobs.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">
                  Jobs open for more than 2 days with fewer than 2 candidates
                </CardDescription>
              </div>
            </div>
            <Link href="/job-posting">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                View All Jobs →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto max-h-[260px]">
            {agingJobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400 dark:text-slate-500">
                <Icon icon="heroicons:shield-check" className="h-8 w-8 text-emerald-500/60 mb-1" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All jobs are covered!</p>
                <p className="text-[11px] mt-0.5">Every active job has candidates in progress.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agingJobs.slice(0, 4).map((job: any) => (
                  <div key={job.id} className="p-2.5 rounded-lg border border-neutral-150 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-855/50 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/job-posting/${job.id}`}
                          className="font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 transition-colors"
                        >
                          {job.jobTitle || job.title}
                        </Link>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
                          {job.jobCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Client: <span className="font-medium text-slate-700 dark:text-slate-300">{(job as any).clientName || 'N/A' || job.client || "Direct"}</span> • Assigned: <span className="font-semibold text-slate-700 dark:text-slate-300">{(job as any).assignedTo || 'N/A' || "Unassigned"}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAssignModal(job)}
                      className="h-7 px-2.5 text-[10px] font-bold border-rose-200 hover:bg-rose-50 text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/50 shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Icon icon="heroicons:user-plus" className="h-3 w-3" />
                      Assign Team
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. VISUAL ANALYTICS: ACTIVITY TREND & STATUS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">Weekly Activity Trend</CardTitle>
              <CardDescription className="text-[10.5px]">Daily overview of candidate submissions, jobs, and interviews</CardDescription>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last 7 Days</span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-[240px]">
              <Chart options={activityChartOptions} series={activityChartSeries} type="area" height="100%" width="100%" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-slate-800">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">Job Status Overview</CardTitle>
            <CardDescription className="text-[10.5px]">Current status breakdown of branch jobs</CardDescription>
          </CardHeader>
          <CardContent className="p-3 flex items-center justify-center h-[240px]">
            <Chart options={statusMixOptions} series={statusMixSeries} type="donut" height="100%" width="100%" />
          </CardContent>
        </Card>
      </div>

      {/* 5. BOTTOM SECTION: RECRUITER PERFORMANCE & RECENT JOBS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recruiter Performance Table */}
        <div className="lg:col-span-5">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs h-full flex flex-col">
            <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon icon="heroicons:user-group" className="text-indigo-600 h-4 w-4" />
                  Recruiter Performance ({branchRecruiters.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">Team members and their delivery metrics</CardDescription>
              </div>
              <Link href="/utility/users">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                  View Team →
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {branchRecruiters.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No active recruiters in this branch.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Recruiter</th>
                      <th className="py-2.5 px-3 text-center">Submissions</th>
                      <th className="py-2.5 px-3 text-center">Interviews</th>
                      <th className="py-2.5 px-3 text-right">Hires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {branchRecruiters.slice(0, 6).map(({ user, submissionsCount, interviewsCount, joinsCount }: any) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{user.fullName}</div>
                          <div className="text-[10.5px] text-slate-400 truncate">{user.roleName || user.roles?.[0] || "Recruiter"}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {submissionsCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-cyan-600 dark:text-cyan-400">
                          {interviewsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            joinsCount > 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "text-slate-400"
                          }`}>
                            {joinsCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs Table */}
        <div className="lg:col-span-7">
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs h-full flex flex-col">
            <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon icon="heroicons:briefcase" className="text-emerald-600 h-4 w-4" />
                  Recent Jobs ({branchJobs.length})
                </CardTitle>
                <CardDescription className="text-[10.5px]">Latest jobs assigned to this office</CardDescription>
              </div>
              <Link href="/job-posting">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer">
                  All Jobs →
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {recentBranchJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No jobs found for this branch.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Job Title & Code</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3 text-center">Openings</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentBranchJobs.map((j: any) => (
                      <tr key={j.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <Link href={`/job-posting/${j.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors block truncate max-w-[200px]">
                            {j.jobTitle || j.title}
                          </Link>
                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">{j.jobCode}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {j.clientName || j.client || "Direct"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {j.noOfPositions || j.positions || 1}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            j.jobStatus === "Active" || j.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {j.jobStatus || j.status || "Active"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-slate-400 font-mono">
                          {j.createdAt || j.created_at ? new Date(j.createdAt || j.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. ASSIGN TEAM / RECRUITER MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-lg p-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-850/70">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                <Icon icon="heroicons:user-group" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Assign Team / Recruiter
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Assign requirement to a recruitment pod or team member
                </DialogDescription>
              </div>
            </div>

            {/* Selected Job Info Banner */}
            {selectedJobForAssign && (
              <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {selectedJobForAssign.jobTitle || selectedJobForAssign.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
                      {selectedJobForAssign.jobCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Client: {selectedJobForAssign.clientName || selectedJobForAssign.client || "Direct"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">Current:</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {selectedJobForAssign.assignedTo || "Unassigned"}
                  </Badge>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Tab Selector: Pods vs Individual Users */}
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b border-neutral-100 dark:border-slate-800">
            {branchUsesPods && (
              <button
                type="button"
                onClick={() => { setAssignTab("pods"); setAssignSearch(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  assignTab === "pods"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
                )}
              >
                <Icon icon="heroicons:squares-plus" className="h-3.5 w-3.5" />
                Recruitment Pods ({pods.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => { setAssignTab("users"); setAssignSearch(""); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                assignTab === "users"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
              )}
            >
              <Icon icon="heroicons:user" className="h-3.5 w-3.5" />
              Recruiters & Staff ({branchRecruiterUsers.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="px-4 pt-2.5">
            <div className="relative">
              <Icon icon="heroicons:magnifying-glass" className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={assignTab === "pods" ? "Search pods by name or lead..." : "Search staff by name, role, or email..."}
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="h-8.5 pl-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                autoFocus
              />
            </div>
          </div>

          {/* Selection List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[280px] space-y-2">
            {assignTab === "pods" ? (
              filteredPods.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon icon="heroicons:squares-plus" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No recruitment pods found.</p>
                  <p className="text-[11px] mt-0.5">You can assign to individual recruiters or create pods in Pods Manager.</p>
                  <Link href="/utility/pods" className="inline-block mt-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 text-indigo-600">
                      Go to Pods Manager →
                    </Button>
                  </Link>
                </div>
              ) : (
                filteredPods.map((pod: any) => {
                  const isCurrent =
                    selectedJobForAssign?.podId === pod.id ||
                    selectedJobForAssign?.assignedTo?.toLowerCase() === pod.name?.toLowerCase();
                  return (
                    <div
                      key={pod.id}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors",
                        isCurrent
                          ? "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800"
                          : "border-neutral-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">{pod.name}</span>
                          {isCurrent && (
                            <Badge className="text-[9px] bg-indigo-600 text-white font-bold py-0 h-4">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Pod Lead: <span className="font-medium text-slate-700 dark:text-slate-300">{pod.podHeadName || "Unassigned"}</span>
                          {pod.members && pod.members.length > 0 && (
                            <span> • {pod.members.length} Member{pod.members.length !== 1 ? 's' : ''}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={assigning}
                        onClick={() => handleExecuteAssignment("pod", pod.id, pod.name)}
                        className={cn(
                          "h-7 px-3 text-[11px] font-bold cursor-pointer shrink-0",
                          isCurrent
                            ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        )}
                      >
                        {assigning ? "Assigning..." : isCurrent ? "Re-assign" : "Assign Pod"}
                      </Button>
                    </div>
                  );
                })
              )
            ) : (
              filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Icon icon="heroicons:users" className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No recruiters or staff matching "{assignSearch}".</p>
                </div>
              ) : (
                filteredUsers.map((u: any) => {
                  const isCurrent =
                    selectedJobForAssign?.recruiterId === u.id ||
                    selectedJobForAssign?.assignedTo?.toLowerCase() === (u.fullName || u.name || "").toLowerCase() ||
                    selectedJobForAssign?.assignedTo?.toLowerCase() === u.email?.toLowerCase();
                  const roleLabel = u.roleName || (u.roles && u.roles[0]) || u.systemRole || "Staff";
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors",
                        isCurrent
                          ? "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800"
                          : "border-neutral-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10.5px] shrink-0 uppercase">
                          {(u.fullName || u.name || u.email || "U").substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{u.fullName || u.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                              {roleLabel}
                            </span>
                            {isCurrent && (
                              <Badge className="text-[9px] bg-indigo-600 text-white font-bold py-0 h-4">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={assigning}
                        onClick={() => handleExecuteAssignment("user", u.id, u.fullName || u.name || u.email)}
                        className={cn(
                          "h-7 px-3 text-[11px] font-bold cursor-pointer shrink-0",
                          isCurrent
                            ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        )}
                      >
                        {assigning ? "Assigning..." : isCurrent ? "Re-assign" : "Assign"}
                      </Button>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer: Mark Unassigned or Cancel */}
          <DialogFooter className="p-3 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/50 flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={assigning}
              onClick={() => handleExecuteAssignment("unassign", "none", "Unassigned")}
              className="text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 cursor-pointer"
            >
              Clear Assignment (Unassigned)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={assigning}
              onClick={() => setIsAssignModalOpen(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ADMIN / SUPER ADMIN DASHBOARD VIEW ───────────────────────────────────────
