"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Only show the loading overlay after a short delay to prevent flash on fast loads.
// This also self-dismisses after 5s as a safety net against infinite loading.
export default function Loading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after 300ms — avoids flash for instant navigations
    const showTimer = setTimeout(() => setVisible(true), 300);
    // Safety dismiss after 5s — prevents permanent stuck state
    const hideTimer = setTimeout(() => setVisible(false), 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="p-6 text-center fixed h-[100vh] start-0 top-0 w-full z-50 bg-white dark:bg-neutral-900 flex justify-center items-center gap-2">
      <Loader2 className="animate-spin !w-8 !h-8 text-primary" />
      <span className="text-xl font-semibold">Loading...</span>
    </div>
  );
}
