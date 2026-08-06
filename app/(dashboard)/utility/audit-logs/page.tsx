"use client";

import React, { useEffect, useState } from "react";
import SiteBreadcrumb from "@/components/site-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    loadLogs();
  }, []);

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
      log.details?.toLowerCase().includes(search.toLowerCase());

    const matchesAction =
      actionFilter === "ALL" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action?.includes("APPROVE") || action?.includes("CREATE")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
    }
    if (action?.includes("DELETE") || action?.includes("DEACTIVATE")) {
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
    }
    if (action?.includes("UPDATE") || action?.includes("LIMIT")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400";
    }
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
  };

  return (
    <div className="space-y-6">
      <SiteBreadcrumb />

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-2">
            <Icon icon="heroicons:shield-check" className="h-3.5 w-3.5" />
            Security & Governance
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cross-Tenant Audit Logs</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Real-time immutable audit trail capturing security events, admin tenant modifications, and access history across all company workspaces.
          </p>
        </div>

        <Button
          onClick={loadLogs}
          disabled={loading}
          variant="outline"
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-2"
        >
          <Icon icon="heroicons:arrow-path" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stream
        </Button>
      </div>

      {/* Audit Logs Main Panel */}
      <Card className="border border-default-150 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-default-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Icon icon="heroicons:queue-list" className="text-indigo-600" />
              Event Stream Log ({filteredLogs.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Filtered records of security actions and admin operations.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Input
              placeholder="Search email, action, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs w-full sm:w-64"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-default-200 bg-white dark:bg-slate-900 outline-none text-default-700 w-full sm:w-auto"
            >
              <option value="ALL">All Actions</option>
              <option value="APPROVE_USER">Approve User</option>
              <option value="CREATE_TENANT">Create Tenant</option>
              <option value="UPDATE_TENANT_STATUS">Tenant Status Change</option>
              <option value="UPDATE_USER_LIMIT">User Limit Change</option>
              <option value="UPDATE_BRANCH_LIMIT">Branch Limit Change</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-3 text-xs text-default-500 font-semibold">Loading cross-tenant audit events...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-default-400">
              <Icon icon="heroicons:shield-exclamation" className="h-10 w-10 mx-auto text-default-300 mb-2" />
              No security audit logs found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50 border-b border-default-100 text-xs font-semibold text-default-700">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Target ID</th>
                    <th className="py-3 px-4">Details / Metadata</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100 text-xs">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-default-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-default-500 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-default-900 whitespace-nowrap">
                        {log.actor_email || "System"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-default-700 uppercase font-mono text-[11px]">
                        {log.target_type}
                      </td>
                      <td className="py-3 px-4 font-mono text-default-500 text-[11px]">
                        {log.target_id ? `${log.target_id.substring(0, 8)}...` : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-default-600 max-w-xs truncate" title={log.details}>
                        {log.details || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-default-400 text-[11px]">
                        {log.ip_address || "127.0.0.1"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
