"use client";

import * as React from "react";
import PhoneInputWithCountrySelect, {
  Country,
  Value,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: Country;
  market?: "US" | "IN" | "DOMESTIC" | string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  market,
  placeholder,
  className,
  disabled,
  id,
  name,
}: PhoneInputProps) {
  // Resolve default country: US for US IT market, IN for domestic India market
  const resolvedDefaultCountry: Country = React.useMemo(() => {
    if (defaultCountry) return defaultCountry;
    if (market) {
      const upper = String(market).toUpperCase();
      if (upper === "US" || upper === "USA" || upper === "IT" || upper.includes("US")) {
        return "US";
      }
      if (upper === "IN" || upper === "DOMESTIC" || upper === "INDIA" || upper.includes("DOMESTIC")) {
        return "IN";
      }
    }
    return "IN";
  }, [defaultCountry, market]);

  return (
    <div className={cn("phone-input-custom-wrapper relative w-full font-sans", className)}>
      <PhoneInputWithCountrySelect
        id={id}
        name={name}
        international
        defaultCountry={resolvedDefaultCountry}
        value={value as Value}
        onChange={(val) => onChange?.(val || "")}
        placeholder={placeholder || (resolvedDefaultCountry === "US" ? "(555) 000-0000" : "98765 43210")}
        disabled={disabled}
      />
      <style jsx global>{`
        /* ── Wrapper ── */
        .phone-input-custom-wrapper .PhoneInput {
          display: flex;
          align-items: center;
          width: 100%;
          height: 36px; /* matches h-9 = 36px of the standard Input component */
          border-radius: 0.375rem; /* rounded-md */
          border: 1px solid var(--border, #e2e8f0);
          background: transparent;
          padding: 0 0.75rem;
          font-size: 0.75rem;
          transition: color 0.15s, box-shadow 0.15s, border-color 0.15s;
          box-shadow: 0 1px 2px 0 rgba(0,0,0,0.04);
          outline: none;
        }

        /* ── Focus ring — matches indigo-500 used by Input + textarea ── */
        .phone-input-custom-wrapper .PhoneInput:focus-within {
          border-color: #6366f1; /* indigo-500 */
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3); /* indigo-500/30 */
          outline: none;
        }

        /* Dark mode border */
        .dark .phone-input-custom-wrapper .PhoneInput {
          border-color: var(--border, #334155);
          background: var(--input, rgba(255,255,255,0.03));
        }

        /* ── Country selector side ── */
        .phone-input-custom-wrapper .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 8px;
          position: relative;
          flex-shrink: 0;
        }
        .phone-input-custom-wrapper .PhoneInputCountrySelect {
          position: absolute;
          inset: 0;
          z-index: 10;
          border: 0;
          opacity: 0;
          cursor: pointer;
        }
        .phone-input-custom-wrapper .PhoneInputCountryIcon {
          width: 20px;
          height: 14px;
          border-radius: 2px;
          box-shadow: 0 0 1px rgba(0,0,0,0.35);
          object-fit: cover;
          flex-shrink: 0;
        }
        .phone-input-custom-wrapper .PhoneInputCountryIcon--border {
          box-shadow: none;
        }
        .phone-input-custom-wrapper .PhoneInputCountrySelectArrow {
          display: block;
          width: 4px;
          height: 4px;
          border-style: solid;
          border-color: currentColor;
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
          opacity: 0.55;
          margin-top: -2px;
        }

        /* ── Phone text input ── */
        .phone-input-custom-wrapper .PhoneInputInput {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.75rem;
          color: inherit;
          height: 100%;
        }

        /* Disabled state */
        .phone-input-custom-wrapper .PhoneInput--disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default PhoneInput;
