"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Country, State, City } from "country-state-city";

export default function NewClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    status: "Active",
    contactNumber: "",
    website: "",
    industry: "",
    countryIso: "",
    stateIso: "",
    city: "",
    primaryOwner: "",
    businessUnit: "",
    category: "",
    emailId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Reset dependent fields when parent changes
      if (name === "countryIso") {
        updated.stateIso = "";
        updated.city = "";
      } else if (name === "stateIso") {
        updated.city = "";
      }
      return updated;
    });
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
      
      const finalCountry = Country.getCountryByCode(formData.countryIso)?.name || "";
      const finalState = State.getStateByCodeAndCountry(formData.stateIso, formData.countryIso)?.name || "";

      await atsApi.clients.create({
        client_name: formData.clientName,
        status: formData.status,
        contact_number: formData.contactNumber,
        website: formData.website,
        industry: formData.industry,
        country: finalCountry,
        state: finalState,
        city: formData.city,
        primary_owner: formData.primaryOwner,
        business_unit: formData.businessUnit,
        category: formData.category,
        email_id: formData.emailId,
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

  const countries = Country.getAllCountries();
  const states = formData.countryIso ? State.getStatesOfCountry(formData.countryIso) : [];
  const cities = formData.stateIso ? City.getCitiesOfState(formData.countryIso, formData.stateIso) : [];

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-50 dark:bg-slate-950 font-sans p-6 overflow-auto">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-neutral-200 dark:border-slate-800 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" /> Create New Client
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Email ID</label>
              <input
                name="emailId"
                type="email"
                value={formData.emailId}
                onChange={handleChange}
                placeholder="e.g. contact@acme.com"
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
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
              >
                <option value="">Select</option>
                <option value="Accounting - Finance">Accounting - Finance</option>
                <option value="Advertising">Advertising</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Airline - Aviation">Airline - Aviation</option>
                <option value="Architecture - Building">Architecture - Building</option>
                <option value="Art - Photography - Journalism">Art - Photography - Journalism</option>
                <option value="Automotive - Motor Vehicles - Parts">Automotive - Motor Vehicles - Parts</option>
                <option value="Banking - Financial Services">Banking - Financial Services</option>
                <option value="Biotechnology">Biotechnology</option>
                <option value="Broadcasting - Radio - TV">Broadcasting - Radio - TV</option>
                <option value="Building Materials">Building Materials</option>
                <option value="Chemical">Chemical</option>
                <option value="Computer Hardware">Computer Hardware</option>
                <option value="Computer Software">Computer Software</option>
                <option value="Construction">Construction</option>
                <option value="Consulting">Consulting</option>
                <option value="Consumer Products">Consumer Products</option>
                <option value="Credit - Loan - Collections">Credit - Loan - Collections</option>
                <option value="Defense - Aerospace">Defense - Aerospace</option>
                <option value="Oil Refining - Petroleum - Drilling">Oil Refining - Petroleum - Drilling</option>
                <option value="Other Great Industries">Other Great Industries</option>
                <option value="Packaging">Packaging</option>
                <option value="Pharmaceutical">Pharmaceutical</option>
                <option value="Printing - Publishing">Printing - Publishing</option>
                <option value="Public Relations">Public Relations</option>
                <option value="Real Estate - Property Mgt">Real Estate - Property Mgt</option>
                <option value="Recreation">Recreation</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Retail">Retail</option>
                <option value="Sales - Marketing">Sales - Marketing</option>
                <option value="Securities">Securities</option>
                <option value="Security">Security</option>
                <option value="Semiconductor">Semiconductor</option>
                <option value="Social Services">Social Services</option>
                <option value="Telecommunications">Telecommunications</option>
                <option value="Training">Training</option>
                <option value="Transportation">Transportation</option>
                <option value="Travel">Travel</option>
                <option value="Wireless">Wireless</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
              >
                <option value="">Select</option>
                <option value="Direct">Direct</option>
                <option value="Tier 1">Tier 1</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Country</label>
              <select
                name="countryIso"
                value={formData.countryIso}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
              >
                <option value="">Select Country</option>
                {countries.map((c: any) => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">State / Province</label>
              <select
                name="stateIso"
                value={formData.stateIso}
                onChange={handleChange}
                disabled={!formData.countryIso || states.length === 0}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">{states.length === 0 && formData.countryIso ? "No states found" : "Select State"}</option>
                {states.map((s: any) => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={!formData.stateIso || cities.length === 0}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">{cities.length === 0 && formData.stateIso ? "No cities found" : "Select City"}</option>
                {cities.map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Primary Owner</label>
              <input
                name="primaryOwner"
                value={formData.primaryOwner}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Business Unit</label>
              <input
                name="businessUnit"
                value={formData.businessUnit}
                onChange={handleChange}
                placeholder="e.g. US Staffing"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-100 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting} className="cursor-pointer font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-bold cursor-pointer">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
