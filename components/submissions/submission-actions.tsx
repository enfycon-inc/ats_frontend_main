"use client";

import Link from 'next/link';
import { PermanentDeleteMenuItem } from '@/components/shared/permanent-delete-menu-item';
import { ClipboardCheck, Eye, MoreHorizontal, Pencil } from 'lucide-react';
import type { TrackerSubmission } from '@/lib/submission-contract';
import type { TrackerAction } from '@/lib/submission-tracker';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResumeDownloadMenuItem } from './resume-download';

export function SubmissionActions({ submission, href, onAction, canEdit }: {
  submission: TrackerSubmission; href: string; onAction: (action: TrackerAction) => void; canEdit?: boolean;
}) {
  const caps = submission.capabilities;
  const editable = canEdit ?? Boolean(caps && (caps.review || caps.schedule || caps.outcome || caps.notes || caps.rate || Object.values(caps.results).some(Boolean)));
  return <div className="flex justify-center">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Submission actions" aria-label={`Actions for ${submission.candidateName || 'candidate'}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {caps?.review && submission.finalStatus === 'PENDING_APPROVAL' && <>
          <DropdownMenuItem className="text-[#1a4fa0] dark:text-blue-300" onSelect={() => { setTimeout(() => onAction('review'), 50); }}><ClipboardCheck className="h-4 w-4" />Review submission</DropdownMenuItem>
          <DropdownMenuSeparator />
        </>}
        {editable && <DropdownMenuItem onSelect={() => { setTimeout(() => onAction('rounds'), 50); }}><Pencil className="h-4 w-4" />Edit status</DropdownMenuItem>}
        <DropdownMenuItem asChild><Link href={href}><Eye className="h-4 w-4" />View details</Link></DropdownMenuItem>
        <ResumeDownloadMenuItem submission={submission} />
        <PermanentDeleteMenuItem kind="submission" id={submission.id} />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
