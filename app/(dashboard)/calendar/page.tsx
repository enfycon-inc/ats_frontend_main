"use client";

import React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Interview & Schedule Calendar</h1>
          <p className="text-xs text-slate-500">Track candidate interviews, client meetings, and team schedules</p>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Upcoming Events & Interviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-400 text-sm">
            No scheduled interviews or events for today. Synced Microsoft 365 / Google Calendar events will appear here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
