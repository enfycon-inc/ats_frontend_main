"use client";

import React from "react";
import { FileText, FolderOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DocumentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Documents Center</h1>
          <p className="text-xs text-slate-500">Manage tenant onboarding documents, contracts, and templates</p>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-600" />
            Document Repository
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-400 text-sm">
            No documents uploaded yet. Documents linked to client contracts and onboarding will appear here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
