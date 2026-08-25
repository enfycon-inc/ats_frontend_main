"use client";

import React, { useState, useEffect, useCallback } from "react";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  Building,
  Mail,
  Phone,
  Search,
  Loader2,
  ExternalLink,
  Plus,
  ArrowLeft,
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ClientContactsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsData = await atsApi.clients.list();
      const extractedContacts: any[] = [];

      (clientsData || []).forEach((client: any) => {
        if (client.contact_person || client.email_id || client.contact_number) {
          extractedContacts.push({
            id: client.id,
            clientCode: client.client_code,
            clientName: client.client_name,
            contactName: client.contact_person || client.client_lead || "Primary Contact",
            title: client.contact_designation || "VMS / HR Lead",
            email: client.email_id || "N/A",
            phone: client.contact_number || "N/A",
            market: client.market || "US",
            status: client.status || "Active",
            businessUnit: client.business_unit || "Default",
          });
        }
      });

      setContacts(extractedContacts);
    } catch (err) {
      console.error("Failed to fetch client contacts:", err);
      toast.error("Failed to load contacts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.clientName.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
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
                <Users className="h-5 w-5 text-indigo-600" /> Client Contacts Directory
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Master directory of all Hiring Managers, VMS Leads, and Points of Contact across client accounts.
              </p>
            </div>
          </div>

          <Button onClick={() => router.push("/clients/new")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Add New Client
          </Button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3 rounded-lg shadow-xs">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name, designation, email, phone, or client company..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-neutral-50 dark:bg-slate-800 border-neutral-300">
            {filteredContacts.length} Contacts
          </Badge>
        </div>

        {/* CONTACTS TABLE / CARDS */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading contacts directory...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <Card className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center py-12">
            <CardContent className="space-y-3">
              <UserCheck className="h-10 w-10 text-neutral-400 mx-auto" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No contacts found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-neutral-100 dark:border-slate-800 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {contact.clientCode}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                      {contact.contactName}
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">{contact.title}</p>
                  </div>
                  <Badge variant="outline" className={contact.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-red-50 text-red-700 border-red-200 text-[10px]"}>
                    {contact.status}
                  </Badge>
                </CardHeader>

                <CardContent className="pt-3 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-bold">
                    <Building className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <span onClick={() => router.push(`/clients/${contact.id}`)} className="text-indigo-600 hover:underline cursor-pointer">
                      {contact.clientName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                      {contact.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Unit: {contact.businessUnit}</span>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/clients/${contact.id}`)} className="h-6 text-[11px] text-indigo-600 font-bold p-0 hover:bg-transparent">
                      View Profile →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
