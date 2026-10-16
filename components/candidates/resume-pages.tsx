'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { atsApi } from '@/lib/ats-api';
import { Button } from '@/components/ui/button';

function ResumePage({ candidateId, page, root, onHeight }: { candidateId: string | number; page: number; root: React.RefObject<HTMLDivElement | null>; onHeight: (page: number, height: number) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let objectUrl = ''; let started = false; let disposed = false;
    const controller = new AbortController();
    const load = () => {
      if (started) return; started = true;
      atsApi.candidates.resumePage(candidateId, page, controller.signal).then(blob => {
        if (!disposed) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
      }).catch(() => { if (!disposed) setError(true); });
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) load(); }, { root: root.current, rootMargin: '200px' });
    if (element.current) observer.observe(element.current);
    const sizeObserver = new ResizeObserver(() => {
      const height = element.current?.getBoundingClientRect().height;
      if (height && Number.isFinite(height)) onHeight(page, height + 12);
    });
    if (element.current) sizeObserver.observe(element.current);
    return () => { disposed = true; controller.abort(); observer.disconnect(); sizeObserver.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [candidateId, page, root, onHeight]);
  return <div ref={element} className="mb-3 min-h-64 bg-white border border-slate-200 rounded overflow-hidden">
    {url ? <img src={url} alt={`Resume page ${page}`} draggable={false} decoding="async" className="w-full h-auto" /> : <p role={error ? 'alert' : 'status'} className="p-4 text-xs text-slate-500">{error ? `Unable to display page ${page}. Reopen the resume to retry.` : `Loading page ${page}…`}</p>}
  </div>;
}

function ResumePagesContent({ candidateId }: { candidateId: string | number }) {
  const root = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [viewport, setViewport] = useState({ top: 0, height: 0, width: 0 });
  const [pageHeights, setPageHeights] = useState<number[]>([]);

  const reportPageHeight = useCallback((page: number, height: number) => {
    setPageHeights(current => {
      if (Math.abs((current[page - 1] || 0) - height) < 2) return current;
      const next = [...current]; next[page - 1] = height; return next;
    });
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setViewport(current => {
      const next = { top: element.scrollTop, height: element.clientHeight, width: element.clientWidth };
      return current.top === next.top && current.height === next.height && current.width === next.width ? current : next;
    });
    measure();
    element.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', measure); observer.disconnect(); };
  }, []);

  useEffect(() => {
    let disposed = false;
    atsApi.candidates.resumePreview(candidateId).then(result => { if (!disposed) setPages(result.pages); })
      .catch(() => { if (!disposed) setError('Unable to display preview. PDF and DOCX are supported.'); });
    return () => { disposed = true; };
  }, [candidateId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await atsApi.candidates.fetchResumeBlob(candidateId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = blob.type === 'application/pdf' ? '.pdf' : blob.type === 'application/msword' ? '.doc' : blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? '.docx' : '';
      link.download = `candidate-${candidateId}-resume${extension}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Unable to download the original resume.');
    } finally {
      setDownloading(false);
    }
  };

  const estimatedHeight = Math.max(320, Math.max(0, viewport.width - 24) * Math.SQRT2 + 12);
  const offsets = [0];
  for (let index = 0; index < pages; index++) offsets.push(offsets[index] + (pageHeights[index] || estimatedHeight));
  let firstVisible = 0;
  while (firstVisible < pages - 1 && offsets[firstVisible + 1] <= viewport.top) firstVisible++;
  let lastVisible = firstVisible;
  while (lastVisible < pages - 1 && offsets[lastVisible + 1] < viewport.top + viewport.height) lastVisible++;
  const firstPage = pages ? Math.max(0, firstVisible - 1) : 0;
  const endPage = pages ? Math.min(pages, lastVisible + 2) : 0;

  return <div ref={root} aria-label="Candidate resume" className="w-full min-h-0 flex-1 overflow-auto p-2 bg-slate-100 dark:bg-slate-950">
    {error ? (
      <div role="alert" className="p-6 text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <Button variant="outline" size="sm" disabled={downloading} onClick={handleDownload} className="text-xs">
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
          Download Original Resume
        </Button>
      </div>
    ) : !pages ? (
      <p role="status" className="p-4 text-sm">Loading resume…</p>
    ) : <>
      {firstPage > 0 && <div aria-hidden="true" style={{ height: offsets[firstPage] }} />}
      {Array.from({ length: endPage - firstPage }, (_, offset) => {
        const index = firstPage + offset;
        return <ResumePage key={`${candidateId}:${index}`} candidateId={candidateId} page={index + 1} root={root} onHeight={reportPageHeight} />;
      })}
      {endPage < pages && <div aria-hidden="true" style={{ height: offsets[pages] - offsets[endPage] }} />}
    </>}
  </div>;
}

export function ResumePages({ candidateId }: { candidateId: string | number }) {
  return <ResumePagesContent key={candidateId} candidateId={candidateId} />;
}
