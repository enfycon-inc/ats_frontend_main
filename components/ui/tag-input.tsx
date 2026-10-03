"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  value: string; // Comma separated string of tags
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({ value, onChange, placeholder, disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const tags = value.split(",").map(t => t.trim()).filter(Boolean);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        onChange(newTags.join(", "));
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty
      e.preventDefault();
      const newTags = tags.slice(0, -1);
      onChange(newTags.join(", "));
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags.join(", "));
  };

  return (
    <div 
      className={`flex flex-wrap items-center gap-1.5 p-2 w-full min-h-10 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
      onClick={() => !disabled && containerRef.current?.querySelector("input")?.focus()}
    >
      {tags.map((tag, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-md px-2 py-0.5 text-xs flex items-center gap-1"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 focus:outline-none"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          )}
        </Badge>
      ))}
      <input
        ref={containerRef as any}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="flex-1 bg-transparent min-w-[120px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none disabled:cursor-not-allowed"
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}
