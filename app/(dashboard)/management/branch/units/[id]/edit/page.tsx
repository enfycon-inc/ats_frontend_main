"use client";

import { useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function Redirector() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = params?.id;
    const qs = searchParams.toString();
    const target = id ? `/management/units/${id}/edit` : "/management/units";
    router.replace(qs ? `${target}?${qs}` : target);
  }, [router, params, searchParams]);

  return null;
}

export default function BranchUnitsEditRedirectPage() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}
