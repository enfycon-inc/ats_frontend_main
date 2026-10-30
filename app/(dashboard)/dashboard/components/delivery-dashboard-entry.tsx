"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
export default function DeliveryDashboardEntry() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/overview'); }, [router]);
  return <Skeleton className="h-64 w-full" aria-label="Opening delivery overview" />;
}
