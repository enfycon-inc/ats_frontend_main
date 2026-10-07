"use client";

import React, { useMemo } from "react";

interface JobDescriptionViewProps {
  content?: string;
  jobTitle?: string;
  className?: string;
}

function sanitizeAndFormatJobDescription(raw: string, jobTitle?: string): string {
  if (!raw || !raw.trim()) return "";

  let str = raw.trim();

  // Check if string contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(str);

  if (hasHtml) {
    // 1. Clean up duplicate main heading if present at top
    if (jobTitle) {
      const escTitle = jobTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      str = str.replace(new RegExp(`^<(?:h[1-6]|p)>\\s*(?:#+\\s*|#+&nbsp;*)*${escTitle}\\s*<\\/(?:h[1-6]|p)>`, "i"), "");
    }

    // 2. Clean up markdown heading artifacts inside <p> or <h3> tags (e.g. <p>#&nbsp;Title</p> or <p>##&nbsp;Summary</p>)
    str = str
      .replace(/<(?:p|h[1-6])>\s*#+&nbsp;*([^<]+)<\/(?:p|h[1-6])>/gi, '<h3 class="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-slate-800">$1</h3>')
      .replace(/<(?:p|h[1-6])>\s*#+\s+([^<]+)<\/(?:p|h[1-6])>/gi, '<h3 class="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-slate-800">$1</h3>')
      .replace(/<p>\s*(\*\*([^*<]+)\*\*)\s*<\/p>/gi, '<h4 class="text-xs font-bold text-neutral-900 dark:text-white mt-3 mb-1">$2</h4>')
      .replace(/\*\*([^*<]+)\*\*/g, '<strong class="font-bold text-neutral-900 dark:text-white">$1</strong>');

    // 3. Clean up raw bullet points inside <p> tags (e.g. <p>*&nbsp;Design...</p> or <p>•&nbsp;Develop...</p>)
    str = str.replace(/<p>\s*(?:[\*\-\•]|&bull;|&middot;)&nbsp;*([^<]+)<\/p>/gi, '<li class="text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">$1</li>');
    str = str.replace(/<p>\s*(?:[\*\-\•]|&bull;|&middot;)\s+([^<]+)<\/p>/gi, '<li class="text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">$1</li>');

    // Wrap consecutive <li> into <ul>
    str = str.replace(/((?:<li[\s\S]*?<\/li>\s*)+)/gi, '<ul class="list-disc list-outside pl-4 space-y-1.5 my-2.5">$1</ul>');

    return str;
  }

  // Pure Markdown / Plaintext conversion
  let html = str;

  // Remove redundant title if at start
  if (jobTitle) {
    const escTitle = jobTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`^#*\\s*${escTitle}\\s*\\n+`, "i"), "");
  }

  // Convert headings
  html = html
    .replace(/^###\s+(.+)$/gm, '<h4 class="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mt-4 mb-2">$1</h4>')
    .replace(/^##\s+(.+)$/gm, '<h3 class="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-slate-800">$1</h3>')
    .replace(/^#\s+(.+)$/gm, '<h2 class="text-sm font-black text-neutral-900 dark:text-white mt-4 mb-2">$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-neutral-900 dark:text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-neutral-800 dark:text-neutral-200">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-slate-800 font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-neutral-200 dark:border-slate-700">$1</code>');

  // Convert bullet lists
  html = html.replace(/(?:^|\n)\*\s+(.+)/g, '\n<li class="text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">$1</li>');
  html = html.replace(/(?:^|\n)-\s+(.+)/g, '\n<li class="text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">$1</li>');

  // Wrap li into ul
  html = html.replace(/((?:<li[\s\S]*?<\/li>\s*)+)/g, '<ul class="list-disc list-outside pl-4 space-y-1.5 my-2.5">$1</ul>');

  // Convert remaining paragraphs
  const paragraphs = html.split(/\n{2,}/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return "";
    if (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<div")) return p;
    return `<p class="text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed mb-2.5">${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return html;
}

export function JobDescriptionView({ content = "", jobTitle, className = "" }: JobDescriptionViewProps) {
  const formattedHtml = useMemo(() => {
    return sanitizeAndFormatJobDescription(content, jobTitle);
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
