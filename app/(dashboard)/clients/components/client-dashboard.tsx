"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { atsApi } from "@/lib/ats-api";
import DataTable from "@/components/shared/data-table";
import FilterDrawer, { SelectedFilters } from "@/components/shared/filter-drawer";
import ColumnDrawer from "@/components/shared/column-drawer";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

// Extend with any client specific fields if needed
interface ClientData {
  id: string;
  clientId: string;
  clientName: string;
  contactNumber: string;
  website: string;
  industry: string;
  state: string;
  city: string;
  status: string;
  category: string;
  primaryOwner: string;
  businessUnit: string;
  createdOn: string;
  modifiedOn: string;
  emailId: string;
  [key: string]: any;
}

export default function ClientDashboard() {
  const router = useRouter();
  
  // Drawer States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);

  // Table Configuration States
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "clientId",
    "clientName",
    "status",
    "contactNumber",
    "website",
    "industry",
    "state",
    "city",
    "primaryOwner",
    "businessUnit",
    "createdOn",
  ]);

  // Saved Views State
  const [savedViews, setSavedViews] = useState<string[]>([
    "My Clients",
    "Active Clients",
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

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      // No auto-login fallback (prevent tenant hijacking)
      const data = await atsApi.clients.list();
      const mappedData = (data || []).map((client: any) => ({
        id: client.id,
        clientId: client.client_code,
        clientName: client.client_name,
        contactNumber: client.contact_number,
        website: client.website,
        industry: client.industry,
        state: client.state,
        city: client.city,
        status: client.status,
        category: client.category,
        primaryOwner: client.primary_owner,
        businessUnit: client.business_unit,
        createdOn: client.created_at ? new Date(client.created_at).toLocaleDateString() : "N/A",
        modifiedOn: client.updated_at ? new Date(client.updated_at).toLocaleDateString() : "N/A",
        emailId: client.email_id,
        ...client
      }));
      setAllClients(mappedData);
      setClientsData(mappedData);
    } catch (err) {
      console.warn("[Clients] API fetch failed:", err);
      // Fallback empty data
      setAllClients([]);
      setClientsData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const allColumns = useMemo(() => [
    { id: "clientId", label: "Client ID" },
    { id: "clientName", label: "Client Name" },
    { id: "contactNumber", label: "Contact Number" },
    { id: "website", label: "Website" },
    { id: "industry", label: "Industry" },
    { id: "state", label: "State" },
    { id: "city", label: "City" },
    { id: "status", label: "Status" },
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
          if (pref === "Active Clients") return client.status === "Active";
          if (pref === "Inactive Clients") return client.status === "Inactive";
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
      setClientsData(baseData.filter((c) => c.status === "Active"));
    }
  };

  const handleUpdateRecord = useCallback(async (clientId: string, updatedFields: Partial<ClientData>) => {
    try {
      // Optimistic update
      setAllClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...updatedFields } : c)));
      setClientsData((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...updatedFields } : c)));
      
      await atsApi.clients.update(clientId, updatedFields);
      toast.success("Client updated successfully.");
    } catch (error) {
      toast.error("Failed to update client.");
      fetchClients(); // Revert on failure
    }
  }, [fetchClients]);

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

  const stats = useMemo(() => {
    const total = clientsData.length;
    const active = clientsData.filter((c) => c.status === "Active").length;
    const inactive = clientsData.filter((c) => c.status === "Inactive").length;
    return { total, active, inactive };
  }, [clientsData]);

  const customCellRenderer = (
    row: ClientData,
    colId: string,
    isEditing: boolean,
    editValue: string,
    setEditValue: (val: string) => void,
    saveEdit: () => void,
    cancelEdit: () => void
  ) => {
    if (isEditing) return null; // Fallback to default edit input

    if (colId === "status") {
      return (
        <Badge
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.2 rounded-xs border shadow-none",
            row.status === "Active"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          )}
        >
          {row.status || "Unknown"}
        </Badge>
      );
    }
    if (colId === "clientId") {
      return (
        <span className="text-blue-600 hover:underline cursor-pointer">
          {row.clientId}
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
    return null; // Fallback to default
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
          {/* Top Custom Ribbon like Ceipal */}
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
            onUpdateRecord={handleUpdateRecord}
            onBulkDelete={handleBulkDelete}
            searchFilterOptions={[
              { label: "Search Any", value: "All" },
              { label: "Client ID", value: "clientId" },
              { label: "Client Name", value: "clientName" },
            ]}
            customCellRenderer={customCellRenderer}
            topRightActions={topRightActions}
            editableColumns={["clientName", "contactNumber", "website", "city", "state"]}
          />
        </div>
      )}

      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={currentFilters}
        primaryFilterLabel="Business Unit"
        primaryFilterOptions={["All selected", "enfysync Inc", "US Staffing"]}
        predefinedFilters={["Active Clients", "Inactive Clients"]}
      />

      <ColumnDrawer
        isOpen={isColumnOpen}
        onClose={() => setIsColumnOpen(false)}
        allColumns={allColumns}
        selectedColumns={selectedColumns}
        onApply={(newCols) => setSelectedColumns(newCols)}
      />
    </div>
  );
}
