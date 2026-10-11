"use client";
import { CandidateSubmissionModal } from '@/components/job-posting/CandidateSubmissionModal';
export default function AddCandidateModal({ isOpen, onClose, job }: { isOpen: boolean; onClose: () => void; job: any }) {
  return <CandidateSubmissionModal open={isOpen} onOpenChange={open => { if (!open) onClose(); }} job={job} />;
}
