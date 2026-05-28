"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";

export function NavbarSearch() {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`
        relative flex items-center w-full max-w-[420px]
        transition-all duration-200
      `}
    >
      {/* Search icon */}
      <Search
        className={`
          absolute left-2.5 w-3.5 h-3.5 pointer-events-none
          transition-colors duration-150
          ${focused ? "text-white" : "text-white/50"}
        `}
      />

      <input
        ref={inputRef}
        id="navbar-global-search"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search jobs, candidates, clients..."
        aria-label="Global ATS search"
        className={`
          w-full h-[28px]
          pl-8 pr-8
          rounded
          text-[12.5px] text-white placeholder:text-white/45
          bg-white/10 dark:bg-white/8
          border border-transparent
          outline-none
          transition-all duration-200
          ${focused
            ? "bg-white/18 border-white/30 placeholder:text-white/60"
            : "hover:bg-white/14 hover:border-white/15"
          }
        `}
        autoComplete="off"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="
            absolute right-2 flex items-center justify-center
            w-4 h-4 rounded-full
            text-white/60 hover:text-white hover:bg-white/15
            transition-colors duration-150
            cursor-pointer
          "
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
