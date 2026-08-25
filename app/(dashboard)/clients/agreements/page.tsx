"use client";

import React, { useState, useEffect, useCallback } from "react";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileCheck,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ClientAgreementsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAgreements = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsData = await atsApi.clients.list();
      const mappedAgreements = (clientsData || []).map((c: any) => ({
        id: c.id,
        clientCode: c.client_code,
        clientName: c.client_name,
        market: c.market || "US",
        paymentTerms: c.payment_terms || "Net 30",
        msaSigned: !!c.msa_signed,
        vmsConfigured: !!c.vendor_portal_created,
        tierRating: c.tier_rating || "TIER_1",
        createdOn: c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A",
        status: c.status || "Active",
      }));

      setAgreements(mappedAgreements);
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
      toast.error("Failed to load agreements.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const filteredAgreements = agreements.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.clientName.toLowerCase().includes(q) ||
      a.clientCode.toLowerCase().includes(q) ||
      a.paymentTerms.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-50 dark:bg-slate-950 font-sans p-6 overflow-auto">
      <div className="max-w-6xl w-full mx-auto space-y-6 pb-12">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-6 rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/clients/all")} className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-800 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" /> Contracts &amp; MSA Management Hub
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Centralized hub for Master Service Agreements (MSA), Fee Percentages, Payment Terms, and Compliance Verification.
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded-lg shadow-xs">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contracts by client name, client ID, or payment terms..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-neutral-50 dark:bg-slate-800 border-neutral-300">
            {filteredAgreements.length} Contracts
          </Badge>
        </div>

        {/* AGREEMENTS TABLE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading contracts hub...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-neutral-100/70 dark:bg-slate-800/50 border-b border-neutral-200 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Client Code</th>
                    <th className="p-3">Client Name</th>
                    <th className="p-3">Market</th>
                    <th className="p-3">MSA Status</th>
                    <th className="p-3">VMS Status</th>
                    <th className="p-3">Payment Terms</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 dark:divide-slate-800">
                  {filteredAgreements.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-600">{row.clientCode}</td>
                      <td className="p-3 font-bold text-neutral-900 dark:text-white">
                        <span onClick={() => router.push(`/clients/${row.id}`)} className="hover:underline cursor-pointer">
                          {row.clientName}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge className={row.market === "INDIA" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"}>
                          {row.market === "INDIA" ? "🇮🇳 India (₹)" : "🇺🇸 USA ($)"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {row.msaSigned ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> MSA Executed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                            <Clock className="h-3.5 w-3.5" /> Pending MSA
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {row.vmsConfigured ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> VMS Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-neutral-400 font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Not Setup
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-neutral-800 dark:text-neutral-200">{row.paymentTerms}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/clients/${row.id}/edit`)} className="h-7 text-xs text-indigo-600 font-bold">
                          Edit Terms →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
