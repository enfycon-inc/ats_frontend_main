"use client";

import React, { useMemo } from "react";
import { 
  Briefcase, CheckCircle2, Award, ListChecks, Sparkles, 
  ChevronRight, Layers
} from "lucide-react";

interface JobDescriptionViewProps {
  content?: string;
  jobTitle?: string;
  className?: string;
}

interface SpecItem {
  key: string;
  value: string;
}

interface Section {
  title?: string;
  level: number;
  items: Array<{
    type: "paragraph" | "bullet" | "numbered" | "specs";
    text?: string;
    specs?: SpecItem[];
  }>;
}

function getSectionIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("responsibilit") || lower.includes("duties") || lower.includes("what you will do")) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  }
  if (lower.includes("requirement") || lower.includes("qualification") || lower.includes("must have") || lower.includes("eligibility")) {
    return <ListChecks className="h-4 w-4 text-indigo-500 shrink-0" />;
  }
  if (lower.includes("skill") || lower.includes("technolog") || lower.includes("tech stack")) {
    return <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />;
  }
  if (lower.includes("benefit") || lower.includes("perk") || lower.includes("offer") || lower.includes("compensation")) {
    return <Award className="h-4 w-4 text-rose-500 shrink-0" />;
  }
  if (lower.includes("summary") || lower.includes("about") || lower.includes("overview")) {
    return <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />;
  }
  return <Layers className="h-4 w-4 text-indigo-500 shrink-0" />;
}

function renderFormattedInlineText(text: string) {
  // Split by bold (**...**) and inline code (`...`) and italic (*...*)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-neutral-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-mono text-[11px] font-semibold border border-neutral-200 dark:border-slate-700">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-neutral-800 dark:text-neutral-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

export function JobDescriptionView({ content = "", jobTitle, className = "" }: JobDescriptionViewProps) {
  const parsedData = useMemo(() => {
    if (!content || !content.trim()) return null;

    // Check if it's pure HTML (e.g. from rich text editor without markdown # or **)
    const isHtml = /<[a-z][\s\S]*>/i.test(content) && !content.includes("## ") && !content.includes("**");
    if (isHtml) {
      return { isHtml: true, rawHtml: content };
    }

    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const topSpecs: SpecItem[] = [];
    const sections: Section[] = [];
    let currentSection: Section = { level: 2, items: [] };

    let isHeaderSection = true;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (!trimmed) {
        continue;
      }

      // Check if it's a top title "# Job Title"
      if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
        const titleText = trimmed.replace(/^#\s+/, "").trim();
        // Skip repeating main title if already known
        if (jobTitle && titleText.toLowerCase() === jobTitle.toLowerCase()) {
          continue;
        }
        continue;
      }

      // Check for Section Header "## Section Title" or "### Subtitle"
      if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
        isHeaderSection = false;
        if (currentSection.title || currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        const isH3 = trimmed.startsWith("### ");
        const titleText = trimmed.replace(/^###?\s+/, "").trim();
        currentSection = {
          title: titleText,
          level: isH3 ? 3 : 2,
          items: [],
        };
        continue;
      }

      // Check for Key-Value Metadata: "**Key:** Value" or "Key: Value"
      const specMatch = trimmed.match(/^\*\*([^*:]+):\*\*\s*(.+)$/) || trimmed.match(/^([A-Za-z\s]{3,25}):\s+([A-Za-z0-9\s,\-\/\[\]\(\)]+)$/);
      if (specMatch && isHeaderSection) {
        const key = specMatch[1].trim();
        const value = specMatch[2].trim().replace(/^\*\*/, "").replace(/\*\*$/, "");
        topSpecs.push({ key, value });
        continue;
      }

      // Check for bullet list item: "* item" or "- item" or "• item"
      if (/^[\*\-\•]\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^[\*\-\•]\s+/, "").trim();
        currentSection.items.push({
          type: "bullet",
          text: itemText,
        });
        continue;
      }

      // Check for numbered list: "1. item"
      if (/^\d+\.\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, "").trim();
        currentSection.items.push({
          type: "numbered",
          text: itemText,
        });
        continue;
      }

      // Regular paragraph
      currentSection.items.push({
        type: "paragraph",
        text: trimmed,
      });
    }

    if (currentSection.title || currentSection.items.length > 0) {
      sections.push(currentSection);
    }

    return {
      isHtml: false,
      topSpecs,
      sections,
    };
  }, [content, jobTitle]);

  if (!parsedData) {
    return <p className="text-xs text-neutral-450 italic py-3">No job description provided.</p>;
  }

  if (parsedData.isHtml) {
    return (
      <div
        className={`text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-none prose dark:prose-invert prose-xs ${className}`}
        dangerouslySetInnerHTML={{ __html: parsedData.rawHtml || "" }}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. TOP SPECIFICATIONS PILLS (Experience, Work Mode, Location, Notice Period, etc.) */}
      {parsedData.topSpecs && parsedData.topSpecs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3.5 bg-neutral-50/80 dark:bg-slate-850/60 rounded-xl border border-neutral-200/80 dark:border-slate-800">
          {parsedData.topSpecs.map((spec, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-neutral-200/60 dark:border-slate-800/80 shadow-2xs"
            >
              <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400">
                <ChevronRight className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider block">
                  {spec.key}
                </span>
                <span className="text-xs font-bold text-neutral-850 dark:text-neutral-150 truncate block">
                  {spec.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. STRUCTURED SECTIONS */}
      {parsedData.sections?.map((section, sIdx) => (
        <div key={sIdx} className="space-y-3">
          {section.title && (
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-slate-800">
              {getSectionIcon(section.title)}
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                {section.title}
              </h3>
            </div>
          )}

          <div className="space-y-2">
            {section.items.map((item, iIdx) => {
              if (item.type === "bullet") {
                return (
                  <div key={iIdx} className="flex items-start gap-2.5 pl-1 text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 shrink-0" />
                    <span>{renderFormattedInlineText(item.text || "")}</span>
                  </div>
                );
              }

              if (item.type === "numbered") {
                return (
                  <div key={iIdx} className="flex items-start gap-2.5 pl-1 text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">
                    <span className="text-[11px] font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                      {iIdx + 1}.
                    </span>
                    <span>{renderFormattedInlineText(item.text || "")}</span>
                  </div>
                );
              }

              return (
                <p key={iIdx} className="text-xs text-neutral-750 dark:text-neutral-300 leading-relaxed">
                  {renderFormattedInlineText(item.text || "")}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
