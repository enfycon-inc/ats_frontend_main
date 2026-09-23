"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Redirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/management/units/new?${qs}` : "/management/units/new");
  }, [router, searchParams]);

  return null;
}

export default function BranchUnitsNewRedirectPage() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}
