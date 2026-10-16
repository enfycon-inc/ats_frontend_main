'use client';
import { useEffect, useRef, useState } from 'react';
import { atsApi } from '@/lib/ats-api';

function ResumePage({ candidateId, page, root }: { candidateId: string | number; page: number; root: React.RefObject<HTMLDivElement | null> }) {
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
    return () => { disposed = true; controller.abort(); observer.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [candidateId, page, root]);
  return <div ref={element} className="mb-3 min-h-64 bg-white border border-slate-200 rounded overflow-hidden">
    {url ? <img src={url} alt={`Resume page ${page}`} draggable={false} className="w-full h-auto" /> : <p role={error ? 'alert' : 'status'} className="p-4 text-xs text-slate-500">{error ? `Unable to display page ${page}. Reopen the resume to retry.` : `Loading page ${page}…`}</p>}
  </div>;
}
export function ResumePages({ candidateId }: { candidateId: string | number }) {
  const root = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false; setPages(0); setError('');
    atsApi.candidates.resumePreview(candidateId).then(result => { if (!disposed) setPages(result.pages); })
      .catch(() => { if (!disposed) setError('Unable to display this resume. PDF and DOCX are supported. Close and reopen to retry.'); });
    return () => { disposed = true; };
  }, [candidateId]);
  return <div ref={root} aria-label="Candidate resume" className="w-full min-h-0 flex-1 overflow-auto p-2 bg-slate-100 dark:bg-slate-950">
    {error ? <p role="alert" className="p-4 text-sm">{error}</p> : !pages ? <p role="status" className="p-4 text-sm">Loading resume…</p> : Array.from({ length: pages }, (_, index) => <ResumePage key={`${candidateId}:${index}`} candidateId={candidateId} page={index + 1} root={root} />)}
  </div>;
}
