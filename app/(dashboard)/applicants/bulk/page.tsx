"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  History,
  Activity,
  FolderOpen,
  Sparkles,
  Zap,
  CheckCircle,
  Cpu,
  BarChart2,
  Layers,
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
      setHistory(data || []);
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
              toast.success("Batch resume parsing completed!");
              loadHistory();
            }
          }
        } catch (err) {
          console.error("Failed to poll batch status", err);
        }
      };

      fetchStatus();
      interval = setInterval(fetchStatus, 2000);
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
        toast.error("Failed to load batch history details.");
      }
    };
    fetchHistoryItem();
  }, [selectedHistoryId]);

  // Drag & drop handlers
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

  const handleStartBulkProcess = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    const toastId = toast.loading(`Uploading ${stagedFiles.length} resume files...`);

    try {
      const filesOnly = stagedFiles.map((s) => s.file);
      const res = await atsApi.candidates.uploadCvBulk(filesOnly);
      
      toast.success("Batch submitted into parsing engine queue!", { id: toastId });
      setActiveBatchId(res.bulkUploadId);
      setSelectedHistoryId(null);
      setBatchData(null);
      setPolling(true);
      clearStaging();
      loadHistory();
    } catch (err: any) {
      toast.error(`Batch submission failed: ${err.message}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!batchData || !batchData.batch) return 0;
    const { total_files, processed_files, failed_files } = batchData.batch;
    const done = (processed_files || 0) + (failed_files || 0);
    if (total_files === 0) return 0;
    return Math.round((done / total_files) * 100);
  };

  const totalHistoricalProcessed = history.reduce((acc, h) => acc + (h.processed_files || 0), 0);
  const totalHistoricalBatches = history.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-neutral-50/50 dark:bg-slate-950 font-sans p-6 space-y-5">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <Link href="/applicants/all">
            <button className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-indigo-600 dark:hover:text-neutral-200 transition-all cursor-pointer bg-transparent border-0 mb-1.5">
              <ChevronLeft className="h-4 w-4" /> Return to Candidate Database
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
                Batch Resume Parsing Engine
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 border border-indigo-200 dark:border-indigo-800">
                  HIGH-SCALE PARSER
                </Badge>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                High-throughput bulk CV parsing, deduplication, and candidate entity extraction queue
              </p>
            </div>
          </div>
        </div>

        {/* Top Summary Stat Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-xs">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Parsed</span>
              <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">{totalHistoricalProcessed} CVs</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-xs">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Batches</span>
              <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">{totalHistoricalBatches} Runs</span>
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-auto pr-1">
        
        {/* LEFT COLUMN: Dropzone & Staging List (col-span-6) */}
        <div className="lg:col-span-6 flex flex-col space-y-4 min-h-0">
          
          {/* Dropzone Card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col shadow-xs shrink-0">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30"
                  : "border-neutral-250 hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-500 bg-neutral-50/40 dark:bg-slate-950/40"
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
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-200/50 dark:border-indigo-800/50">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Drag &amp; drop bulk CV documents here
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                Supports PDF, DOCX, DOC, and TXT (Upload up to 500 CVs in a single batch)
              </p>
              <div className="mt-4 inline-flex items-center gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 cursor-pointer shadow-xs">
                  Browse Files
                </Button>
              </div>
            </div>
          </div>

          {/* Staging List Card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-5 flex-1 flex flex-col shadow-xs min-h-[280px]">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-150 dark:border-slate-800 shrink-0">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-600" /> 
                Staged Files Queue ({stagedFiles.length})
              </span>
              {stagedFiles.length > 0 && (
                <button
                  onClick={clearStaging}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors bg-transparent border-0 cursor-pointer"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto py-3 space-y-2 min-h-0">
              {stagedFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 text-xs italic space-y-2">
                  <FolderOpen className="h-8 w-8 text-neutral-300 dark:text-slate-800" />
                  <span>No files staged. Drag files into the box above to begin.</span>
                </div>
              ) : (
                stagedFiles.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-3 bg-neutral-50/60 dark:bg-slate-950/40 rounded-xl border border-neutral-200/80 dark:border-slate-800 text-xs transition-all hover:bg-neutral-50 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-neutral-400 text-[10px] font-mono select-none font-bold">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                        {s.file.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        ({(s.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeStagedFile(s.id)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer bg-transparent border-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Start Button */}
            {stagedFiles.length > 0 && (
              <div className="pt-3 border-t border-neutral-150 dark:border-slate-800 shrink-0">
                <Button
                  onClick={handleStartBulkProcess}
                  disabled={uploading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 h-10 gap-2 cursor-pointer shadow-xs"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {uploading ? "Submitting Queue..." : `Process ${stagedFiles.length} Resumes Now`}
                </Button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Active Batch Meter & History Logs (col-span-6) */}
        <div className="lg:col-span-6 flex flex-col space-y-4 min-h-0">
          
          {/* Active Batch Progress Card */}
          {batchData && (
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col shadow-xs space-y-4 shrink-0">
              <div className="flex justify-between items-center pb-3 border-b border-neutral-150 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {polling ? "Active Parsing Batch Progress" : "Batch Execution Report"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">
                  ID: {batchData.batch.id.substring(0, 8)}...
                </span>
              </div>

              {/* Progress Counters Grid */}
              <div className="grid grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-3 bg-neutral-50 dark:bg-slate-950/40 rounded-xl border border-neutral-200/80 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider mb-1">Total</span>
                  <span className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base">
                    {batchData.batch.total_files}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/40 dark:border-indigo-900/40">
                  <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block tracking-wider mb-1">Queued</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-base animate-pulse">
                    {batchData.batch.total_files - (batchData.batch.processed_files || 0) - (batchData.batch.failed_files || 0)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/40 dark:border-emerald-900/40">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider mb-1">Parsed</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-base">
                    {batchData.batch.processed_files || 0}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl border border-rose-200/40 dark:border-rose-900/40">
                  <span className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400 block tracking-wider mb-1">Failed</span>
                  <span className="font-extrabold text-rose-700 dark:text-rose-300 text-base">
                    {batchData.batch.failed_files || 0}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                  <span>Batch Throughput Progress</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{getProgressPercentage()}%</span>
                </div>
                <div className="w-full bg-neutral-150 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-[220px] overflow-auto border border-neutral-200 dark:border-slate-800 rounded-xl p-2 space-y-1.5 bg-neutral-50/30 dark:bg-slate-950/20">
                {batchData.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 border border-neutral-200/60 dark:border-slate-800 rounded-lg text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-neutral-850 dark:text-neutral-200 truncate flex items-center gap-2">
                        {item.status === "processing" && (
                          <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin shrink-0" />
                        )}
                        {item.status === "completed" && (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        {item.status === "failed" && (
                          <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        )}
                        {item.status === "queued" && (
                          <div className="h-2 w-2 rounded-full bg-neutral-350 shrink-0" />
                        )}
                        <span className="truncate">{item.filename}</span>
                      </p>
                      
                      {item.status === "completed" && (
                        <p className="text-[10px] text-neutral-500 mt-0.5 truncate font-medium">
                          Extracted: <strong className="text-neutral-800 dark:text-neutral-200">{item.candidate_name}</strong> ({item.candidate_email || "No email"})
                        </p>
                      )}
                      {item.status === "failed" && (
                        <p className="text-[10px] text-rose-600 mt-0.5 truncate font-bold">
                          {item.error_message}
                        </p>
                      )}
                    </div>

                    <div>
                      {item.status === "completed" && item.candidate_id && (
                        <Link href={`/applicants/${item.candidate_id}`} target="_blank">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            View <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Card Log */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-5 flex-1 flex flex-col shadow-xs min-h-[240px]">
            <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2 pb-3 border-b border-neutral-150 dark:border-slate-800 shrink-0">
              <History className="h-4 w-4 text-indigo-600" /> 
              Historical Batch Runs ({history.length})
            </span>

            <div className="flex-1 overflow-auto py-3 space-y-2 min-h-0">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 text-xs italic space-y-2">
                  <History className="h-8 w-8 text-neutral-300 dark:text-slate-800" />
                  <span>No historical batch runs recorded.</span>
                </div>
              ) : (
                history.map((h) => {
                  const done = (h.processed_files || 0) + (h.failed_files || 0);
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
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex justify-between items-center ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-xs"
                          : "border-neutral-200/80 hover:border-neutral-300 dark:border-slate-800 dark:hover:border-slate-700 hover:bg-neutral-50/50 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          Batch: {h.id.substring(0, 8)}...
                          <Badge
                            className={`text-[9px] uppercase font-bold border-0 px-2 py-0.5 ${
                              h.status === "completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {h.status}
                          </Badge>
                        </p>
                        <p className="text-[10px] text-neutral-500 font-semibold">
                          Run by: {h.created_by || "Tenant Admin"} • {dateStr}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-extrabold text-neutral-900 dark:text-neutral-100 text-xs">
                          {done} / {h.total_files} processed
                        </p>
                        {h.failed_files > 0 && (
                          <p className="text-[10px] text-rose-600 font-bold">
                            {h.failed_files} errors
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
