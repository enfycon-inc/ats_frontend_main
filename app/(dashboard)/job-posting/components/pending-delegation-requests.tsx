import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { atsApi } from '@/lib/ats-api';
import toast from 'react-hot-toast';

export function PendingDelegationRequests({ onRefresh }: { onRefresh: () => void }) {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const delegations = await atsApi.jobs.getDelegations('incoming');
      setPendingRequests(delegations?.filter((d: any) => d.status === 'PENDING') || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    try {
      setSubmittingId(requestId);
      await atsApi.jobs.acceptDelegation(requestId, {});
      toast.success('Delegation accepted successfully!');
      fetchRequests();
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to accept delegation: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setSubmittingId(requestId);
      await atsApi.jobs.rejectDelegation(requestId, { notes: 'Rejected by Branch Admin' });
      toast.success('Delegation rejected.');
      fetchRequests();
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to reject delegation: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading || pendingRequests.length === 0) return null;

  return (
    <div className="border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10 rounded-lg overflow-hidden mb-4">
      <div className="px-6 py-3 border-b border-amber-100 dark:border-amber-900/50 bg-amber-100/50 dark:bg-amber-900/30">
        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <Icon icon="heroicons:bell-alert" className="h-4 w-4" />
          Pending Delegation Requests ({pendingRequests.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-amber-100 dark:border-amber-900/50 whitespace-nowrap bg-amber-50/50 dark:bg-amber-950/20">
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Job Code</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Job Title</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Client</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">End Client</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Priority</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Job Status</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Branch</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Branch Unit</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Shared By</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">Created By</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider text-center">Positions</th>
              <th className="py-2.5 px-4 text-[10px] font-bold text-amber-700/80 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {pendingRequests.map(req => (
              <tr key={req.id} className="hover:bg-amber-100/30 transition-colors whitespace-nowrap">
                <td className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{req.job?.jobCode || '-'}</td>
                <td className="py-3 px-4 max-w-[200px] truncate" title={req.job?.jobTitle}>
                  <Link href={`/job-posting/${req.job?.id}`} className="font-bold text-xs text-indigo-600 hover:underline">{req.job?.jobTitle || '-'}</Link>
                </td>
                <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{req.job?.client || '-'}</td>
                <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{req.job?.endClient || req.job?.endClientName || '-'}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${req.job?.priority?.toUpperCase() === 'HOT' ? 'text-rose-600 bg-rose-50 border-rose-200' : req.job?.priority?.toUpperCase() === 'COLD' ? 'text-sky-600 bg-sky-50 border-sky-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                    {req.job?.priority || req.job?.urgency || 'WARM'}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">{req.job?.status || req.job?.jobStatus || 'ACTIVE'}</Badge>
                </td>
                <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{req.sourceBranch?.name || '-'}</td>
                <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{req.sourceUnit?.name || '-'}</td>
                <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">{req.job?.createdBy || req.job?.accountManagerName || req.job?.accountManager?.name || '-'}</td>
                <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">{req.job?.createdBy || req.job?.accountManagerName || req.job?.accountManager?.name || '-'}</td>
                <td className="py-3 px-4 text-xs text-center font-bold text-slate-800 dark:text-slate-100">{req.job?.noOfPositions || req.job?.positions || req.job?.submissionRequired || 1}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Button size="sm" onClick={() => handleReject(req.id)} disabled={submittingId === req.id} className="bg-red-600 hover:bg-red-700 text-white h-7 text-[11px] px-3 shadow-xs cursor-pointer">
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleAccept(req.id)} disabled={submittingId === req.id} className="bg-green-600 hover:bg-green-700 text-white h-7 text-[11px] px-3 shadow-xs cursor-pointer">
                    {submittingId === req.id ? '...' : 'Accept'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
