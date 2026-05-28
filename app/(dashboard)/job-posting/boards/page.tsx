import React from "react";
import { Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "External Job Boards - Enfysync ATS",
  description: "Configure external job boards integration.",
};

export default function JobBoardsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center font-sans">
      <div className="p-4 bg-purple-50 dark:bg-purple-955/20 text-purple-600 dark:text-purple-400 rounded-full">
        <Globe className="h-10 w-10" />
      </div>
      <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">External Job Boards Integration</h1>
      <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm">
        Connect and post job requirements to external portals like LinkedIn, Indeed, and ZipRecruiter.
      </p>
      <Button size="sm" className="bg-primary text-white font-bold cursor-pointer mt-2">
        <Plus className="h-4 w-4 mr-1.5" /> Connect Board
      </Button>
    </div>
  );
}
