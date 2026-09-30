"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { atsApi } from "@/lib/ats-api";
import { Loader2 } from "lucide-react";

const IndiaStaffingForm = dynamic(() => import("./IndiaStaffingForm").then(mod => mod.IndiaStaffingForm), { ssr: false, loading: () => <FormLoader /> });
const UsStaffingForm = dynamic(() => import("./UsStaffingForm").then(mod => mod.UsStaffingForm), { ssr: false, loading: () => <FormLoader /> });
const GlobalStandardForm = dynamic(() => import("./GlobalStandardForm").then(mod => mod.GlobalStandardForm), { ssr: false, loading: () => <FormLoader /> });

function FormLoader() {
  return (
    <div className="flex h-[calc(100vh-100px)] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <span className="ml-3 text-sm font-medium text-slate-500">Loading Job Requisition Form...</span>
    </div>
  );
}

export default function NewJobPostingPage() {
  const [marketVariant, setMarketVariant] = useState<"USIT" | "INDIA" | "GLOBAL" | null>(null);

  useEffect(() => {
    async function determineMarket() {
      try {
        const units = await atsApi.businessUnits.list().catch(() => []);
        // Determine the initial unit to load based on active branch or first available
        const activeBranchId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        let matchedUnit = null;

        if (activeBranchId && activeBranchId !== "all") {
          matchedUnit = units.find((u: any) => u.branchId === activeBranchId);
        }
        if (!matchedUnit && units.length > 0) {
          matchedUnit = units[0];
        }

        if (matchedUnit) {
          const segmentCode = (matchedUnit.marketSegment?.code || matchedUnit.marketSegmentCode || matchedUnit.market || "").toUpperCase();
          if (segmentCode === "IND" || segmentCode === "INDIA" || segmentCode === "IN") {
            setMarketVariant("INDIA");
          } else if (segmentCode === "USIT" || segmentCode === "US" || segmentCode === "USA") {
            setMarketVariant("USIT");
          } else {
            // UAE, UK, AU, etc., map to the Global Standard Form
            setMarketVariant("GLOBAL");
          }
        } else {
          // Fallback if no business units exist
          setMarketVariant("GLOBAL");
        }
      } catch (err) {
        setMarketVariant("GLOBAL");
      }
    }
    determineMarket();
  }, []);

  if (!marketVariant) return <FormLoader />;

  if (marketVariant === "INDIA") return <IndiaStaffingForm />;
  if (marketVariant === "USIT") return <UsStaffingForm />;
  return <GlobalStandardForm />;
}
