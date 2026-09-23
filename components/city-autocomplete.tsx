"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { City, State, Country } from "country-state-city";
import { MapPin, Check, ChevronsUpDown, X } from "lucide-react";

export interface CitySelection {
  city: string;
  state: string;
  country: string;
  countryCode: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string, state?: string, country?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Type city name (e.g. Bhubaneswar, Dallas)...",
  disabled = false,
  className = "",
  id,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Pre-load common countries (India & US) + global search on demand
  const primaryCities = useMemo(() => {
    try {
      const inCities = City.getCitiesOfCountry("IN") || [];
      const usCities = City.getCitiesOfCountry("US") || [];
      return [...inCities, ...usCities];
    } catch {
      return [];
    }
  }, []);

  // Filter cities based on query
  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];

    const matches: CitySelection[] = [];
    const seen = new Set<string>();

    for (const c of primaryCities) {
      if (c.name.toLowerCase().includes(trimmed)) {
        const stateObj = State.getStateByCodeAndCountry(c.stateCode, c.countryCode);
        const countryObj = Country.getCountryByCode(c.countryCode);
        const stateName = stateObj?.name || c.stateCode || "";
        const countryName = countryObj?.name || (c.countryCode === "IN" ? "India" : "United States");
        const key = `${c.name}__${stateName}__${countryName}`;

        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            city: c.name,
            state: stateName,
            country: countryName,
            countryCode: c.countryCode,
          });
        }

        if (matches.length >= 15) break;
      }
    }

    return matches;
  }, [query, primaryCities]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: CitySelection) => {
    setQuery(item.city);
    setIsOpen(false);
    onChange(item.city, item.state, item.country);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    onChange(val); // allow manual typing
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Suggested Cities
          </div>
          {suggestions.map((item, idx) => (
            <button
              key={`${item.city}-${item.state}-${idx}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs">{item.countryCode === "IN" ? "🇮🇳" : "🇺🇸"}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{item.city}</span>
                <span className="text-slate-400 dark:text-slate-500">
                  {item.state ? `${item.state}, ` : ""}{item.country}
                </span>
              </div>
              {value?.toLowerCase() === item.city.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
