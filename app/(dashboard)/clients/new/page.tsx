"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function NewClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    contactNumber: "",
    website: "",
    industry: "",
    city: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName) {
      toast.error("Client Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!atsApi.auth.isAuthenticated()) {
        await atsApi.auth.login("recruiter@enfycon.com", "enfycon123");
      }
      // Note: We intentionally do NOT send clientCode. 
      // The backend will generate it using the prefix!
      await atsApi.clients.create({
        client_name: formData.clientName,
        contact_number: formData.contactNumber,
        website: formData.website,
        industry: formData.industry,
        city: formData.city,
        status: "Active",
      });
      toast.success("Client created successfully!");
      router.push("/clients/all");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-50 dark:bg-slate-950 font-sans p-6 overflow-auto">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-neutral-200 dark:border-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" /> Create New Client
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Client Name <span className="text-red-500">*</span></label>
              <input
                required
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Contact Number</label>
              <input
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="e.g. +1 555-0198"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Website</label>
              <input
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="e.g. https://acme.com"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Industry</label>
              <input
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g. Technology"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">City</label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. San Francisco"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-bold">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
