"use client";

import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import type { TrackerSubmission } from '@/lib/submission-contract';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

function useResumeDownload(submission: TrackerSubmission) {
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  async function download() {
    if (lock.current || !submission.resume?.canDownload) return;
    lock.current = true; setLoading(true);
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      const result = await atsApi.submissions.downloadResume(submission.id);
      url = URL.createObjectURL(result.blob);
      link = document.createElement('a');
      link.href = url;
      link.download = (result.filename || submission.resume.filename || 'resume').split(/[\\/]/).pop()!.replace(/[\r\n]/g, '_');
      document.body.appendChild(link); link.click();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to download the resume.'); }
    finally {
      link?.remove();
      // Let the browser start consuming the object URL before releasing it.
      if (url) { const completedUrl = url; setTimeout(() => URL.revokeObjectURL(completedUrl), 1000); }
      lock.current = false; setLoading(false);
    }
  }
  return { loading, download };
}

export function ResumeDownloadButton({ submission }: { submission: TrackerSubmission }) {
  const { loading, download } = useResumeDownload(submission);
  if (!submission.resume?.canDownload) return submission.resume?.available === false
    ? <span className="text-xs text-muted-foreground">No resume on file</span> : null;
  return <Button type="button" variant="outline" className="h-8 text-xs" disabled={loading} onClick={() => void download()}>
    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
    {loading ? 'Downloading…' : 'Download resume'}
  </Button>;
}

export function ResumeDownloadMenuItem({ submission }: { submission: TrackerSubmission }) {
  const { loading, download } = useResumeDownload(submission);
  if (!submission.resume?.canDownload) return null;
  return <DropdownMenuItem disabled={loading} onSelect={event => { event.preventDefault(); void download(); }}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    {loading ? 'Downloading…' : 'Download resume'}
  </DropdownMenuItem>;
}
