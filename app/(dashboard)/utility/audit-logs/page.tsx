"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { 
  Shield, 
  RefreshCw, 
  Search, 
  Filter, 
  Lock, 
  ShieldAlert, 
  FileText, 
  Clock, 
  User, 
  Activity, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const sessionUser = (session as any)?.user;
  const userPerms: string[] = sessionUser?.permissions || [];
  const userRoles: string[] = sessionUser?.roles || [sessionUser?.systemRole || "RECRUITER"];

  const canViewAuditLogs =
    userRoles.some((r: string) => ["ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"].includes(r)) ||
    userPerms.includes("tenant:audit_logs") ||
    userPerms.includes("audit:view");

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    if (canViewAuditLogs) {
      loadLogs();
    } else {
      setLoading(false);
    }
  }, [canViewAuditLogs]);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await atsApi.auditLogs.list(200);
      setLogs(data || []);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type?.toLowerCase().includes(search.toLowerCase()) ||
      (typeof log.details === "string" && log.details.toLowerCase().includes(search.toLowerCase())) ||
      (typeof log.details === "object" && JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase()));

    const matchesAction =
      actionFilter === "ALL" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    const act = String(action || "").toUpperCase();
    if (act.includes("CREATE") || act.includes("APPROVE") || act.includes("ACTIVATE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <CheckCircle2 className="w-3 h-3" />
          {act}
        </span>
      );
    }
    if (act.includes("DELETE") || act.includes("DEACTIVATE") || act.includes("REVOKE") || act.includes("DROP")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
          <AlertTriangle className="w-3 h-3" />
          {act}
        </span>
      );
    }
    if (act.includes("UPDATE") || act.includes("ASSIGN") || act.includes("MODIFY") || act.includes("EDIT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
          <Activity className="w-3 h-3" />
          {act}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-slate-700">
        <Layers className="w-3 h-3" />
        {act}
      </span>
    );
  };

  // ─── ACCESS DENIED STATE FOR NORMAL RECRUITERS ────────────────────────────
  if (!loading && !canViewAuditLogs) {
    return (
      <div className="w-full space-y-6 pb-12">
        <DashboardBreadcrumb title="Security Audit Logs" text="Operations & Logs" />

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 p-12 text-center shadow-sm space-y-4 max-w-2xl mx-auto mt-8">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Access Restricted to Administrators
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Security and governance audit logs contain confidential system-wide logs, user role assignments, IP history, and compliance records.
            </p>
          </div>
          <div className="pt-2">
            <Badge variant="outline" className="text-xs text-neutral-500 font-mono py-1 px-3">
              Required Permission: tenant:audit_logs or ADMIN role
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <DashboardBreadcrumb title="Security Audit Logs" text="Operations & Logs" />

      {/* ─── ENTERPRISE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1a4fa0] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                Security & Compliance Audit Logs
              </h1>
              <Badge variant="outline" className="text-[11px] font-normal border-blue-200 dark:border-blue-900/50 text-[#1a4fa0] dark:text-blue-300">
                Immutable Log
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Real-time forensic audit trail capturing user access, RBAC permission modifications, tenant changes, and administrative actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="text-xs font-semibold h-9 px-3.5 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-200 hover:bg-[#1a4fa0] hover:text-white hover:border-[#1a4fa0] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Stream
          </Button>
        </div>
      </div>

      {/* ─── FILTER TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search email, action, entity, metadata..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-md border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#1a4fa0]"
            >
              <option value="ALL">All Security Actions</option>
              <option value="APPROVE_USER">Approve User</option>
              <option value="CREATE_TENANT">Create Tenant</option>
              <option value="UPDATE_TENANT_STATUS">Tenant Status Change</option>
              <option value="UPDATE_USER_LIMIT">User Limit Change</option>
              <option value="UPDATE_BRANCH_LIMIT">Branch Limit Change</option>
              <option value="ROLE_PERMISSIONS_UPDATE">Role Permissions Modified</option>
              <option value="USER_ROLE_ASSIGN">User Role Assigned</option>
            </select>
          </div>

          {/* Total Count Status */}
          <div className="flex items-center justify-end px-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <span>Showing {filteredLogs.length} audit entries</span>
          </div>
        </div>
      </div>

      {/* ─── AUDIT EVENTS TABLE ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1a4fa0] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Forensic Audit Event Log
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {filteredLogs.length} Events Logged
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1a4fa0]" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading security audit records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 space-y-2">
            <ShieldAlert className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
            <p className="text-sm font-medium">No security audit logs found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-slate-800/60 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-neutral-500 whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{log.actor_email || "System Engine"}</span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Target Type */}
                    <td className="py-3 px-4 font-mono uppercase text-neutral-700 dark:text-neutral-300 text-[11px]">
                      {log.target_type || "SYSTEM"}
                    </td>

                    {/* Target ID */}
                    <td className="py-3 px-4 font-mono text-neutral-500 text-[11px] whitespace-nowrap">
                      {log.target_id ? `${String(log.target_id).substring(0, 8)}...` : "—"}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 max-w-xs truncate text-neutral-600 dark:text-neutral-400" title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || "—")}
                    </td>

                    {/* IP Address */}
                    <td className="py-3 px-4 font-mono text-neutral-500 text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-neutral-400" />
                        <span>{log.ip_address || "127.0.0.1"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
