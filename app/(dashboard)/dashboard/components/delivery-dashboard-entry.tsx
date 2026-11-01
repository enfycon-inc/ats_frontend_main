"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DeliveryDashboardSkeleton } from "@/components/dashboard/delivery-dashboard-skeleton";
export default function DeliveryDashboardEntry() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/overview'); }, [router]);
  return <DeliveryDashboardSkeleton />;
}
