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
            <tr className="border-b border-amber-100 dark:border-amber-900/50">
              <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase">Job</th>
              <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase">Source Unit / Branch</th>
              <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase">SLA & Margin</th>
              <th className="py-2 px-6 text-[11px] font-bold text-amber-700/70 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {pendingRequests.map(req => (
              <tr key={req.id} className="hover:bg-amber-100/30 transition-colors">
                <td className="py-3 px-6">
                  <Link href={`/job-posting/${req.job?.id}`} className="font-semibold text-sm text-indigo-600 hover:underline">{req.job?.jobCode} - {req.job?.jobTitle}</Link>
                  <div className="text-xs text-default-500 mt-0.5 truncate max-w-xs">{req.notes || 'No notes'}</div>
                </td>
                <td className="py-3 px-6">
                  <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-white">
                    {req.sourceUnit?.name ? `${req.sourceBranch?.name ? req.sourceBranch.name + ' — ' : ''}${req.sourceUnit.name}` : (req.sourceBranch?.name || 'Branch')}
                  </Badge>
                </td>
                <td className="py-3 px-6 text-xs text-default-700">
                  <div className="font-medium">AM: {req.marginSplitAmPct ?? 0}% / REC: {req.marginSplitRecPct ?? 0}%</div>
                  <div className="text-default-500">{req.slaDaysTarget ? `${req.slaDaysTarget} Days SLA` : 'No SLA'}</div>
                </td>
                <td className="py-3 px-6 text-right space-x-2">
                  <Button size="sm" onClick={() => handleReject(req.id)} disabled={submittingId === req.id} className="bg-red-600 hover:bg-red-700 text-white">
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleAccept(req.id)} disabled={submittingId === req.id} className="bg-green-600 hover:bg-green-700 text-white">
                    {submittingId === req.id ? 'Accepting...' : 'Accept'}
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
