"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Pipeline view — for now redirects to main applicants page
// Future: pre-filter to Interviewing/Offered pipeline stages
export default function PipelinePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/applicants");
  }, [router]);
  return null;
}
