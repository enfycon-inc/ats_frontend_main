"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type ReactQuillInstance from "react-quill-new";
import { formatJobDescription, hasJobDescriptionMarkdown, MAX_JOB_DESCRIPTION_CHARS, sanitizeJobDescription } from "@/lib/job-description-format";
import { cn } from "@/lib/utils";
import { Code, Eye, Sparkles, FileText } from "lucide-react";
import toast from "react-hot-toast";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(async () => {
  const { default: Editor } = await import("react-quill-new");
  return function QuillEditor({ forwardedRef, ...props }: React.ComponentProps<typeof ReactQuillInstance> & { forwardedRef: React.Ref<ReactQuillInstance> }) {
    return <Editor ref={forwardedRef} {...props} />;
  };
}, {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-b-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-400 dark:border-slate-800 dark:bg-slate-900">Loading Rich Text Editor...</div>,
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type or paste rich job description from Word, PDF, or Docs...",
  className,
  minHeight = "240px",
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(() => sanitizeJobDescription(value || ""));
  const quillRef = useRef<ReactQuillInstance | null>(null);

  // Sync internal state when external value updates
  useEffect(() => {
    setHtmlValue(isHtmlMode ? value || "" : sanitizeJobDescription(value || ""));
  }, [value, isHtmlMode]);

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
    const safe = sanitizeJobDescription(content);
    setHtmlValue(safe);
    onChange(safe);
  };

  const handleHtmlInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setHtmlValue(newVal);
    onChange(newVal);
  };

  const handleAutoFormatMarkdown = () => {
    const formatted = formatJobDescription(htmlValue);
    setHtmlValue(formatted);
    onChange(formatted);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const html = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");
    if (!html && !plain) return;
    if (plain.length > MAX_JOB_DESCRIPTION_CHARS) {
      event.preventDefault();
      event.stopPropagation();
      toast.error("This job description is too large to process in one paste. Split it into smaller sections and paste them separately.");
      return;
    }
    const usePlainText = hasJobDescriptionMarkdown(plain) || !html;
    const source = usePlainText ? plain : html;
    const maxPasteLength = MAX_JOB_DESCRIPTION_CHARS * (usePlainText ? 1 : 4);
    if (source.length > maxPasteLength) {
      event.preventDefault();
      event.stopPropagation();
      toast.error("This job description is too large to process in one paste. Split it into smaller sections and paste them separately.");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const formatted = formatJobDescription(source);
    if (!formatted) return;
    const selection = editor.getSelection(true) || { index: Math.max(0, editor.getLength() - 1), length: 0 };
    const delta = editor.clipboard.convert({ html: formatted });
    const Delta = (editor.constructor as typeof import('quill').default).import('delta');
    editor.history.cutoff();
    editor.updateContents(new Delta().retain(selection.index).delete(selection.length).concat(delta), 'user');
    editor.setSelection(selection.index + delta.length(), 0, 'silent');
    editor.history.cutoff();
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      const formatted = formatJobDescription(htmlValue);
      setHtmlValue(formatted);
      onChange(formatted);
    }
    setIsHtmlMode(!isHtmlMode);
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
          {htmlValue && hasJobDescriptionMarkdown(htmlValue.replace(/<[^>]+>/g, "\n")) && (
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
            onClick={toggleHtmlMode}
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
          <div className="quill-custom-wrapper text-neutral-900 dark:text-neutral-100" onPasteCapture={handlePaste}>
            <ReactQuill
              forwardedRef={quillRef}
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
