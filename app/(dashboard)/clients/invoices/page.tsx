"use client";

import React, { useState, useEffect, useCallback } from "react";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  Building,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Loader2,
  ArrowLeft,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ClientInvoicesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsData = await atsApi.clients.list();
      const mockInvoices: any[] = [];

      (clientsData || []).forEach((c: any, index: number) => {
        mockInvoices.push({
          id: `INV-${c.client_code}-${index + 101}`,
          clientCode: c.client_code,
          clientName: c.client_name,
          candidateName: `Placed Candidate ${index + 1}`,
          amount: c.market === "INDIA" ? `₹${(150000 + index * 25000).toLocaleString('en-IN')}` : `$${(12000 + index * 1500).toLocaleString('en-US')}`,
          dueDate: new Date(Date.now() + (index + 1) * 7 * 86400000).toLocaleDateString(),
          paymentTerms: c.payment_terms || "Net 30",
          status: index % 3 === 0 ? "PAID" : index % 3 === 1 ? "PENDING" : "OVERDUE",
          market: c.market || "US",
          clientId: c.id
        });
      });

      setInvoices(mockInvoices);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      inv.id.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.candidateName.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q)
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
                <CreditCard className="h-5 w-5 text-indigo-600" /> Placement Billing &amp; Invoices Tracker
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Track placement billing records, due dates, revenue collection, and payment statuses across client accounts.
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
              placeholder="Search invoices by invoice #, client name, candidate name, or status..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-neutral-50 dark:bg-slate-800 border-neutral-300">
            {filteredInvoices.length} Invoices
          </Badge>
        </div>

        {/* INVOICES TABLE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading invoices tracker...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-neutral-100/70 dark:bg-slate-800/50 border-b border-neutral-200 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Client Name</th>
                    <th className="p-3">Candidate Placement</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payment Terms</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 dark:divide-slate-800">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-600">{inv.id}</td>
                      <td className="p-3 font-bold text-neutral-900 dark:text-white">
                        <span onClick={() => router.push(`/clients/${inv.clientId}`)} className="hover:underline cursor-pointer">
                          {inv.clientName}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-neutral-700 dark:text-neutral-300">{inv.candidateName}</td>
                      <td className="p-3 font-mono font-bold text-neutral-900 dark:text-white">{inv.amount}</td>
                      <td className="p-3 font-medium text-neutral-600 dark:text-neutral-400">{inv.paymentTerms}</td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-400">{inv.dueDate}</td>
                      <td className="p-3">
                        {inv.status === "PAID" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                          </Badge>
                        ) : inv.status === "PENDING" ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/clients/${inv.clientId}`)} className="h-7 text-xs text-indigo-600 font-bold">
                          Client Profile →
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
