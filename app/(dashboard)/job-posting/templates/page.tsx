import React from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Job Templates - Enfysync ATS",
  description: "Manage pre-configured job description templates.",
};

export default function JobTemplatesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center font-sans">
      <div className="p-4 bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 rounded-full">
        <FileText className="h-10 w-10" />
      </div>
      <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Job Templates Catalog</h1>
      <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm">
        Pre-configure and select requirement templates for developer, designer, and managerial postings.
      </p>
      <Button size="sm" className="bg-primary text-white font-bold cursor-pointer mt-2">
        <Plus className="h-4 w-4 mr-1.5" /> Create Template
      </Button>
    </div>
  );
}
