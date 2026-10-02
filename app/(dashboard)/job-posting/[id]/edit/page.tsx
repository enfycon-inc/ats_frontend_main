"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { atsApi } from "@/lib/ats-api";
import { Loader2 } from "lucide-react";

const IndiaStaffingForm = dynamic(() => import("../../../job-posting/new/IndiaStaffingForm").then(mod => mod.IndiaStaffingForm), { ssr: false, loading: () => <FormLoader /> });
const UsStaffingForm = dynamic(() => import("../../../job-posting/new/UsStaffingForm").then(mod => mod.UsStaffingForm), { ssr: false, loading: () => <FormLoader /> });
const GlobalStandardForm = dynamic(() => import("../../../job-posting/new/GlobalStandardForm").then(mod => mod.GlobalStandardForm), { ssr: false, loading: () => <FormLoader /> });

function FormLoader() {
  return (
    <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center flex-col gap-3 font-sans bg-slate-50/50 dark:bg-slate-900/10">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Loading Job Requisition...</span>
    </div>
  );
}

export default function EditJobPostingPage() {
  const params = useParams();
  const id = params.id as string;
  const [marketVariant, setMarketVariant] = useState<"USIT" | "INDIA" | "GLOBAL" | null>(null);

  useEffect(() => {
    async function determineMarketForEdit() {
      if (!id) return;
      try {
        const jobData = await atsApi.jobs.get(id);
        if (!jobData) {
          setMarketVariant("GLOBAL");
          return;
        }

        if (jobData.market) {
          const m = jobData.market.toUpperCase();
          if (m === "IN" || m === "INDIA" || m === "IND") {
            setMarketVariant("INDIA");
            return;
          } else if (m === "US" || m === "USA" || m === "USIT") {
            setMarketVariant("USIT");
            return;
          }
        }

        const units = await atsApi.businessUnits.list().catch(() => []);
        const matchedUnit = units.find((u: any) => 
          u.name?.toLowerCase() === jobData.businessUnit?.toLowerCase() || 
          u.id === jobData.businessUnitId
        );

        if (matchedUnit) {
          const segmentCode = (matchedUnit.marketSegment?.code || matchedUnit.marketSegmentCode || matchedUnit.market || "").toUpperCase();
          if (segmentCode === "IND" || segmentCode === "INDIA" || segmentCode === "IN") {
            setMarketVariant("INDIA");
          } else if (segmentCode === "USIT" || segmentCode === "US" || segmentCode === "USA") {
            setMarketVariant("USIT");
          } else {
            setMarketVariant("GLOBAL");
          }
        } else {
          setMarketVariant("GLOBAL");
        }
      } catch (err) {
        setMarketVariant("GLOBAL");
      }
    }
    determineMarketForEdit();
  }, [id]);

  if (!marketVariant) return <FormLoader />;

  if (marketVariant === "INDIA") return <IndiaStaffingForm editJobId={id} />;
  if (marketVariant === "USIT") return <UsStaffingForm editJobId={id} />;
  return <GlobalStandardForm editJobId={id} />;
}
