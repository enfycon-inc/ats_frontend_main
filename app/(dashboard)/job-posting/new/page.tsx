"use client";
import { jobFormContext } from "@/lib/job-form-context";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Loader2, Users } from "lucide-react";
import { PeopleFinder } from "@/components/common/people-finder";

const loadIndiaForm = () => import("./IndiaStaffingForm").then(mod => mod.IndiaStaffingForm);
const loadUsForm = () => import("./UsStaffingForm").then(mod => mod.UsStaffingForm);
const loadGlobalForm = () => import("./GlobalStandardForm").then(mod => mod.GlobalStandardForm);
const IndiaStaffingForm = dynamic(loadIndiaForm, { ssr: false, loading: () => <FormLoader /> });
const UsStaffingForm = dynamic(loadUsForm, { ssr: false, loading: () => <FormLoader /> });
const GlobalStandardForm = dynamic(loadGlobalForm, { ssr: false, loading: () => <FormLoader /> });

function FormLoader() { return <PageLoadingSkeleton variant="form" label="Loading job form" />; }

export default function NewJobPostingPage() {
  const [marketVariant, setMarketVariant] = useState<"USIT" | "INDIA" | "GLOBAL" | null>(null);
  const searchParams = useSearchParams();
  const onBehalf = searchParams.get("onBehalf") === "true";
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [targetLoading, setTargetLoading] = useState(onBehalf);

  useEffect(() => {
    if (!onBehalf) return;
    let disposed = false;
    atsApi.jobs.creationTargets().then((rows) => {
      if (!disposed) setTargets(Array.isArray(rows) ? rows : []);
    }).catch(() => { if (!disposed) setTargets([]); }).finally(() => { if (!disposed) setTargetLoading(false); });
    return () => { disposed = true; };
  }, [onBehalf]);

  useEffect(() => {
    const cached = atsApi.auth.getCurrentUser();
    const market = String(cached?.defaultMarket || cached?.market || '').toUpperCase();
    // Warm only the likely market chunk while the authoritative unit lookup runs.
    if (['IN', 'IND', 'INDIA'].includes(market)) void loadIndiaForm().catch(() => undefined);
    else if (['US', 'USIT', 'USA'].includes(market)) void loadUsForm().catch(() => undefined);
    async function determineMarket() {

      try {
        const [units, prof] = await Promise.all([
          jobFormContext.units().catch(() => []),
          jobFormContext.profile().catch(() => null)
        ]);
        
        const activeBranchId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
        let matchedUnit = null;

        // 1. If user has a hardcoded business unit assignment (Account Manager, etc), use that strictly
        if (prof && prof.businessUnitId) {
          matchedUnit = units.find((u: any) => u.id === prof.businessUnitId);
        }

        // 2. Otherwise fallback to the branch selection
        if (!matchedUnit && activeBranchId && activeBranchId !== "all") {
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

  const selectedOwner = targets.find((target) => target.id === selectedOwnerId);
  if (onBehalf && targetLoading) return <FormLoader />;
  if (onBehalf && !selectedOwner) return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Users className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create a job for a colleague</h2><p className="text-sm text-slate-500">Choose a job owner who has authorized you.</p></div></div>
        {targets.length ? <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Job owner
          <PeopleFinder options={targets} value={selectedOwnerId} onValueChange={setSelectedOwnerId} placeholder="Find a job owner you can represent" searchPlaceholder="Search authorized job owners..." emptyMessage="No authorized job owners found." />
        </label> : <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">You don’t have active access to create jobs for a colleague. Ask the account manager or an administrator to grant it.</p>}
      </section>
    </main>
  );
  if (!marketVariant) return <FormLoader />;

  const onBehalfBanner = onBehalf && selectedOwner ? <div className="mx-auto max-w-6xl px-6 pt-4"><div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">Creating this job for <strong>{selectedOwner.name}</strong> ({selectedOwner.email}). Your name will remain recorded as the creator.</div></div> : null;

  if (marketVariant === "INDIA") return <>{onBehalfBanner}<IndiaStaffingForm onBehalfOfUserId={selectedOwner?.id} /></>;
  if (marketVariant === "USIT") return <>{onBehalfBanner}<UsStaffingForm onBehalfOfUserId={selectedOwner?.id} /></>;
  return <>{onBehalfBanner}<GlobalStandardForm onBehalfOfUserId={selectedOwner?.id} /></>;
}
