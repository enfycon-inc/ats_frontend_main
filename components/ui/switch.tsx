"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label className={cn(
        "relative inline-flex items-center cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only peer"
          ref={ref}
          {...props}
        />
        <div className={cn(
          "relative w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-indigo-600 transition-colors duration-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-200 peer-checked:after:translate-x-4",
          className
        )} />
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
