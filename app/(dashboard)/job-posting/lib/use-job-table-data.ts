"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { Job } from "../data/mock-jobs";
import { getAssignedPersonDisplay } from "./job-table-utils";

export interface UseJobTableDataOptions {
  data: Job[];
  branchUsesPods?: boolean;
}

export function useJobTableData({ data, branchUsesPods }: UseJobTableDataOptions) {
  // Sorting State
  const [sortColumn, setSortColumn] = useState<keyof Job | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPod, setSelectedPod] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedCreator, setSelectedCreator] = useState("All");
  const [selectedAssignee, setSelectedAssignee] = useState("All");
  const [selectedClient, setSelectedClient] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("All Time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSort, setSelectedSort] = useState("Latest Posted");
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [podsList, setPodsList] = useState<any[]>([]);

  // Check whether pod system is enabled for current active branch / workspace
  const isPodSystemEnabled = useMemo(() => {
    if (branchUsesPods !== undefined) return branchUsesPods;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_branch_allow_pods");
      if (stored !== null) return stored === "true";
    }
    return false;
  }, [branchUsesPods]);

  useEffect(() => {
    if (isPodSystemEnabled) {
      atsApi.pods
        .list()
        .then((res) => {
          if (Array.isArray(res)) setPodsList(res);
        })
        .catch((e) => console.warn("Could not load pods:", e));
    }
  }, [isPodSystemEnabled]);

  // Unique available pods for dropdown
  const availablePods = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    podsList.forEach((p: any) => {
      if (p && p.name) map.set(p.name, { id: p.id, name: p.name });
    });
    data.forEach((j) => {
      if (j.podName && j.podName !== "N/A" && j.podName.toLowerCase() !== "unassigned") {
        map.set(j.podName, { id: j.podId || j.podName, name: j.podName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [podsList, data]);

  // Unique available Branches for dropdown
  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    data.forEach((j) => {
      const branch = j.businessUnit || j.branchName;
      if (branch && branch !== "N/A" && branch.trim()) {
        branches.add(branch.trim());
      }
    });
    return Array.from(branches).sort();
  }, [data]);

  // Unique available Creators for dropdown
  const availableCreators = useMemo(() => {
    const creators = new Set<string>();
    data.forEach((j) => {
      const creator = j.createdBy || (j as any).creator_name || (j as any).created_by;
      if (creator && creator !== "System Admin" && creator !== "N/A" && creator.trim()) {
        creators.add(creator.trim());
      }
    });
    return Array.from(creators).sort();
  }, [data]);

  // Unique available Assignees for dropdown
  const availableAssignees = useMemo(() => {
    const assignees = new Set<string>();
    data.forEach((j) => {
      const info = getAssignedPersonDisplay(j);
      if (info.label && info.label !== "Unassigned" && info.label.trim()) {
        assignees.add(info.label.trim());
      }
    });
    return Array.from(assignees).sort();
  }, [data]);

  // Unique available Clients for dropdown
  const availableClients = useMemo(() => {
    const clients = new Set<string>();
    data.forEach((j) => {
      if (j.client && j.client !== "N/A") clients.add(j.client.trim());
      if (j.endClientName && j.endClientName !== "N/A") clients.add(j.endClientName.trim());
    });
    return Array.from(clients).sort();
  }, [data]);

  const isAnyFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      selectedPod !== "All" ||
      selectedBranch !== "All" ||
      selectedCreator !== "All" ||
      selectedAssignee !== "All" ||
      selectedClient !== "All" ||
      selectedPeriod !== "All Time" ||
      startDate !== "" ||
      endDate !== "" ||
      selectedSort !== "Latest Posted"
    );
  }, [
    searchQuery,
    selectedPod,
    selectedBranch,
    selectedCreator,
    selectedAssignee,
    selectedClient,
    selectedPeriod,
    startDate,
    endDate,
    selectedSort,
  ]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPod("All");
    setSelectedBranch("All");
    setSelectedCreator("All");
    setSelectedAssignee("All");
    setSelectedClient("All");
    setSelectedPeriod("All Time");
    setStartDate("");
    setEndDate("");
    setSelectedSort("Latest Posted");
    setSortColumn(null);
    setShowRangePicker(false);
    toast.success("Filters reset to default");
  };

  // Pagination State
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (column: keyof Job) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((job) => {
        const assignedLabel = getAssignedPersonDisplay(job).label.toLowerCase();
        return (
          (job.jobTitle || "").toLowerCase().includes(q) ||
          (job.jobCode || "").toLowerCase().includes(q) ||
          (job.client || "").toLowerCase().includes(q) ||
          ((job as any).endClientName || 'N/A' || "").toLowerCase().includes(q) ||
          (job.location || "").toLowerCase().includes(q) ||
          ((job as any).businessUnit || 'N/A' || "").toLowerCase().includes(q) ||
          assignedLabel.includes(q)
        );
      });
    }

    if (isPodSystemEnabled && selectedPod !== "All") {
      result = result.filter(
        (job) => job.podName === selectedPod || job.podId === selectedPod
      );
    }

    if (selectedBranch !== "All") {
      result = result.filter((j) => {
        const branch = j.businessUnit || j.branchName;
        return branch === selectedBranch;
      });
    }

    if (selectedCreator !== "All") {
      result = result.filter((job) => {
        const creator = job.createdBy || (job as any).creator_name || (job as any).created_by;
        return creator?.trim().toLowerCase() === selectedCreator.trim().toLowerCase();
      });
    }

    if (selectedAssignee !== "All") {
      result = result.filter((job) => {
        const info = getAssignedPersonDisplay(job);
        if (selectedAssignee === "Unassigned") {
          return info.type === "unassigned";
        }
        return info.label.trim().toLowerCase() === selectedAssignee.trim().toLowerCase();
      });
    }

    if (selectedClient !== "All") {
      result = result.filter(
        (job) =>
          (job.client && job.client.toLowerCase() === selectedClient.toLowerCase()) ||
          ((job as any).endClientName || 'N/A' && (job as any).endClientName || 'N/A'.toLowerCase() === selectedClient.toLowerCase())
      );
    }

    if (selectedPeriod !== "All Time" || startDate || endDate) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOf30Days = startOfToday - 30 * 24 * 60 * 60 * 1000;

      result = result.filter((job) => {
        const dateStr = (job as any).createdAt || job.createdOn;
        if (!dateStr) return true;
        const jobTime = new Date(dateStr).getTime();
        if (isNaN(jobTime)) return true;

        if (selectedPeriod === "Today") return jobTime >= startOfToday;
        if (selectedPeriod === "Yesterday")
          return jobTime >= startOfYesterday && jobTime < startOfToday;
        if (selectedPeriod === "This Week") return jobTime >= startOfWeek;
        if (selectedPeriod === "This Month") return jobTime >= startOfMonth;
        if (selectedPeriod === "Last 30 Days") return jobTime >= startOf30Days;
        if (selectedPeriod === "Custom" || startDate || endDate) {
          if (startDate) {
            const sTime = new Date(startDate).getTime();
            if (!isNaN(sTime) && jobTime < sTime) return false;
          }
          if (endDate) {
            const eTime = new Date(endDate + "T23:59:59.999Z").getTime();
            if (!isNaN(eTime) && jobTime > eTime) return false;
          }
          return true;
        }
        return true;
      });
    }

    if (sortColumn) {
      result.sort((a, b) => {
        if (sortColumn === "assignedTo") {
          const strA = getAssignedPersonDisplay(a).label.toLowerCase();
          const strB = getAssignedPersonDisplay(b).label.toLowerCase();
          if (strA < strB) return sortDirection === "asc" ? -1 : 1;
          if (strA > strB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }

        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (sortColumn === "createdOn" || sortColumn === "modifiedOn") {
          const timeA = new Date(String(valA || "")).getTime();
          const timeB = new Date(String(valB || "")).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
          }
        }

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => {
        if (selectedSort === "Latest Posted") {
          const tA = new Date(String((a as any).createdAt || a.createdOn || 0)).getTime();
          const tB = new Date(String((b as any).createdAt || b.createdOn || 0)).getTime();
          return tB - tA;
        }
        if (selectedSort === "Oldest Posted") {
          const tA = new Date(String((a as any).createdAt || a.createdOn || 0)).getTime();
          const tB = new Date(String((b as any).createdAt || b.createdOn || 0)).getTime();
          return tA - tB;
        }
        if (selectedSort === "Recently Updated") {
          const tA = new Date(String((a as any).updatedAt || a.modifiedOn || 0)).getTime();
          const tB = new Date(String((b as any).updatedAt || b.modifiedOn || 0)).getTime();
          return tB - tA;
        }
        if (selectedSort === "Job Title (A-Z)") {
          return (a.jobTitle || "").localeCompare(b.jobTitle || "");
        }
        if (selectedSort === "Job Title (Z-A)") {
          return (b.jobTitle || "").localeCompare(a.jobTitle || "");
        }
        if (selectedSort === "Hot First") {
          const rank = (j: Job) => {
            const p = String(j.priority || (j as any).urgency || "").toLowerCase();
            return p.includes("hot") ? 0 : p.includes("warm") ? 1 : 2;
          };
          return rank(a) - rank(b);
        }
        return 0;
      });
    }

    return result;
  }, [
    data,
    searchQuery,
    isPodSystemEnabled,
    selectedPod,
    selectedBranch,
    selectedCreator,
    selectedAssignee,
    selectedClient,
    selectedPeriod,
    startDate,
    endDate,
    sortColumn,
    sortDirection,
    selectedSort,
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  return {
    searchQuery,
    setSearchQuery,
    selectedPod,
    setSelectedPod,
    selectedBranch,
    setSelectedBranch,
    selectedCreator,
    setSelectedCreator,
    selectedAssignee,
    setSelectedAssignee,
    selectedClient,
    setSelectedClient,
    selectedPeriod,
    setSelectedPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedSort,
    setSelectedSort,
    showRangePicker,
    setShowRangePicker,
    isPodSystemEnabled,
    availablePods,
    availableBranches,
    availableCreators,
    availableAssignees,
    availableClients,
    isAnyFilterActive,
    handleResetFilters,
    sortColumn,
    sortDirection,
    handleSort,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    processedData,
    paginatedData,
  };
}
