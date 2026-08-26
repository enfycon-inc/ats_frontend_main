"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorModalData {
  title?: string;
  message: string;
}

// Global helper to trigger the centered error modal from anywhere in the application
export function showErrorModal(message: string, title?: string) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("app_show_error_modal", {
      detail: { message, title: title || "Action Required" },
    });
    window.dispatchEvent(event);
  }
}

export function GlobalErrorModal() {
  const [errorData, setErrorData] = useState<ErrorModalData | null>(null);

  useEffect(() => {
    const handleShowError = (e: Event) => {
      const customEvent = e as CustomEvent<ErrorModalData>;
      if (customEvent.detail && customEvent.detail.message) {
        setErrorData(customEvent.detail);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("app_show_error_modal", handleShowError);
      return () => window.removeEventListener("app_show_error_modal", handleShowError);
    }
  }, []);

  if (!errorData) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              {errorData.title || "Action Required"}
            </h3>
          </div>
          <button
            onClick={() => setErrorData(null)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs text-slate-700 dark:text-slate-300 font-normal leading-relaxed break-words">
              {errorData.message}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {errorData.message.toLowerCase().includes("expired") || errorData.title === "Authentication Required" ? (
              <Button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("ats_access_token");
                    localStorage.removeItem("ats_current_user");
                    window.location.href = "/auth/login";
                  }
                  setErrorData(null);
                }}
                className="bg-[#1a4fa0] hover:bg-[#154185] text-white text-xs px-5 py-2 h-9 rounded-md font-medium shadow-xs transition-colors cursor-pointer"
              >
                Log In Again
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setErrorData(null)}
                className="bg-[#1a4fa0] hover:bg-[#154185] text-white text-xs px-5 py-2 h-9 rounded-md font-medium shadow-xs transition-colors cursor-pointer"
              >
                Understood
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
