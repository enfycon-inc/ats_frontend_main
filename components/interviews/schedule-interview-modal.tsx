"use client";

import { useRouter } from 'next/navigation';
import { UpdateSubmissionDialog } from '@/components/submissions/update-submission-dialog';
import type { TrackerSubmission } from '@/lib/submission-contract';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: { id: string | number; candidateName?: string; jobTitle?: string; jobCode?: string } | null;
  onSuccess?: () => void;
}

// All interview entry points use the same permission-aware editor and history.
export function ScheduleInterviewModal({ isOpen, onClose, submission, onSuccess }: ScheduleInterviewModalProps) {
  const router = useRouter();
  if (!isOpen || !submission) return null;
  const href = `/utility/submissions?submission=${encodeURIComponent(String(submission.id))}`;
  return <UpdateSubmissionDialog submission={{ ...submission, id: String(submission.id) } as TrackerSubmission}
    href={href} onClose={onClose} onReview={() => { onClose(); router.push(href); }}
    onSaved={() => { onSuccess?.(); onClose(); }} />;
}