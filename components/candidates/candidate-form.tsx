"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { User, Briefcase, MapPin, DollarSign, FileText } from "lucide-react";
import { TagInput } from "@/components/ui/tag-input";
import { CityAutocomplete } from "@/components/city-autocomplete";

interface CandidateFormProps {
  formData: any;
  setFormData: (data: any) => void;
  recruiterComment: string;
  setRecruiterComment: (comment: string) => void;
  job: any;
  isContractual: boolean;
}

export function CandidateForm({
  formData,
  setFormData,
  recruiterComment,
  setRecruiterComment,
  job,
  isContractual,
}: CandidateFormProps) {
  const marketVal = job?.market?.toUpperCase() || "";
  const isIndianMarket = marketVal === "IN" || marketVal === "INDIA" || marketVal === "DOMESTIC" || !marketVal;
  const currencyPrefix = isIndianMarket ? "₹ " : "$ ";
  const defaultPhoneCountry = isIndianMarket ? "IN" : "US";

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-slate-900 relative">
      <div className="p-8 max-w-3xl mx-auto space-y-8 pb-24">
        {/* Group 1: Personal Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <User className="h-4 w-4 text-blue-500" /> Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">First Name <span className="text-red-500">*</span></Label>
              <Input placeholder="John" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Last Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Doe" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="john.doe@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</Label>
              <PhoneInput placeholder="Enter phone" defaultCountry={defaultPhoneCountry as any} value={formData.phone} onChange={(v) => setFormData({...formData, phone: v?.toString() || ""})} className="h-10 bg-slate-50 dark:bg-slate-950 [&>div]:bg-transparent" />
            </div>
          </div>
        </div>

        {/* Group 2: Professional Profile */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Briefcase className="h-4 w-4 text-blue-500" /> Professional Profile
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Primary Skills <span className="text-red-500">*</span></Label>
              <TagInput 
                value={formData.skills} 
                onChange={(val) => setFormData({...formData, skills: val})} 
                placeholder="Type a skill and press Enter..." 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Experience (Yrs) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.1" placeholder="e.g. 5.5" value={formData.totalExperienceYears} onChange={(e) => setFormData({...formData, totalExperienceYears: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
            </div>
            {!isContractual && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Relevant Experience (Yrs) <span className="text-red-500">*</span></Label>
                  <Input type="number" step="0.1" placeholder="e.g. 4.0" value={formData.relevantExperienceYears} onChange={(e) => setFormData({...formData, relevantExperienceYears: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Company <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. Microsoft, Google" value={formData.currentCompany} onChange={(e) => setFormData({...formData, currentCompany: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                </div>
              </>
            )}
            {isContractual && (
               <div className="space-y-2">
               <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Source <span className="text-red-500">*</span></Label>
               <select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} className="w-full h-10 border border-slate-200 dark:border-slate-800 rounded-md px-3 text-sm bg-slate-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                 <option value="Market">Market</option>
                 <option value="Bench">Bench</option>
               </select>
             </div>
            )}
          </div>
        </div>

        {/* Group 3: Location & Logistics */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <MapPin className="h-4 w-4 text-blue-500" /> Location & Availability
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 relative">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Location <span className="text-red-500">*</span></Label>
              <CityAutocomplete
                  value={formData.currentLocation}
                  onChange={(city, state, country) => {
                    const fullLoc = [city, state].filter(Boolean).join(", ");
                    setFormData({ ...formData, currentLocation: fullLoc || city });
                  }}
                  placeholder="Search city (e.g. Hyderabad, Bengaluru)"
                  className="[&_input]:h-10 [&_input]:bg-slate-50 dark:[&_input]:bg-slate-950"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Preferred Location <span className="text-red-500">*</span></Label>
              <CityAutocomplete
                  value={formData.preferredLocations}
                  onChange={(city, state, country) => {
                    const fullLoc = [city, state].filter(Boolean).join(", ");
                    setFormData({ ...formData, preferredLocations: fullLoc || city });
                  }}
                  placeholder="Search city..."
                  className="[&_input]:h-10 [&_input]:bg-slate-50 dark:[&_input]:bg-slate-950"
              />
            </div>
            {isContractual ? (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Availability to Start <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Immediate, 2 Weeks" value={formData.availabilityToStart} onChange={(e) => setFormData({...formData, availabilityToStart: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notice Period (Days) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="e.g. 30, 60" value={formData.noticePeriodDays} onChange={(e) => setFormData({...formData, noticePeriodDays: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
              </div>
            )}
          </div>
        </div>

        {/* Group 4: Compensation */}
        {!isContractual && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <DollarSign className="h-4 w-4 text-blue-500" /> Compensation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 relative">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current CTC <span className="text-red-500">*</span></Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-medium">{currencyPrefix}</span>
                  <Input type="number" placeholder={isIndianMarket ? "e.g. 1200000 (INR)" : "e.g. 120000"} value={formData.currentCtc} onChange={(e) => setFormData({...formData, currentCtc: e.target.value})} className="h-10 pl-8 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                </div>
              </div>
              <div className="space-y-2 relative">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expected CTC <span className="text-red-500">*</span></Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-medium">{currencyPrefix}</span>
                  <Input type="number" placeholder={isIndianMarket ? "e.g. 1500000 (INR)" : "e.g. 150000"} value={formData.expectedCtc} onChange={(e) => setFormData({...formData, expectedCtc: e.target.value})} className="h-10 pl-8 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group 5: Submission Notes */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FileText className="h-4 w-4 text-blue-500" /> Recruiter Notes
          </h4>
          <div className="space-y-2">
            <textarea
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-500 transition-colors"
              placeholder="Add any relevant notes, highlight candidate strengths, or mention red flags..."
              rows={4}
              value={recruiterComment}
              onChange={(e) => setRecruiterComment(e.target.value)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
