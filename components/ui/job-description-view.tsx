"use client";

import React, { useMemo } from "react";
import { formatJobDescription } from "@/lib/job-description-format";

interface JobDescriptionViewProps {
  content?: string;
  jobTitle?: string;
  className?: string;
}

export function JobDescriptionView({ content = "", jobTitle, className = "" }: JobDescriptionViewProps) {
  const formattedHtml = useMemo(() => {
    return formatJobDescription(content, jobTitle);
  }, [content, jobTitle]);

  if (!formattedHtml) {
    return <p className="text-xs text-neutral-450 italic py-2">No job description provided.</p>;
  }

  return (
    <div
      className={`break-words overflow-hidden text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-none space-y-2 [&_h1]:text-base [&_h1]:font-black [&_h1]:text-neutral-900 dark:[&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-neutral-900 dark:[&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-neutral-900 dark:[&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2 [&_li]:text-xs [&_li]:leading-relaxed [&_strong]:font-bold [&_strong]:text-neutral-900 dark:[&_strong]:text-white [&_b]:font-bold [&_b]:text-neutral-900 dark:[&_b]:text-white ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
}
