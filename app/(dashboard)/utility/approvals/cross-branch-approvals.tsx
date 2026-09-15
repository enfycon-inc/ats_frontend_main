import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

export function CrossBranchApprovalsView() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await atsApi.jobs.getDelegations('incoming');
      setRequests(data || []);
    } catch (err: any) {
      toast.error("Failed to load cross-branch requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    try {
      setSubmittingId(requestId);
      await atsApi.jobs.acceptDelegation(requestId, {});
      toast.success("Delegation accepted successfully!");
      loadRequests();
    } catch (err: any) {
      toast.error("Failed to accept delegation: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setSubmittingId(requestId);
      await atsApi.jobs.rejectDelegation(requestId, { notes: "Rejected by Branch Admin" });
      toast.success("Delegation rejected.");
      loadRequests();
    } catch (err: any) {
      toast.error("Failed to reject delegation: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <Card className="border border-default-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-default-100 py-4 px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-default-900 flex items-center gap-2">
              <Icon icon="heroicons:arrows-right-left" className="h-5 w-5 text-indigo-600" />
              Incoming Cross-Branch Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription className="text-xs text-default-500 mt-0.5">
              Review jobs that other branches want to share with your branch. Accept to assign them to your pods.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadRequests} className="flex items-center gap-2 text-xs">
            <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-16 text-center text-sm text-default-500">Loading requests...</div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="inline-flex h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 items-center justify-center text-3xl mb-4">
              <Icon icon="heroicons:inbox" />
            </div>
            <h3 className="text-lg font-bold text-default-900 mb-1">No Pending Requests</h3>
            <p className="text-sm text-default-500 max-w-md">
              There are currently no pending cross-branch delegation requests for your branch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100">
                  <th className="py-3.5 px-6 text-xs font-bold text-default-700 uppercase tracking-wider">Job Details</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-default-700 uppercase tracking-wider">Source Branch</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-default-700 uppercase tracking-wider">Margin Split</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-default-700 uppercase tracking-wider">SLA Target</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-default-700 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-sm text-default-900">{req.job?.jobCode} - {req.job?.jobTitle}</div>
                      <div className="text-xs text-default-500 mt-0.5 max-w-sm truncate">{req.notes || "No notes"}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <Badge variant="outline" className="text-[10px]">{req.sourceBranch?.name}</Badge>
                    </td>
                    <td className="py-3.5 px-6 text-xs font-medium text-default-700">
                      AM: {req.marginSplitAmPct ?? 0}% / REC: {req.marginSplitRecPct ?? 0}%
                    </td>
                    <td className="py-3.5 px-6 text-xs text-default-700">
                      {req.slaDaysTarget ? \\ Days\ : "N/A"}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(req.id)}
                        disabled={submittingId === req.id}
                        className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(req.id)}
                        disabled={submittingId === req.id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {submittingId === req.id ? "Accepting..." : "Accept Job"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
