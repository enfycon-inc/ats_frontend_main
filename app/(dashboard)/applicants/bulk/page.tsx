"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  History,
  Activity,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

interface FileStaging {
  file: File;
  id: string;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [stagedFiles, setStagedFiles] = useState<FileStaging[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await atsApi.candidates.getBulkUploads();
      setHistory(data);
    } catch (err: any) {
      console.error("Failed to load bulk uploads history", err);
    }
  };

  // Poll active batch progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeBatchId && polling) {
      const fetchStatus = async () => {
        try {
          const data = await atsApi.candidates.getBulkUpload(activeBatchId);
          if (data && data.batch) {
            setBatchData(data);
            if (data.batch.status === "completed") {
              setPolling(false);
              toast.success("All files in the batch have finished processing!");
              loadHistory();
            }
          }
        } catch (err) {
          console.error("Failed to poll batch status", err);
        }
      };

      // Initial call
      fetchStatus();

      // Setup interval (every 2.5s)
      interval = setInterval(fetchStatus, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeBatchId, polling]);

  // Load history item details
  useEffect(() => {
    const fetchHistoryItem = async () => {
      if (!selectedHistoryId) return;
      try {
        const data = await atsApi.candidates.getBulkUpload(selectedHistoryId);
        setBatchData(data);
      } catch (err) {
        toast.error("Failed to load history batch details.");
      }
    };
    fetchHistoryItem();
  }, [selectedHistoryId]);

  // Drag & drop file handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processSelectedFiles = (fileList: FileList) => {
    const newFiles: FileStaging[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Limit to PDF, DOC, DOCX, TXT
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext && ["pdf", "doc", "docx", "txt"].includes(ext)) {
        newFiles.push({
          file,
          id: Math.random().toString(36).substring(7),
        });
      } else {
        toast.error(`Unsupported format: ${file.name}`);
      }
    }
    setStagedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processSelectedFiles(e.target.files);
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearStaging = () => {
    setStagedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit staged files for upload
  const handleStartBulkProcess = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    const toastId = toast.loading(`Uploading ${stagedFiles.length} CV files...`);

    try {
      const filesOnly = stagedFiles.map((s) => s.file);
      const res = await atsApi.candidates.uploadCvBulk(filesOnly);
      
      toast.success("Upload complete! Enqueued in parsing queue.", { id: toastId });
      setActiveBatchId(res.bulkUploadId);
      setSelectedHistoryId(null); // Clear selected history viewing
      setBatchData(null);
      setPolling(true);
      clearStaging();
      loadHistory();
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Calculate Linear Progress Bar percentage
  const getProgressPercentage = () => {
    if (!batchData || !batchData.batch) return 0;
    const { total_files, processed_files, failed_files } = batchData.batch;
    const done = (processed_files || 0) + (failed_files || 0);
    if (total_files === 0) return 0;
    return Math.round((done / total_files) * 100);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-neutral-50 dark:bg-slate-955 font-sans p-4 space-y-4">
      
      {/* HEADER NAVIGATION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <Link href="/applicants/all">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 transition-all cursor-pointer bg-transparent border-0 mb-1">
              <ChevronLeft className="h-4 w-4" /> Back to Candidates
            </button>
          </Link>
          <h1 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-650" /> Bulk CV Upload
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Queue and parse multiple CV documents at once. Auto-matches and updates existing candidate profiles.
          </p>
        </div>
      </div>

      {/* DASHBOARD GRID WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-auto pr-1">
        
        {/* LEFT COLUMN: Upload Area & Staging (col-span-6) */}
        <div className="lg:col-span-6 flex flex-col space-y-4 min-h-0">
          
          {/* Staging Dropzone card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm p-5 flex flex-col shrink-0">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-indigo-650 bg-indigo-50/10"
                  : "border-neutral-250 hover:border-neutral-400 dark:border-slate-700 dark:hover:border-slate-600 bg-neutral-50/20 dark:bg-slate-950/20"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-9 w-9 mx-auto mb-3.5 text-indigo-500/80" />
              <p className="text-sm font-bold text-neutral-750 dark:text-neutral-350">
                Drag & drop candidate CVs here
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                Supports PDF, DOC, DOCX, and TXT (Max 10MB per file)
              </p>
              <Button size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer">
                Select Files
              </Button>
            </div>
          </div>

          {/* Staging Files List card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm p-4 flex-1 flex flex-col min-h-[250px]">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-slate-850 shrink-0">
              <span className="text-xs font-bold text-neutral-800 dark:text-white flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-neutral-400" /> Staging Files ({stagedFiles.length})
              </span>
              {stagedFiles.length > 0 && (
                <button
                  onClick={clearStaging}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors bg-transparent border-0 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto py-2.5 space-y-2 min-h-0">
              {stagedFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-450 dark:text-neutral-600 text-xs italic">
                  No files added to staging.
                </div>
              ) : (
                stagedFiles.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-slate-950/40 rounded border border-neutral-100 dark:border-slate-850 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-neutral-400 text-[10px] font-mono select-none">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <FileText className="h-4 w-4 text-indigo-500/80 shrink-0" />
                      <span className="font-bold text-neutral-750 dark:text-neutral-300 truncate">
                        {s.file.name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        ({(s.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeStagedFile(s.id)}
                      className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50/20 transition-all cursor-pointer bg-transparent border-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Start Button */}
            {stagedFiles.length > 0 && (
              <div className="pt-3 border-t border-neutral-100 dark:border-slate-850 shrink-0">
                <Button
                  onClick={handleStartBulkProcess}
                  disabled={uploading}
                  className="w-full bg-emerald-650 hover:bg-emerald-750 text-white text-xs font-bold gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Uploading..." : `Process ${stagedFiles.length} CVs Now`}
                </Button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Active Progress & Queue status (col-span-6) */}
        <div className="lg:col-span-6 flex flex-col space-y-4 min-h-0">
          
          {/* Active batch statistics and progress bar */}
          {batchData && (
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm p-4 flex flex-col shrink-0 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-slate-850">
                <span className="text-xs font-extrabold text-neutral-800 dark:text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  {polling ? "Active Parsing Batch" : "Batch Parsing Summary"}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {batchData.batch.id.substring(0, 8)}...
                </span>
              </div>

              {/* Progress Counters grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-neutral-50 dark:bg-slate-950/40 rounded border border-neutral-100 dark:border-slate-850">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider mb-0.5">Total</span>
                  <span className="font-extrabold text-neutral-800 dark:text-neutral-250 text-sm">
                    {batchData.batch.total_files}
                  </span>
                </div>
                <div className="p-2 bg-indigo-50/10 dark:bg-indigo-950/10 rounded border border-indigo-100/30">
                  <span className="text-[9px] uppercase font-bold text-indigo-500 block tracking-wider mb-0.5">Queued</span>
                  <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-sm animate-pulse">
                    {batchData.batch.total_files - (batchData.batch.processed_files || 0) - (batchData.batch.failed_files || 0)}
                  </span>
                </div>
                <div className="p-2 bg-emerald-50/10 dark:bg-emerald-950/10 rounded border border-emerald-100/30">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block tracking-wider mb-0.5">Parsed</span>
                  <span className="font-extrabold text-emerald-755 dark:text-emerald-400 text-sm">
                    {batchData.batch.processed_files || 0}
                  </span>
                </div>
                <div className="p-2 bg-rose-50/10 dark:bg-rose-950/10 rounded border border-rose-100/30">
                  <span className="text-[9px] uppercase font-bold text-rose-500 block tracking-wider mb-0.5">Failed</span>
                  <span className="font-extrabold text-rose-650 dark:text-rose-400 text-sm">
                    {batchData.batch.failed_files || 0}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-neutral-500">
                  <span>Batch Progress</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-neutral-200/20">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              {/* Live Batch Item Queue */}
              <div className="max-h-[250px] overflow-auto border border-neutral-100 dark:border-slate-850 rounded p-1.5 space-y-1.5 bg-neutral-50/20 dark:bg-slate-950/15">
                {batchData.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 border border-neutral-150/40 dark:border-slate-850/50 rounded-sm text-[11px]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-neutral-800 dark:text-neutral-200 truncate flex items-center gap-1.5">
                        {item.status === "processing" && (
                          <Loader2 className="h-3 w-3 text-indigo-500 animate-spin" />
                        )}
                        {item.status === "completed" && (
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                        )}
                        {item.status === "failed" && (
                          <XCircle className="h-3 w-3 text-rose-500" />
                        )}
                        {item.status === "queued" && (
                          <div className="h-2 w-2 rounded-full bg-neutral-350" />
                        )}
                        {item.filename}
                      </p>
                      
                      {/* Subtitle details */}
                      {item.status === "completed" && (
                        <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          Extracted: <strong className="text-neutral-700 dark:text-neutral-300">{item.candidate_name}</strong> ({item.candidate_email || "No email"})
                        </p>
                      )}
                      {item.status === "failed" && (
                        <p className="text-[10px] text-rose-550 mt-0.5 truncate font-medium">
                          {item.error_message}
                        </p>
                      )}
                    </div>

                    <div>
                      {item.status === "completed" && item.candidate_id && (
                        <Link href={`/applicants/${item.candidate_id}`} target="_blank">
                          <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px] text-indigo-650 hover:text-indigo-750">
                            View <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History card log */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm p-4 flex-1 flex flex-col min-h-[220px]">
            <span className="text-xs font-bold text-neutral-800 dark:text-white flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-slate-850 shrink-0">
              <History className="h-4 w-4 text-neutral-400" /> Upload Batch History
            </span>

            <div className="flex-1 overflow-auto py-2.5 space-y-2 min-h-0">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-450 dark:text-neutral-600 text-xs italic">
                  No historical batches found.
                </div>
              ) : (
                history.map((h) => {
                  const done = h.processed_files + h.failed_files;
                  const isFinished = h.status === "completed";
                  const dateStr = new Date(h.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isSelected = selectedHistoryId === h.id || activeBatchId === h.id;

                  return (
                    <div
                      key={h.id}
                      onClick={() => {
                        setSelectedHistoryId(h.id);
                        setActiveBatchId(h.id);
                        if (!isFinished) {
                          setPolling(true);
                        } else {
                          setPolling(false);
                        }
                      }}
                      className={`p-2.5 rounded border text-xs cursor-pointer transition-all flex justify-between items-center ${
                        isSelected
                          ? "border-indigo-650 bg-indigo-50/10 shadow-xs"
                          : "border-neutral-150 hover:border-neutral-300 dark:border-slate-850 dark:hover:border-slate-750 hover:bg-neutral-50/40 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-neutral-850 dark:text-neutral-200 flex items-center gap-1.5">
                          Batch ID: {h.id.substring(0, 8)}...
                          <Badge
                            variant={h.status === "completed" ? "success" : "secondary"}
                            className="text-[9px] uppercase tracking-wide px-1 py-0"
                          >
                            {h.status}
                          </Badge>
                        </p>
                        <p className="text-[10px] text-neutral-500 font-semibold">
                          Created by: {h.created_by} • {dateStr}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-extrabold text-neutral-750 dark:text-neutral-300 text-xs">
                          {done} / {h.total_files} processed
                        </p>
                        {h.failed_files > 0 && (
                          <p className="text-[10px] text-rose-600 font-bold">
                            {h.failed_files} failed
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
