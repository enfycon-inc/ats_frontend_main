"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InterviewsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/applicants");
  }, [router]);
  return null;
}
