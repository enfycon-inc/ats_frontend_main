"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Code, Eye, Sparkles, FileText } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-b-lg animate-pulse flex items-center justify-center text-xs text-neutral-400">
      Loading Rich Text Editor...
    </div>
  ),
}) as any;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

/**
 * Helper to convert pasted raw Markdown string (e.g. **bold**, ## Header, * List) to HTML
 */
function convertMarkdownToHtml(text: string): string {
  if (!text) return "";
  
  // If it already looks like HTML (has tags), preserve as HTML
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  let html = text;

  // Escape basic HTML chars before converting markdown
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers (### Header 3, ## Header 2, # Header 1)
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Bullet Lists (* item or - item)
  html = html.replace(/^\s*[\*\-] (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gis, "<ul>$1</ul>");
  // Clean nested duplicate <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Numbered Lists (1. item)
  html = html.replace(/^\s*\d+\. (.*$)/gim, "<li>$1</li>");

  // Paragraphs (line breaks)
  const lines = html.split(/\n\s*\n/);
  html = lines
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<li")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("");

  return html;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type or paste rich job description from Word, PDF, or Docs...",
  className,
  minHeight = "240px",
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value || "");

  // Sync internal state when external value updates
  useEffect(() => {
    setHtmlValue(value || "");
  }, [value]);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "align",
    "blockquote",
    "code-block",
    "link",
  ];

  const handleEditorChange = (content: string) => {
    setHtmlValue(content);
    onChange(content);
  };

  const handleHtmlInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setHtmlValue(newVal);
    onChange(newVal);
  };

  const handleAutoFormatMarkdown = () => {
    const formatted = convertMarkdownToHtml(htmlValue);
    setHtmlValue(formatted);
    onChange(formatted);
  };

  return (
    <div className={cn("w-full border border-neutral-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs", className)}>
      {/* Editor Header Toolbar Controls */}
      <div className="flex items-center justify-between bg-neutral-50 dark:bg-slate-850 px-3 py-2 border-b border-neutral-200 dark:border-slate-800 text-xs font-semibold">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span>Job Description Rich Text Editor</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Convert Raw Markdown to HTML Button */}
          {htmlValue && (htmlValue.includes("**") || htmlValue.includes("##") || htmlValue.includes("* ")) && (
            <button
              type="button"
              onClick={handleAutoFormatMarkdown}
              className="px-2.5 py-1 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Convert Markdown syntax (**bold**, ## headings, lists) to formatted HTML"
            >
              <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
              Format Markdown to Rich HTML
            </button>
          )}

          {/* Toggle HTML Source Mode */}
          <button
            type="button"
            onClick={() => setIsHtmlMode(!isHtmlMode)}
            className={cn(
              "px-2.5 py-1 rounded text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer",
              isHtmlMode
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700"
            )}
          >
            {isHtmlMode ? (
              <>
                <Eye className="h-3 w-3" /> Visual Editor
              </>
            ) : (
              <>
                <Code className="h-3 w-3" /> HTML Source
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative">
        {isHtmlMode ? (
          <textarea
            value={htmlValue}
            onChange={handleHtmlInputChange}
            className="w-full bg-neutral-900 text-emerald-400 p-3 text-xs font-mono outline-hidden border-none resize-y leading-relaxed font-normal"
            style={{ minHeight }}
            placeholder="<html><body>Raw HTML Source Code...</body></html>"
          />
        ) : (
          <div className="quill-custom-wrapper text-neutral-900 dark:text-neutral-100">
            <ReactQuill
              theme="snow"
              value={htmlValue}
              onChange={handleEditorChange}
              modules={modules}
              formats={formats}
              placeholder={placeholder}
              style={{ minHeight }}
            />
          </div>
        )}
      </div>

      {/* Embedded CSS overrides for Quill Dark Mode & Typography */}
      <style jsx global>{`
        .quill-custom-wrapper .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
          background-color: rgba(248, 250, 252, 0.5) !important;
          padding: 6px 10px !important;
        }
        .dark .quill-custom-wrapper .ql-toolbar.ql-snow {
          border-bottom: 1px solid rgba(30, 41, 59, 0.8) !important;
          background-color: rgba(15, 23, 42, 0.6) !important;
        }
        .dark .quill-custom-wrapper .ql-snow .ql-stroke {
          stroke: #cbd5e1 !important;
        }
        .dark .quill-custom-wrapper .ql-snow .ql-fill {
          fill: #cbd5e1 !important;
        }
        .dark .quill-custom-wrapper .ql-snow .ql-picker {
          color: #cbd5e1 !important;
        }
        .dark .quill-custom-wrapper .ql-snow .ql-picker-options {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        .quill-custom-wrapper .ql-container.ql-snow {
          border: none !important;
          font-family: inherit !important;
          font-size: 0.8125rem !important;
        }
        .quill-custom-wrapper .ql-editor {
          min-height: ${minHeight} !important;
          padding: 12px 16px !important;
          line-height: 1.6 !important;
        }
        .quill-custom-wrapper .ql-editor.ql-blank::before {
          color: #94a3b8 !important;
          font-style: normal !important;
        }
        .dark .quill-custom-wrapper .ql-editor.ql-blank::before {
          color: #64748b !important;
        }
        .quill-custom-wrapper .ql-editor h1 {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          margin-top: 0.75rem !important;
          margin-bottom: 0.5rem !important;
        }
        .quill-custom-wrapper .ql-editor h2 {
          font-size: 1.125rem !important;
          font-weight: 700 !important;
          margin-top: 0.75rem !important;
          margin-bottom: 0.5rem !important;
        }
        .quill-custom-wrapper .ql-editor h3 {
          font-size: 1rem !important;
          font-weight: 600 !important;
          margin-top: 0.5rem !important;
          margin-bottom: 0.25rem !important;
        }
        .quill-custom-wrapper .ql-editor ul, .quill-custom-wrapper .ql-editor ol {
          padding-left: 1.25rem !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.5rem !important;
        }
      `}</style>
    </div>
  );
}
