"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function ResumeSearchPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    const market = (session?.user as any)?.defaultMarket || "US";
    if (market === "IN") {
      router.replace("/applicants/resume-search/domestic");
    } else {
      router.replace("/applicants/resume-search/usit");
    }
  }, [router, session, status]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650"></div>
    </div>
  );
}

