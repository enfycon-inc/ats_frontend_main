"use client";

import * as React from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  setHours,
  setMinutes,
  isValid,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateTimePickerProps {
  value?: string; // ISO string, date string, or YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showTime?: boolean;
}

const COMMON_TIME_SLOTS = [
  "09:30 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:30 PM",
  "04:30 PM",
  "05:30 PM",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick date & time...",
  className,
  showTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse initial date
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  // Current viewing month
  const [viewDate, setViewDate] = React.useState<Date>(() => parsedDate || new Date());

  // Current selected time in 24h format "HH:mm"
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (!parsedDate) return "10:00";
    const hours = String(parsedDate.getHours()).padStart(2, "0");
    const mins = String(parsedDate.getMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  });

  // Sync state on external value changes
  React.useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
      const hours = String(parsedDate.getHours()).padStart(2, "0");
      const mins = String(parsedDate.getMinutes()).padStart(2, "0");
      setTimeValue(`${hours}:${mins}`);
    }
  }, [value]);

  // Generate calendar days for current view
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  const handleSelectDay = (day: Date) => {
    const [h, m] = (timeValue || "10:00").split(":").map(Number);
    const updated = setMinutes(setHours(day, h || 10), m || 0);
    onChange(updated.toISOString());
  };

  const handleTimeSlotSelect = (slot12h: string) => {
    const [timeStr, modifier] = slot12h.split(" ");
    let [hours, minutes] = timeStr.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const newTime24 = `${hh}:${mm}`;
    setTimeValue(newTime24);

    const baseDate = parsedDate || new Date();
    const updated = setMinutes(setHours(baseDate, hours), minutes);
    onChange(updated.toISOString());
  };

  const handleNativeTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    if (parsedDate && newTime) {
      const [h, m] = newTime.split(":").map(Number);
      const updated = setMinutes(setHours(parsedDate, h || 0), m || 0);
      onChange(updated.toISOString());
    }
  };

  const handlePresetSelect = (preset: "today" | "tomorrow" | "nextMonday") => {
    const today = new Date();
    let target = today;
    if (preset === "tomorrow") {
      target = addDays(today, 1);
    } else if (preset === "nextMonday") {
      const dayOfWeek = today.getDay();
      const daysUntilNextMon = ((1 - dayOfWeek + 7) % 7) || 7;
      target = addDays(today, daysUntilNextMon);
    }
    const [h, m] = (timeValue || "10:00").split(":").map(Number);
    const updated = setMinutes(setHours(target, h || 10), m || 0);
    setViewDate(updated);
    onChange(updated.toISOString());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group inline-flex items-center justify-between h-8.5 px-2.5 w-full text-left font-normal text-xs rounded-md border border-input bg-background shadow-xs transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent/60 hover:text-foreground hover:border-neutral-400 dark:hover:border-slate-600",
            parsedDate ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <CalendarIcon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", parsedDate ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="truncate">
              {parsedDate ? (
                showTime ? (
                  format(parsedDate, "MMM d, yyyy • h:mm a")
                ) : (
                  format(parsedDate, "PPP")
                )
              ) : (
                placeholder
              )}
            </span>
          </div>
          {parsedDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ml-1"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange("");
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-3 bg-popover text-popover-foreground border-border shadow-xl rounded-xl z-50 space-y-2.5"
        align="start"
      >
        {/* Quick Presets */}
        <div className="flex items-center justify-between pb-1.5 border-b border-border gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePresetSelect("today")}
            className="h-6 text-[11px] px-2 font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePresetSelect("tomorrow")}
            className="h-6 text-[11px] px-2 font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            Tomorrow
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePresetSelect("nextMonday")}
            className="h-6 text-[11px] px-2 font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            Next Mon
          </Button>
        </div>

        {/* Month & Navigation Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-foreground">
            {format(viewDate, "MMMM yyyy")}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setViewDate((prev) => subMonths(prev, 1))}
              className="h-6 w-6 rounded-md p-0 hover:bg-muted cursor-pointer shadow-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setViewDate((prev) => addMonths(prev, 1))}
              className="h-6 w-6 rounded-md p-0 hover:bg-muted cursor-pointer shadow-none"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_NAMES.map((w) => (
            <span key={w} className="text-[10px] font-semibold text-muted-foreground py-0.5">
              {w}
            </span>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((day, idx) => {
            const isSelected = parsedDate && isSameDay(day, parsedDate);
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isCurrentToday = isToday(day);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={cn(
                  "h-7 w-7 mx-auto flex items-center justify-center rounded-md text-xs font-normal transition-colors cursor-pointer",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isCurrentMonth && !isSelected && "text-foreground hover:bg-accent hover:text-accent-foreground",
                  isCurrentToday && !isSelected && "border border-primary text-primary font-medium",
                  isSelected && "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        {/* Time Selector */}
        {showTime && (
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Clock className="h-3.5 w-3.5 text-foreground" />
                <span>Time:</span>
              </div>
              <input
                type="time"
                value={timeValue}
                onChange={handleNativeTimeChange}
                className="h-6.5 px-2 text-xs rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Quick Time Slots */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {COMMON_TIME_SLOTS.slice(0, 4).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleTimeSlotSelect(slot)}
                  className="px-1 py-1 text-[10px] rounded border border-border bg-muted/30 hover:bg-primary hover:text-primary-foreground text-foreground text-center font-medium transition-colors cursor-pointer"
                >
                  {slot.replace(" ", "")}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {COMMON_TIME_SLOTS.slice(4, 8).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleTimeSlotSelect(slot)}
                  className="px-1 py-1 text-[10px] rounded border border-border bg-muted/30 hover:bg-primary hover:text-primary-foreground text-foreground text-center font-medium transition-colors cursor-pointer"
                >
                  {slot.replace(" ", "")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="h-6.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer px-2"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-6.5 text-xs px-3 font-medium cursor-pointer"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
