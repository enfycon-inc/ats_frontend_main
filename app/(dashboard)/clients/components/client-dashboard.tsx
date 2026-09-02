"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { atsApi } from "@/lib/ats-api";
import DataTable from "@/components/shared/data-table";
import FilterDrawer, { SelectedFilters } from "@/components/shared/filter-drawer";
import ColumnDrawer from "@/components/shared/column-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Briefcase,
  Users,
  CheckCircle,
  FileCheck,
  TrendingUp,
  Activity,
  AlertCircle,
  Loader2,
  Plus,
  ChevronDown,
  ShieldCheck,
  Building,
  UserCheck,
  Globe,
  MessageSquare,
  Save,
  Check,
  X,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

// Extend with any client specific fields if needed
interface ClientData {
  id: string;
  clientId: string;
  clientName: string;
  endClientName: string;
  isSameAsPrimary: boolean;
  contactPerson: string;
  contactDesignation: string;
  contactNumber: string;
  website: string;
  industry: string;
  state: string;
  city: string;
  country: string;
  status: string;
  category: string;
  primaryOwner: string;
  businessUnit: string;
  createdOn: string;
  modifiedOn: string;
  emailId: string;
  market: string;
  tierRating: string;
  creditCheckStatus: string;
  fillabilityScore: string;
  vettingNotes: string;
  paymentTerms: string;
  federalId: string;
  gstin: string;
  panNumber: string;
  currency: string;
  msaSigned: boolean;
  sowExecuted: boolean;
  coiReceived: boolean;
  vendorPortalCreated: boolean;
  [key: string]: any;
}

import { getUserColumnPreferences, saveUserColumnPreferences } from "@/utils/user-column-preferences";

const DEFAULT_CLIENT_COLUMNS = [
  "clientId",
  "clientName",
  "activeJobsCount",
  "contactPerson",
  "status",
  "market",
  "tierRating",
  "contactNumber",
  "website",
  "industry",
  "primaryOwner",
  "createdOn",
];

export default function ClientDashboard() {
  const router = useRouter();
  
  // Current user permissions state
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    atsApi.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const userRoles = (currentUser?.roles || []).map((r: string) => String(r).toUpperCase().replace(/[\s-_]+/g, ''));
  const userPermissions = currentUser?.permissions || [];
  const isSuperOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPERADMIN') || userRoles.includes('SUPER_ADMIN');
  const canApproveRejectClient = 
    userPermissions.includes('client:approve') || 
    userPermissions.includes('client:reject') ||
    (userPermissions.length === 0 && isSuperOrAdmin);

  // Drawer States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);

  // Table Configuration States (User Persistent)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    getUserColumnPreferences("clients", DEFAULT_CLIENT_COLUMNS).filter((c) => c !== "actions")
  );

  // Saved Views State
  const [savedViews, setSavedViews] = useState<string[]>([
    "All Clients",
    "Active Clients",
    "Pending Approval",
    "VIP Clients",
  ]);
  const [activeView, setActiveView] = useState("All Clients");

  // Filtering States
  const [currentFilters, setCurrentFilters] = useState<SelectedFilters>({
    primary: "All selected",
    predefined: [],
  });

  // Data State
  const [clientsData, setClientsData] = useState<ClientData[]>([]);
  const [allClients, setAllClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal State
  const [clientToReject, setClientToReject] = useState<ClientData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Delete Warning Modal State
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // FULL EDIT FORM MODAL STATE
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [endClientSelectionMode, setEndClientSelectionMode] = useState<string>("__SAME__");

  const [editFormData, setEditFormData] = useState<any>({
    client_name: "",
    end_client_name: "",
    is_same_as_primary: true,
    market: "US",
    status: "Active",
    contact_person: "",
    contact_designation: "",
    email_id: "",
    contact_number: "",
    website: "",
    industry: "",
    payment_terms: "Net 30",
    federal_id: "",
    gstin: "",
    pan_number: "",
    currency: "USD",
    tier_rating: "TIER_1",
    credit_check_status: "APPROVED",
    fillability_score: "HIGH",
    vetting_notes: "",
    msa_signed: false,
    sow_executed: false,
    coi_received: false,
    vendor_portal_created: false,
  });

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await atsApi.clients.list(showDeleted ? "true" : "false");
      const mappedData = (data || []).map((client: any) => {
        const bu = (client.business_unit || "").toLowerCase();
        const detectedMarket = client.market 
          ? client.market 
          : (bu.includes("domestic") || bu.includes("bbsr") || bu.includes("india") ? "INDIA" : "US");

        return {
          id: client.id,
          clientId: client.client_code,
          clientName: client.client_name,
          endClientName: client.end_client_name || client.client_name,
          isSameAsPrimary: client.is_same_as_primary !== false,
          contactPerson: client.contact_person || client.client_lead || "N/A",
          contactDesignation: client.contact_designation || "",
          market: detectedMarket,
          tierRating: client.tier_rating || "TIER_1",
          onboardingStatus: client.onboarding_status || "ACTIVE",
          activeJobsCount: parseInt(client.active_jobs_count || "0", 10),
          contactNumber: client.contact_number || "",
          website: client.website || "",
          industry: client.industry || "",
          state: client.state || "",
          city: client.city || "",
          country: client.country || "",
          status: client.status || "Active",
          category: client.category || "",
          primaryOwner: client.primary_owner || "N/A",
          businessUnit: client.business_unit || "Default",
          createdOn: client.created_at ? new Date(client.created_at).toLocaleDateString() : "N/A",
          modifiedOn: client.updated_at ? new Date(client.updated_at).toLocaleDateString() : "N/A",
          emailId: client.email_id || "",
          creditCheckStatus: client.credit_check_status || "APPROVED",
          fillabilityScore: client.fillability_score || "HIGH",
          vettingNotes: client.vetting_notes || client.comments || "",
          paymentTerms: client.payment_terms || "Net 30",
          federalId: client.federal_id || "",
          gstin: client.gstin || "",
          panNumber: client.pan_number || "",
          currency: client.currency || "USD",
          msaSigned: !!client.msa_signed,
          sowExecuted: !!client.sow_executed,
          coiReceived: !!client.coi_received,
          vendorPortalCreated: !!client.vendor_portal_created,
          deletedAt: client.deleted_at,
          ...client
        };
      });

      setAllClients(mappedData);
      setClientsData(mappedData);
    } catch (err) {
      console.warn("[Clients] API fetch failed:", err);
      setAllClients([]);
      setClientsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenEditModal = (client: ClientData) => {
    setEditingClient(client);
    const isSame = client.isSameAsPrimary !== false;
    setEndClientSelectionMode(isSame ? "__SAME__" : (client.endClientName || "__CUSTOM__"));

    setEditFormData({
      client_name: client.clientName || "",
      end_client_name: client.endClientName || client.clientName || "",
      is_same_as_primary: isSame,
      market: client.market || "US",
      status: client.status || "Active",
      contact_person: client.contactPerson === "N/A" ? "" : client.contactPerson,
      contact_designation: client.contactDesignation || "",
      email_id: client.emailId || "",
      contact_number: client.contactNumber || "",
      website: client.website || "",
      industry: client.industry || "",
      payment_terms: client.paymentTerms || "Net 30",
      federal_id: client.federalId || "",
      gstin: client.gstin || "",
      pan_number: client.panNumber || "",
      currency: client.currency || "USD",
      tier_rating: client.tierRating || "TIER_1",
      credit_check_status: client.creditCheckStatus || "APPROVED",
      fillability_score: client.fillabilityScore || "HIGH",
      vetting_notes: client.vettingNotes || "",
      msa_signed: !!client.msaSigned,
      sow_executed: !!client.sowExecuted,
      coi_received: !!client.coiReceived,
      vendor_portal_created: !!client.vendorPortalCreated,
    });
  };

  const handleSaveEditForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    if (!editFormData.client_name.trim()) {
      toast.error("Primary Client Name is required.");
      return;
    }

    setIsSavingClient(true);
    try {
      let finalEndClientName = editFormData.client_name.trim();
      if (endClientSelectionMode === "__SAME__") {
        finalEndClientName = editFormData.client_name.trim();
      } else if (endClientSelectionMode === "__CUSTOM__") {
        finalEndClientName = editFormData.end_client_name.trim() || editFormData.client_name.trim();
      } else {
        finalEndClientName = endClientSelectionMode;
      }

      await atsApi.clients.update(editingClient.id, {
        ...editFormData,
        client_name: editFormData.client_name.trim(),
        end_client_name: finalEndClientName,
        is_same_as_primary: endClientSelectionMode === "__SAME__",
      });

      toast.success(`Client "${editFormData.client_name}" updated successfully!`);
      setEditingClient(null);
      fetchClients();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update client.");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await atsApi.clients.delete(clientToDelete.id);
      toast.success(`Client "${clientToDelete.clientName}" soft-deleted and moved to trash.`);
      setClientToDelete(null);
      fetchClients();
    } catch (err) {
      toast.error("Failed to soft-delete client.");
    } finally {
      setIsDeleting(false);
    }
  };

  const allColumns = useMemo(() => [
    { id: "clientId", label: "Client ID" },
    { id: "clientName", label: "Client Name" },
    { id: "endClientName", label: "End Client" },
    { id: "activeJobsCount", label: "Active Jobs" },
    { id: "contactPerson", label: "POC Contact Name" },
    { id: "contactDesignation", label: "POC Title" },
    { id: "status", label: "Approval / Status" },
    { id: "market", label: "Market" },
    { id: "tierRating", label: "Tier Rating" },
    { id: "onboardingStatus", label: "Onboarding" },
    { id: "contactNumber", label: "Contact Number" },
    { id: "website", label: "Website" },
    { id: "industry", label: "Industry" },
    { id: "state", label: "State" },
    { id: "city", label: "City" },
    { id: "category", label: "Category" },
    { id: "primaryOwner", label: "Primary Owner" },
    { id: "businessUnit", label: "Business Unit" },
    { id: "createdOn", label: "Created On" },
    { id: "modifiedOn", label: "Modified On" },
    { id: "emailId", label: "Email ID" },
  ], []);

  const handleApplyFilters = (filters: SelectedFilters) => {
    setCurrentFilters(filters);
    let filtered = [...allClients];

    if (filters.primary !== "All selected") {
      filtered = filtered.filter(
        (client) => client.businessUnit === filters.primary
      );
    }

    if (filters.predefined.length > 0) {
      filtered = filtered.filter((client) => {
        return filters.predefined.some((pref) => {
          if (pref === "Active Clients") return client.status === "Active" && client.approval_status !== "PENDING_APPROVAL";
          if (pref === "Inactive Clients") return client.status === "Inactive";
          if (pref === "Pending Approval") return client.status === "Pending Approval" || client.approval_status === "PENDING_APPROVAL";
          return true;
        });
      });
    }

    setClientsData(filtered);
  };

  const handleSaveView = (viewName: string) => {
    setSavedViews((prev) => [...prev, viewName]);
    setActiveView(viewName);
  };

  const handleSelectView = (viewName: string) => {
    setActiveView(viewName);
    let baseData = [...allClients];

    if (viewName === "All Clients") {
      setClientsData(baseData);
      setCurrentFilters({ primary: "All selected", predefined: [] });
    } else if (viewName === "Active Clients") {
      setClientsData(baseData.filter((c) => c.status === "Active" && c.approval_status !== "PENDING_APPROVAL"));
    } else if (viewName === "Pending Approval") {
      setClientsData(baseData.filter((c) => c.status === "Pending Approval" || c.approval_status === "PENDING_APPROVAL"));
    } else if (viewName === "VIP Clients") {
      setClientsData(baseData.filter((c) => (c.tierRating || "").includes("TIER_1") || (c.tierRating || "").includes("TIER 1")));
    }
  };

  const handleApproveClient = async (client: ClientData) => {
    const loadingToast = toast.loading(`Approving client "${client.clientName}"...`);
    try {
      await atsApi.clients.approve(client.id);
      toast.success(`Client "${client.clientName}" approved & activated successfully!`, { id: loadingToast });
      fetchClients();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve client.", { id: loadingToast });
    }
  };

  const handleConfirmReject = async () => {
    if (!clientToReject) return;
    setIsRejecting(true);
    const loadingToast = toast.loading(`Rejecting client "${clientToReject.clientName}"...`);
    try {
      await atsApi.clients.reject(clientToReject.id, rejectReason || "Rejected by Reviewer");
      toast.success(`Client "${clientToReject.clientName}" rejected.`, { id: loadingToast });
      setClientToReject(null);
      setRejectReason("");
      fetchClients();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject client.", { id: loadingToast });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleBulkDelete = useCallback(async (selectedIds: string[]) => {
    const loadingToast = toast.loading(`Deleting ${selectedIds.length} client(s)...`);
    try {
      await Promise.all(selectedIds.map(id => atsApi.clients.delete(id)));
      toast.success("Selected clients deleted successfully.", { id: loadingToast });
      fetchClients();
    } catch (err) {
      toast.error("Failed to delete some clients.", { id: loadingToast });
      fetchClients();
    }
  }, [fetchClients]);

  const handleRefresh = () => {
    setCurrentFilters({ primary: "All selected", predefined: [] });
    setActiveView("All Clients");
    fetchClients();
    toast.success("Clients list reloaded.");
  };

  const customCellRenderer = (
    row: ClientData,
    colId: string,
    isEditing: boolean,
    editValue: string,
    setEditValue: (val: string) => void,
    saveEdit: () => void,
    cancelEdit: () => void
  ) => {
    if (isEditing) return null;

    if (colId === "activeJobsCount") {
      return (
        <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {row.activeJobsCount || 0} Jobs
        </Badge>
      );
    }

    if (colId === "endClientName") {
      const isSame = row.isSameAsPrimary || !row.endClientName || row.endClientName === row.clientName;
      return (
        <span className="text-xs text-neutral-800 dark:text-neutral-200">
          {row.endClientName}{" "}
          {isSame ? (
            <span className="text-[10px] text-neutral-400 font-normal italic">(Same as Primary)</span>
          ) : null}
        </span>
      );
    }

    if (colId === "contactPerson") {
      return (
        <div className="flex flex-col text-xs">
          <span className="font-bold text-neutral-900 dark:text-white">{row.contactPerson || "N/A"}</span>
          {row.contactDesignation && (
            <span className="text-[10px] text-neutral-400">{row.contactDesignation}</span>
          )}
        </div>
      );
    }

    if (colId === "market") {
      const isIndia = row.market === "INDIA" || 
                      (row.businessUnit || "").toLowerCase().includes("domestic") || 
                      (row.businessUnit || "").toLowerCase().includes("bbsr");
      return (
        <Badge className={cn("text-[9px] font-bold py-0.2 px-1.5 border shadow-none flex items-center gap-1", isIndia ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
          <span>{isIndia ? "🇮🇳 India (₹)" : "🇺🇸 USA ($)"}</span>
        </Badge>
      );
    }

    if (colId === "tierRating") {
      return (
        <Badge variant="outline" className="text-[9px] font-bold border-indigo-300 text-indigo-700 bg-indigo-50/50">
          {row.tierRating ? row.tierRating.replace('_', ' ') : 'TIER 1'}
        </Badge>
      );
    }

    if (colId === "status") {
      const isPending = row.approval_status === "PENDING_APPROVAL" || row.status === "Pending Approval";
      const isRejected = row.approval_status === "REJECTED" || row.status === "Rejected";

      if (isPending) {
        return (
          <div className="flex items-center gap-1.5">
            <Badge className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1 shadow-none">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Approval
            </Badge>
            {canApproveRejectClient && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApproveClient(row);
                  }}
                  title="Approve Client"
                  className="inline-flex items-center justify-center h-5 w-5 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClientToReject(row);
                  }}
                  title="Reject Client"
                  className="inline-flex items-center justify-center h-5 w-5 rounded bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        );
      }

      if (isRejected) {
        return (
          <div className="flex flex-col gap-0.5 items-start">
            <Badge className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 shadow-none">
              Rejected
            </Badge>
            {row.rejection_reason && (
              <span className="text-[9px] text-red-500 italic max-w-[130px] truncate" title={row.rejection_reason}>
                {row.rejection_reason}
              </span>
            )}
          </div>
        );
      }

      return (
        <Badge
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-none",
            row.status === "Active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-neutral-100 text-neutral-600 border-neutral-300"
          )}
        >
          {row.status || "Active"}
        </Badge>
      );
    }

    if (colId === "clientId" || colId === "clientName") {
      return (
        <span
          onClick={() => router.push(`/clients/${row.id}`)}
          className="text-indigo-600 font-bold hover:underline cursor-pointer"
        >
          {row[colId]}
        </span>
      );
    }

    if (colId === "website") {
      return (
        <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {row.website}
        </a>
      );
    }
    return null;
  };

  const renderRowActions = (row: ClientData) => {
    const isPending = row.approval_status === "PENDING_APPROVAL" || row.status === "Pending Approval";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 py-1 font-sans shadow-lg z-50">
          <DropdownMenuItem
            onClick={() => router.push(`/clients/${row.id}`)}
            className="cursor-pointer text-xs py-1.5 px-2.5 font-medium flex items-center gap-2"
          >
            <Eye className="h-3.5 w-3.5 text-neutral-500" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleOpenEditModal(row)}
            className="cursor-pointer text-xs py-1.5 px-2.5 font-medium flex items-center gap-2"
          >
            <Edit className="h-3.5 w-3.5 text-blue-500" /> Edit Client
          </DropdownMenuItem>
          {isPending && canApproveRejectClient && (
            <>
              <DropdownMenuItem
                onClick={() => handleApproveClient(row)}
                className="cursor-pointer text-xs py-1.5 px-2.5 font-medium flex items-center gap-2 text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
              >
                <Check className="h-3.5 w-3.5" /> Approve Client
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setClientToReject(row)}
                className="cursor-pointer text-xs py-1.5 px-2.5 font-medium flex items-center gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/40"
              >
                <X className="h-3.5 w-3.5" /> Reject Client
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            onClick={() => setClientToDelete(row)}
            className="cursor-pointer text-xs py-1.5 px-2.5 font-medium flex items-center gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const topRightActions = (
    <button
      onClick={() => router.push("/clients/new")}
      className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary hover:bg-primary/95 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
    >
      <Plus className="h-3 w-3" /> New Client
    </button>
  );

  return (
    <div className="h-full flex flex-col min-h-0 font-sans gap-2 p-0">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading clients...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-none overflow-hidden relative font-sans">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 px-2 py-1 rounded cursor-pointer transition-colors">
                Client <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-slate-800 px-2 py-1 rounded cursor-pointer transition-colors">
                <Plus className="h-4 w-4" /> Add View
              </button>
            </div>
          </div>

          <DataTable
            data={clientsData}
            selectedColumns={selectedColumns}
            allColumns={allColumns}
            onOpenFilters={() => setIsFilterOpen(true)}
            onOpenColumns={() => setIsColumnOpen(true)}
            onRefresh={handleRefresh}
            onSaveView={handleSaveView}
            savedViews={savedViews}
            activeView={activeView}
            onSelectView={handleSelectView}
            onBulkDelete={handleBulkDelete}
            searchFilterOptions={[
              { label: "Search Any", value: "All" },
              { label: "Client ID", value: "clientId" },
              { label: "Client Name", value: "clientName" },
            ]}
            customCellRenderer={customCellRenderer}
            actionsRenderer={renderRowActions}
            topRightActions={topRightActions}
          />
        </div>
      )}

      {/* FULL CLIENT CRM EDIT FORM MODAL */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    Edit Client Account: <span className="font-mono text-indigo-600">{editingClient.clientId}</span>
                  </h3>
                  <p className="text-xs text-neutral-500">Update master client account, POC, market alignment, and internal CRM comments.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingClient(null)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEditForm} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* SECTION 1: IDENTITY & END CLIENT */}
              <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Building className="h-4 w-4" /> 1. Client Identity &amp; End Client
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={editFormData.client_name}
                      onChange={(e) => setEditFormData({ ...editFormData, client_name: e.target.value })}
                      placeholder="e.g. Wipro, TCS, Google, HDFC Bank"
                      className="w-full px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      End Client <span className="text-[10px] text-neutral-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={endClientSelectionMode}
                      onChange={(e) => setEndClientSelectionMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="__SAME__">Same as Client Name (Direct Mandate)</option>
                      {allClients.length > 0 && (
                        <optgroup label="Select Existing Client">
                          {allClients
                            .filter((c) => c.clientName && c.clientName !== editFormData.client_name)
                            .map((c) => (
                              <option key={c.id} value={c.clientName}>
                                {c.clientName}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      <option value="__CUSTOM__">+ Enter Custom End Client...</option>
                    </select>

                    {endClientSelectionMode === "__CUSTOM__" && (
                      <input
                        value={editFormData.end_client_name}
                        onChange={(e) => setEditFormData({ ...editFormData, end_client_name: e.target.value })}
                        placeholder="Enter custom End Client name"
                        className="w-full mt-2 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-md outline-none"
                      />
                    )}
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Industry</label>
                    <input
                      value={editFormData.industry}
                      onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                      placeholder="Information Technology, Banking"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Website</label>
                    <input
                      value={editFormData.website}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      placeholder="https://company.com"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: POINT OF CONTACT (POC) */}
              <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" /> 2. Point of Contact (POC) &amp; Communication Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Contact Name</label>
                    <input
                      value={editFormData.contact_person}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                      placeholder="e.g. John Smith, Ramesh Kumar"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Title / Designation</label>
                    <input
                      value={editFormData.contact_designation}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_designation: e.target.value })}
                      placeholder="e.g. VMS Lead, HR Director"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Work Email</label>
                    <input
                      type="email"
                      value={editFormData.email_id}
                      onChange={(e) => setEditFormData({ ...editFormData, email_id: e.target.value })}
                      placeholder="john.smith@client.com"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">POC Phone / Contact Number</label>
                    <input
                      value={editFormData.contact_number}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_number: e.target.value })}
                      placeholder="+1 (555) 019-8234"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: MARKET & TAX IDENTIFIERS */}
              <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Globe className="h-4 w-4" /> 3. Market Alignment &amp; Tax Identifiers
                  </h4>

                  <select
                    value={editFormData.market}
                    onChange={(e) => setEditFormData({ ...editFormData, market: e.target.value, currency: e.target.value === "INDIA" ? "INR" : "USD" })}
                    className="text-xs font-bold px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-md text-indigo-700 dark:text-indigo-300"
                  >
                    <option value="US">US IT Staffing Market ($)</option>
                    <option value="INDIA">India Domestic Market (₹)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {editFormData.market === "INDIA" ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">GSTIN Number</label>
                        <input
                          value={editFormData.gstin}
                          onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                          placeholder="22AAAAA0000A1Z5"
                          className="w-full px-3 py-2 text-xs uppercase font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">PAN Number</label>
                        <input
                          value={editFormData.pan_number}
                          onChange={(e) => setEditFormData({ ...editFormData, pan_number: e.target.value })}
                          placeholder="ABCDE1234F"
                          className="w-full px-3 py-2 text-xs uppercase font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Federal EIN / Tax ID</label>
                      <input
                        value={editFormData.federal_id}
                        onChange={(e) => setEditFormData({ ...editFormData, federal_id: e.target.value })}
                        placeholder="12-3456789"
                        className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Payment Terms</label>
                    <select
                      value={editFormData.payment_terms}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_terms: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 45">Net 45 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Paid When Paid">Paid When Paid (PWP)</option>
                      <option value="Immediate">Immediate / Advance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: QUALIFIER & ONBOARDING */}
              <div className="space-y-4 border-b border-neutral-150 dark:border-slate-800 pb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> 4. Qualification Rating &amp; Onboarding Verification
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Client Tier Rating</label>
                    <select
                      value={editFormData.tier_rating}
                      onChange={(e) => setEditFormData({ ...editFormData, tier_rating: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="TIER_1">Tier 1 (Direct VMS / Preferred)</option>
                      <option value="TIER_2">Tier 2 (Implementation Partner)</option>
                      <option value="TIER_3">Tier 3 (Subcontract Vendor)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Credit Check Vetting</label>
                    <select
                      value={editFormData.credit_check_status}
                      onChange={(e) => setEditFormData({ ...editFormData, credit_check_status: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="APPROVED">Approved Credit</option>
                      <option value="PENDING_CHECK">Pending Check</option>
                      <option value="HIGH_RISK">High Financial Risk</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Fillability Rating</label>
                    <select
                      value={editFormData.fillability_score}
                      onChange={(e) => setEditFormData({ ...editFormData, fillability_score: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none"
                    >
                      <option value="HIGH">High (Fast Closure / Hot Account)</option>
                      <option value="MEDIUM">Medium (Standard Responsiveness)</option>
                      <option value="LOW">Low (Slow Feedback / Hard to Fill)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 text-xs font-semibold cursor-pointer">
                    <span>MSA Signed</span>
                    <Switch checked={editFormData.msa_signed} onCheckedChange={(val) => setEditFormData((p: any) => ({ ...p, msa_signed: val }))} />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/20 text-xs font-semibold cursor-pointer">
                    <span>VMS Configured</span>
                    <Switch checked={editFormData.vendor_portal_created} onCheckedChange={(val) => setEditFormData((p: any) => ({ ...p, vendor_portal_created: val }))} />
                  </label>
                </div>
              </div>


              {/* SECTION 5: INTERNAL CRM NOTES & COMMENT BOX */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> 5. Internal CRM Notes &amp; Account Comments Box
                </h4>
                <textarea
                  rows={4}
                  value={editFormData.vetting_notes}
                  onChange={(e) => setEditFormData({ ...editFormData, vetting_notes: e.target.value })}
                  placeholder="Type internal notes, recruiter guidelines, fee terms, interview preferences, or comments about this client account..."
                  className="w-full p-3 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-sans leading-relaxed"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-neutral-200 dark:border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setEditingClient(null)} disabled={isSavingClient} className="text-xs font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingClient} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5">
                  {isSavingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Client CRM Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT CLIENT MODAL */}
      {clientToReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Reject Client Account
                </h3>
                <p className="text-xs text-neutral-500">
                  Reject <strong className="text-neutral-900 dark:text-white">{clientToReject.clientName}</strong> ({clientToReject.clientId}).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Reason / Feedback for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify reason for rejecting this client (e.g. Duplicate account, unverified domain, missing billing agreements)..."
                className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={() => {
                  setClientToReject(null);
                  setRejectReason("");
                }}
                disabled={isRejecting}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER DRAWER */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={currentFilters}
        primaryFilterLabel="Business Unit"
        primaryFilterOptions={["All selected", "enfysync Inc", "US Staffing"]}
        predefinedFilters={["Active Clients", "Inactive Clients"]}
      />

      {/* COLUMN DRAWER */}
      <ColumnDrawer
        isOpen={isColumnOpen}
        onClose={() => setIsColumnOpen(false)}
        allColumns={allColumns}
        selectedColumns={selectedColumns}
        onApply={(newCols) => {
          setSelectedColumns(newCols);
          saveUserColumnPreferences("clients", newCols);
        }}
      />

      {/* SOFT DELETE CONFIRMATION WARNING MODAL */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Confirm Soft Delete Client?
                </h3>
                <p className="text-xs text-neutral-500">
                  You are about to soft-delete <strong className="text-neutral-900 dark:text-white">{clientToDelete.clientName}</strong> ({clientToDelete.clientId}).
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Data Safety Notice (Soft Delete)
              </p>
              <p className="text-[11px] leading-relaxed">
                This client record will be archived. All associated historical job requisitions, candidate submissions, and billing placements remain 100% preserved. You can restore this client at any time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={() => setClientToDelete(null)}
                disabled={isDeleting}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSoftDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm Soft Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
