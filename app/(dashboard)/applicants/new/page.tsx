"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";

// ── Wizard Steps ─────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", icon: User },
  { id: 2, label: "Contact", icon: Mail },
  { id: 3, label: "Work Auth", icon: Shield },
  { id: 4, label: "Job Info", icon: Briefcase },
  { id: 5, label: "Resume", icon: FileText },
];

interface FormData {
  // Step 1 - Basic
  firstName: string;
  lastName: string;
  middleName: string;
  // Step 2 - Contact
  email: string;
  mobile: string;
  phone: string;
  city: string;
  state: string;
  zipCode: string;
  // Step 3 - Work Auth
  workAuthorization: string;
  source: string;
  ownership: string;
  // Step 4 - Job Info
  jobTitle: string;
  skills: string;
  experience: string;
  // Step 5 - Resume
  resumeText: string;
}

const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  mobile: "",
  phone: "",
  city: "",
  state: "",
  zipCode: "",
  workAuthorization: "",
  source: "",
  ownership: "",
  jobTitle: "",
  skills: "",
  experience: "",
  resumeText: "",
};

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

const WORK_AUTH_OPTIONS = [
  "US Citizen",
  "Green Card",
  "Have H1 Visa",
  "H4 EAD",
  "Employment Auth. Document",
  "TN Permit Holder",
  "OPT",
  "CPT",
  "US Authorized",
  "Canadian Citizen",
  "Other",
];

const SOURCE_OPTIONS = [
  "Dice",
  "LinkedIn",
  "Monster",
  "Indeed",
  "CareerBuilder",
  "ZipRecruiter",
  "Referral",
  "Direct Apply",
  "Other",
];

export default function NewApplicantPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        fullName: `${form.firstName} ${form.middleName ? form.middleName + " " : ""}${form.lastName}`.trim(),
        email: form.email,
        phone: form.mobile || form.phone || "N/A",
        location: `${form.city}, ${form.state}`.trim(),
        experienceYears: form.experience ? parseInt(form.experience.split("-")[0]) || 0 : 0,
        jobTitle: form.jobTitle || "Software Engineer",
        source: form.source || "Direct Upload",
        workAuthorization: form.workAuthorization || "US Citizen",
        skills: form.skills ? form.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [],
        rawText: form.resumeText || `Manual Entry Candidate: ${form.firstName} ${form.lastName}`,
      };
      
      await atsApi.candidates.create(payload);
      router.push("/applicants");
    } catch (err) {
      console.error("Failed to create candidate:", err);
      alert("Failed to create candidate. Please check your data and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const processResumeFile = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const parsed = await atsApi.candidates.parseResume(file);
      
      const name = parsed.candidate_name || parsed.name || "";
      let first = "";
      let last = "";
      if (name) {
        const parts = name.trim().split(/\s+/);
        first = parts[0] || "";
        if (parts.length > 1) {
          last = parts.slice(1).join(" ");
        }
      }

      const email = parsed.email || (parsed.contact?.emails?.[0]) || "";
      const phone = parsed.phone || (parsed.contact?.phones?.[0]) || "";

      let city = "";
      let state = "";
      const rawLoc = parsed.location || parsed.raw_current_location || "";
      if (typeof rawLoc === "string" && rawLoc) {
        const parts = rawLoc.split(/,\s*/);
        city = parts[0] || "";
        state = parts[1] || "";
      } else if (rawLoc && typeof rawLoc === "object") {
        city = rawLoc.city || "";
        state = rawLoc.state || "";
      }

      const skills = Array.isArray(parsed.skills) ? parsed.skills.join(", ") : (parsed.skills || "");
      const jobTitle = parsed.designation || parsed.job_title || parsed.raw_current_designation || "";
      const expYears = Number(parsed.experience_years || parsed.total_experience_years || parsed.experience || 0);

      let expRange = "";
      if (expYears <= 1) expRange = "0-1";
      else if (expYears <= 3) expRange = "1-3";
      else if (expYears <= 5) expRange = "3-5";
      else if (expYears <= 8) expRange = "5-8";
      else if (expYears <= 12) expRange = "8-12";
      else if (expYears <= 15) expRange = "12-15";
      else expRange = "15+";

      const workAuthRaw = parsed.work_authorization || parsed.workAuthorization || "";
      let matchedWorkAuth = "";
      if (workAuthRaw) {
        const lowerAuth = workAuthRaw.toLowerCase();
        const found = WORK_AUTH_OPTIONS.find(opt => lowerAuth.includes(opt.toLowerCase()) || opt.toLowerCase().includes(lowerAuth));
        matchedWorkAuth = found || "US Authorized";
      }

      const rawText = parsed.raw_text || parsed.rawText || "";

      setForm((prev) => ({
        ...prev,
        firstName: first || prev.firstName,
        lastName: last || prev.lastName,
        email: email || prev.email,
        mobile: phone || prev.mobile,
        city: city || prev.city,
        state: state || prev.state,
        workAuthorization: matchedWorkAuth || prev.workAuthorization,
        jobTitle: jobTitle || prev.jobTitle,
        skills: skills || prev.skills,
        experience: expRange || prev.experience,
        resumeText: rawText || `Parsed Resume File: ${file.name}`,
      }));

      setCurrentStep(1);
    } catch (err: any) {
      console.error("Failed to parse resume:", err);
      setParseError(err.message || "Failed to parse resume file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processResumeFile(file);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processResumeFile(file);
    }
  };

  // ── Field helper ─────────────────────────────────────────────
  const Field = ({
    label,
    required = false,
    children,
  }: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls =
    "w-full px-2.5 py-1.5 text-sm border border-neutral-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary transition-colors placeholder-neutral-400 dark:placeholder-neutral-600";

  const selectCls =
    "w-full px-2.5 py-1.5 text-sm border border-neutral-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary transition-colors cursor-pointer";

  // ── Step content ─────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter the applicant&apos;s basic personal information.
            </p>
            
            <div className="border border-dashed border-primary/40 bg-primary/5 dark:bg-slate-800/40 rounded-sm p-4 text-center mb-5">
              <p className="text-xs font-semibold text-primary dark:text-primary-400 mb-1">
                ⚡ Have a Resume? Auto-Fill this wizard!
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5">
                Drop the CV file here or click below to parse details instantly.
              </p>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-primary text-white rounded-sm cursor-pointer hover:bg-primary/90 transition-colors">
                <Upload className="h-3 w-3" />
                Upload & Autofill
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
              </label>
              {parseError && (
                <p className="text-[10px] text-red-500 font-semibold mt-2">
                  ⚠️ {parseError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="First Name" required>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) => updateForm("firstName", e.target.value)}
                />
              </Field>
              <Field label="Middle Name">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="M."
                  value={form.middleName}
                  onChange={(e) => updateForm("middleName", e.target.value)}
                />
              </Field>
              <Field label="Last Name" required>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => updateForm("lastName", e.target.value)}
                />
              </Field>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter contact details and location information.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email Address" required>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="john.doe@example.com"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </Field>
              <Field label="Mobile Number">
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="(555) 000-0000"
                  value={form.mobile}
                  onChange={(e) => updateForm("mobile", e.target.value)}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Washington"
                  value={form.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                />
              </Field>
              <Field label="State">
                <select
                  className={selectCls}
                  value={form.state}
                  onChange={(e) => updateForm("state", e.target.value)}
                >
                  <option value="">— Select State —</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Zip Code">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="20001"
                  value={form.zipCode}
                  onChange={(e) => updateForm("zipCode", e.target.value)}
                />
              </Field>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Specify work authorization, sourcing, and assignment details.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Work Authorization" required>
                <select
                  className={selectCls}
                  value={form.workAuthorization}
                  onChange={(e) =>
                    updateForm("workAuthorization", e.target.value)
                  }
                >
                  <option value="">— Select Work Auth —</option>
                  {WORK_AUTH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Source">
                <select
                  className={selectCls}
                  value={form.source}
                  onChange={(e) => updateForm("source", e.target.value)}
                >
                  <option value="">— Select Source —</option>
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ownership / Recruiter">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Recruiter name..."
                  value={form.ownership}
                  onChange={(e) => updateForm("ownership", e.target.value)}
                />
              </Field>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter the applicant&apos;s professional background.
            </p>
            <Field label="Current / Desired Job Title">
              <input
                type="text"
                className={inputCls}
                placeholder="Senior Software Engineer"
                value={form.jobTitle}
                onChange={(e) => updateForm("jobTitle", e.target.value)}
              />
            </Field>
            <Field label="Key Skills">
              <textarea
                className={cn(inputCls, "resize-none h-20")}
                placeholder="React, Node.js, TypeScript, AWS, Docker..."
                value={form.skills}
                onChange={(e) => updateForm("skills", e.target.value)}
              />
            </Field>
            <Field label="Years of Experience">
              <select
                className={selectCls}
                value={form.experience}
                onChange={(e) => updateForm("experience", e.target.value)}
              >
                <option value="">— Select —</option>
                {["0-1", "1-3", "3-5", "5-8", "8-12", "12-15", "15+"].map(
                  (exp) => (
                    <option key={exp} value={exp}>
                      {exp} years
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Upload a resume file or paste resume text directly.
            </p>

            {/* File Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={cn(
                "border-2 border-dashed rounded-sm p-8 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-neutral-300 dark:border-slate-700 hover:border-neutral-400 dark:hover:border-slate-600"
              )}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Drag &amp; drop a resume file here
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                Supports PDF, DOC, DOCX, TXT — Max 10MB
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-sm cursor-pointer hover:bg-primary/90 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                Browse File
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-200 dark:bg-slate-700" />
              <span className="text-xs text-neutral-400 font-medium">or paste text</span>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-slate-700" />
            </div>

            <Field label="Resume Text">
              <textarea
                className={cn(inputCls, "resize-none h-32 text-xs font-mono")}
                placeholder="Paste resume text here..."
                value={form.resumeText}
                onChange={(e) => updateForm("resumeText", e.target.value)}
              />
            </Field>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 font-sans">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
            New Applicant
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Add a new candidate to the ATS database
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Step Indicator ──────────────────────────── */}
      <div className="flex items-center mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <React.Fragment key={step.id}>
              <div
                className="flex flex-col items-center gap-1 cursor-pointer"
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                    isCompleted
                      ? "bg-primary border-primary text-white"
                      : isActive
                      ? "bg-white dark:bg-slate-900 border-primary text-primary"
                      : "bg-neutral-100 dark:bg-slate-800 border-neutral-300 dark:border-slate-600 text-neutral-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold whitespace-nowrap",
                    isActive
                      ? "text-primary"
                      : isCompleted
                      ? "text-neutral-600 dark:text-neutral-400"
                      : "text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mb-4 transition-colors",
                    currentStep > step.id
                      ? "bg-primary"
                      : "bg-neutral-200 dark:bg-slate-700"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Form Card ───────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-xs p-6">
        <div className="mb-4 pb-3 border-b border-neutral-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
            {STEPS[currentStep - 1].label}
          </h2>
        </div>
        {renderStep()}
      </div>

      {/* ── Navigation Buttons ──────────────────────── */}
      <div className="flex items-center justify-between mt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 1 || submitting}
          className="gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/applicants")}
            disabled={submitting}
            className="text-xs font-semibold text-neutral-500 cursor-pointer"
          >
            Cancel
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={submitting}
              className="gap-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 border-none cursor-pointer"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 border-none cursor-pointer"
            >
              {submitting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {submitting ? "Creating..." : "Create Applicant"}
            </Button>
          )}
        </div>
      </div>

      {isParsing && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm shadow-xl p-8 max-w-sm w-full text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <FileText className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                Parsing Resume
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Our parsing agent is reading and mapping skills, contact, and experience data...
              </p>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
              <div className="bg-primary h-1 rounded-full animate-pulse w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
