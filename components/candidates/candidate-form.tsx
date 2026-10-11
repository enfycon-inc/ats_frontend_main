"use client";
import { CandidateSourceFields } from './candidate-source-fields';

import React from "react";
import { candidatePhoneSchema, formatCandidateAmount } from "@/lib/candidate-submission-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { User, Briefcase, MapPin, DollarSign, IndianRupee, FileText } from "lucide-react";
import { TagInput } from "@/components/ui/tag-input";
import { CityAutocomplete } from "@/components/city-autocomplete";

export interface CandidateFormProps {
  formData: Record<'firstName' | 'lastName' | 'email' | 'phone' | 'totalExperienceYears' | 'currentLocation' | 'preferredLocations' | 'source' | 'skills' | 'relevantExperienceYears' | 'currentCtc' | 'expectedCtc' | 'currentCompany' | 'noticePeriodDays' | 'availabilityToStart' | 'sourceChannel' | 'sourceDetail', string>;
  setFormData: (data: CandidateFormProps['formData']) => void;
  recruiterComment: string;
  setRecruiterComment: (comment: string) => void;
  job: { market?: string | null } | null;
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
  const marketVal = job?.market?.trim().toUpperCase() || "";
  const isIndianMarket = ["IND", "IN", "INDIA", "DOMESTIC", ""].includes(marketVal);
  const currencyPrefix = isIndianMarket ? "₹ " : "$ ";
  const defaultPhoneCountry = isIndianMarket ? "IN" : "US";

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-slate-900 relative">
      <div className="p-8 max-w-3xl mx-auto space-y-8 pb-24">
        <CandidateSourceFields value={formData} onChange={value => setFormData({ ...formData, ...value })} />
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
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mobile number <span className="text-red-500">*</span></Label>
              <PhoneInput limitMaxLength placeholder="Enter phone" defaultCountry={defaultPhoneCountry} value={formData.phone} onChange={(v) => setFormData({...formData, phone: v?.toString() || ""})} className="h-10 bg-slate-50 dark:bg-slate-950 [&>div]:bg-transparent" />
              {formData.phone && !candidatePhoneSchema.safeParse(formData.phone).success && <p className="text-xs text-red-600">Enter valid mobile number</p>}
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
            {(
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
                  onChange={(city, state) => {
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
                  onChange={(city, state) => {
                    const fullLoc = [city, state].filter(Boolean).join(", ");
                    setFormData({ ...formData, preferredLocations: fullLoc || city });
                  }}
                  placeholder="Search city..."
                  className="[&_input]:h-10 [&_input]:bg-slate-50 dark:[&_input]:bg-slate-950"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{isContractual ? "Availability to Start" : "Notice Period"} <span className="text-red-500">*</span></Label>
              <div className="flex gap-4 text-xs">
                <label><input type="radio" name="availabilityMode" checked={formData.noticePeriodDays === "0"} onChange={() => setFormData({...formData, noticePeriodDays: "0"})} /> Immediate</label>
                <label><input type="radio" name="availabilityMode" checked={formData.noticePeriodDays !== "0"} onChange={() => setFormData({...formData, noticePeriodDays: ""})} /> Enter days</label>
              </div>
              <Input type="text" inputMode="numeric" disabled={formData.noticePeriodDays === "0"} placeholder="Number of days" value={formData.noticePeriodDays === "0" ? "" : formData.noticePeriodDays} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setFormData({...formData, noticePeriodDays: e.target.value}); }} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
            </div>
          </div>
        </div>

        {/* Group 4: Compensation */}
        {(
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              {isIndianMarket ? <IndianRupee className="h-4 w-4 text-blue-500" /> : <DollarSign className="h-4 w-4 text-blue-500" />} Compensation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 relative">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{isContractual ? "Current Pay (per month, optional)" : isIndianMarket ? "Current CTC (LPA)" : "Current Compensation (Annual)"} {!isContractual && <span className="text-red-500">*</span>}</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-medium">{currencyPrefix}</span>
                  <Input type="text" inputMode="decimal" placeholder={isContractual ? "e.g. 60,000" : isIndianMarket ? "e.g. 12" : "e.g. 120,000"} value={formatCandidateAmount(formData.currentCtc)} onChange={(e) => setFormData({...formData, currentCtc: e.target.value.replaceAll(",", "").replace(/[^0-9.]/g, "")})} className="h-10 pl-8 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                </div>
              </div>
              <div className="space-y-2 relative">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{isContractual ? "Expected Pay (per month)" : isIndianMarket ? "Expected CTC (LPA)" : "Expected Compensation (Annual)"} <span className="text-red-500">*</span></Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-medium">{currencyPrefix}</span>
                  <Input type="text" inputMode="decimal" placeholder={isContractual ? "e.g. 75,000" : isIndianMarket ? "e.g. 15" : "e.g. 150,000"} value={formatCandidateAmount(formData.expectedCtc)} onChange={(e) => setFormData({...formData, expectedCtc: e.target.value.replaceAll(",", "").replace(/[^0-9.]/g, "")})} className="h-10 pl-8 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group 5: Submission Notes */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FileText className="h-4 w-4 text-blue-500" /> Remarks
          </h4>
          <div className="space-y-2">
            <textarea
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-500 transition-colors"
              placeholder="Enter remarks..."
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
