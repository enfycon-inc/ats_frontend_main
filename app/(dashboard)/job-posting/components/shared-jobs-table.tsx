import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import Link from "next/link";
import toast from "react-hot-toast";
import { Briefcase, MapPin, Building2, ExternalLink } from "lucide-react";

export default function SharedJobsTable({ onRefresh, branchUsesPods }: { onRefresh: () => void, branchUsesPods: boolean }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchSharedJobs = async () => {
    setLoading(true);
    try {
      const [res, delegations] = await Promise.all([
        atsApi.jobs.list(),
        atsApi.jobs.getDelegations('incoming').catch(() => [])
      ]);
      
      const currentUser = atsApi.auth.getCurrentUser();
      const currentBranchId = currentUser?.branchId;
      
      const shared = res.filter(j => 
        j.isCoSourced || 
        (j.sharedBranchIds && j.sharedBranchIds.includes(currentBranchId))
      );
      
      setJobs(shared);
      setPendingRequests(delegations?.filter((d: any) => d.status === 'PENDING') || []);
    } catch (err: any) {
      toast.error("Failed to load shared jobs.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      setSubmittingId(requestId);
      await atsApi.jobs.acceptDelegation(requestId, {});
      toast.success("Delegation accepted successfully!");
      fetchSharedJobs();
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
      fetchSharedJobs();
    } catch (err: any) {
      toast.error("Failed to reject delegation: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  useEffect(() => {
    fetchSharedJobs();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading shared jobs...</div>;
  }

  return (
    <Card className="border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-sm flex-1 overflow-hidden">
      <CardHeader className="border-b border-indigo-100 dark:border-indigo-900/50 py-4 px-6 bg-indigo-50/50 dark:bg-indigo-950/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <Icon icon="heroicons:share" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Shared Jobs Dashboard
            </CardTitle>
            <CardDescription className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
              Jobs co-sourced and shared from other branches for your teams to work on.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={fetchSharedJobs} className="flex items-center gap-2 text-xs">
            <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {pendingRequests.length > 0 && (
          <div className="border-b border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
            <div className="px-6 py-3 border-b border-amber-100 dark:border-amber-900/50 bg-amber-100/50 dark:bg-amber-900/30">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Icon icon="heroicons:bell-alert" className="h-4 w-4" />
                Pending Delegation Requests ({pendingRequests.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-amber-100 dark:border-amber-900/50">
                    <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase">Job</th>
                    <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase">Source Branch</th>
                    <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase">SLA & Margin</th>
                    <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                  {pendingRequests.map(req => (
                    <tr key={req.id} className="hover:bg-amber-100/30 transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-semibold text-sm text-default-900">{req.job?.jobCode} - {req.job?.jobTitle}</div>
                        <div className="text-xs text-default-500 mt-0.5 truncate max-w-xs">{req.notes || "No notes"}</div>
                      </td>
                      <td className="py-3 px-6">
                        <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-white">{req.sourceBranch?.name}</Badge>
                      </td>
                      <td className="py-3 px-6 text-xs text-default-700">
                        <div className="font-medium">AM: {req.marginSplitAmPct ?? 0}% / REC: {req.marginSplitRecPct ?? 0}%</div>
                        <div className="text-default-500">{req.slaDaysTarget ? `${req.slaDaysTarget} Days SLA` : "No SLA"}</div>
                      </td>
                      <td className="py-3 px-6 text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} disabled={submittingId === req.id} className="text-rose-600 hover:bg-rose-50 border-rose-200">
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleAccept(req.id)} disabled={submittingId === req.id} className="bg-amber-600 hover:bg-amber-700 text-white">
                          {submittingId === req.id ? "Accepting..." : "Accept"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="inline-flex h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 items-center justify-center text-3xl mb-4">
              <Icon icon="heroicons:inbox" />
            </div>
            <h3 className="text-lg font-bold text-default-900 mb-1">No Shared Jobs</h3>
            <p className="text-sm text-default-500 max-w-md">
              There are currently no active jobs shared with your branch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Job Title</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Client / Location</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Margin Split</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submissions</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/job-posting/${job.id}`} className="font-semibold text-sm text-indigo-600 hover:underline">
                          {job.jobTitle}
                        </Link>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[9px] border-purple-200">
                          Co-Sourced
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {job.jobType}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          {job.jobCode}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> {job.clientName || "Direct"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location || job.workSetup || "Remote"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {job.marginSplitAmPct || job.marginSplitRecPct ? (
                        <div className="text-[11px] font-medium space-y-0.5">
                          <div>AM: <span className="font-bold text-slate-700">{job.marginSplitAmPct || 0}%</span></div>
                          <div>Rec: <span className="font-bold text-slate-700">{job.marginSplitRecPct || 0}%</span></div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Not specified</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs bg-slate-50">
                          {job.submissionsCount || 0}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/job-posting/${job.id}`}>
                        <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1">
                          View Details <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
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
