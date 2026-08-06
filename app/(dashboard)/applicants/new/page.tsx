"use client";

import React, { useState, useEffect } from "react";
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
  Globe,
  IndianRupee,
  DollarSign,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { atsApi } from "@/lib/ats-api";
import { useSession } from "next-auth/react";

// ── Wizard Steps ─────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", icon: User },
  { id: 2, label: "Contact & Location", icon: Mail },
  { id: 3, label: "Work Auth & Comp", icon: Shield },
  { id: 4, label: "Job Info & Background", icon: Briefcase },
  { id: 5, label: "Resume & Documents", icon: FileText },
];

interface FormData {
  market: "US" | "IN";
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
  // Step 3 - Work Auth & Compensation
  workAuthorization: string;
  source: string;
  ownership: string;
  submittedRate: string; // US IT pay rate ($/hr)
  currentCtc: string; // India CTC (Lakhs)
  expectedCtc: string; // India CTC (Lakhs)
  noticePeriod: string; // India notice period
  servingNotice: string; // "Yes" | "No"
  panCard: string; // India PAN Card
  // Step 4 - Job Info
  jobTitle: string;
  skills: string;
  experience: string;
  // Step 5 - Resume
  resumeText: string;
}

const INITIAL_FORM: FormData = {
  market: "IN", // Default to India Domestic per tenant config
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  mobile: "",
  phone: "",
  city: "",
  state: "",
  zipCode: "",
  workAuthorization: "Indian Citizen",
  source: "Naukri.com",
  ownership: "",
  submittedRate: "",
  currentCtc: "",
  expectedCtc: "",
  noticePeriod: "30 Days",
  servingNotice: "No",
  panCard: "",
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

const INDIA_STATES = [
  "Karnataka", "Maharashtra", "Tamil Nadu", "Telangana", "Delhi NCR", "Haryana",
  "Uttar Pradesh", "West Bengal", "Gujarat", "Andhra Pradesh", "Kerala", "Punjab",
  "Rajasthan", "Madhya Pradesh", "Odisha", "Bihar", "Chhattisgarh", "Goa",
  "Jharkhand", "Assam", "Chandigarh", "Uttarakhand"
];

const US_WORK_AUTH_OPTIONS = [
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

const INDIA_WORK_AUTH_OPTIONS = [
  "Indian Citizen",
  "OCI Card Holder",
  "PIO (Person of Indian Origin)",
  "Employment Visa Holder",
  "Work Permit",
  "Other",
];

const US_SOURCE_OPTIONS = [
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

const INDIA_SOURCE_OPTIONS = [
  "Naukri.com",
  "Monster India (Foundit)",
  "LinkedIn",
  "Indeed India",
  "Shine.com",
  "TimesJobs",
  "Referral",
  "Direct Apply",
  "Other",
];

export default function NewApplicantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Set default market from active user session
  useEffect(() => {
    const user = atsApi.auth.getCurrentUser();
    const userMarket = (session?.user as any)?.defaultMarket || (session?.user as any)?.market || user?.market;
    const isDomestic = userMarket === "IN" || (typeof window !== "undefined" && window.location.host.includes("domestic")) || true;
    const marketChoice: "US" | "IN" = isDomestic ? "IN" : "US";

    setForm((prev) => ({
      ...prev,
      market: marketChoice,
      workAuthorization: isDomestic ? "Indian Citizen" : "US Citizen",
      source: isDomestic ? "Naukri.com" : "Dice",
    }));
  }, [session]);

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMarketChange = (newMarket: "US" | "IN") => {
    setForm((prev) => ({
      ...prev,
      market: newMarket,
      workAuthorization: newMarket === "IN" ? "Indian Citizen" : "US Citizen",
      source: newMarket === "IN" ? "Naukri.com" : "Dice",
    }));
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
      const isDomestic = form.market === "IN";
      const payload = {
        fullName: `${form.firstName} ${form.middleName ? form.middleName + " " : ""}${form.lastName}`.trim(),
        email: form.email,
        phone: form.mobile || form.phone || "N/A",
        location: `${form.city}, ${form.state}`.trim(),
        experienceYears: form.experience ? parseInt(form.experience.split("-")[0]) || 0 : 0,
        jobTitle: form.jobTitle || "Software Engineer",
        source: form.source || (isDomestic ? "Naukri.com" : "Dice"),
        workAuthorization: form.workAuthorization || (isDomestic ? "Indian Citizen" : "US Citizen"),
        skills: form.skills ? form.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [],
        rawText: form.resumeText || `Manual Entry Candidate: ${form.firstName} ${form.lastName}`,
        currentCTC: form.currentCtc ? parseFloat(form.currentCtc) : null,
        expectedCTC: form.expectedCtc ? parseFloat(form.expectedCtc) : null,
        noticePeriodDays: form.noticePeriod ? parseInt(form.noticePeriod.replace(/\D/g, '')) || 30 : 30,
        servingNotice: form.servingNotice === "Yes",
        panCard: form.panCard || null,
        market: form.market,
      };
      
      await atsApi.candidates.create(payload);
      router.push("/applicants/all");
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
      const isDomestic = form.market === "IN";
      const options = isDomestic ? INDIA_WORK_AUTH_OPTIONS : US_WORK_AUTH_OPTIONS;

      let matchedWorkAuth = "";
      if (workAuthRaw) {
        const lowerAuth = workAuthRaw.toLowerCase();
        const found = options.find(opt => lowerAuth.includes(opt.toLowerCase()) || opt.toLowerCase().includes(lowerAuth));
        matchedWorkAuth = found || (isDomestic ? "Indian Citizen" : "US Authorized");
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
      <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </label>
      {children}
    </div>
  );

  const inputCls =
    "w-full px-3 py-2 text-xs border border-neutral-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 shadow-2xs";

  const selectCls =
    "w-full px-3 py-2 text-xs border border-neutral-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs font-medium";

  const isDomestic = form.market === "IN";
  const stateOptions = isDomestic ? INDIA_STATES : US_STATES;
  const workAuthOptions = isDomestic ? INDIA_WORK_AUTH_OPTIONS : US_WORK_AUTH_OPTIONS;
  const sourceOptions = isDomestic ? INDIA_SOURCE_OPTIONS : US_SOURCE_OPTIONS;

  // ── Step content ─────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 font-sans">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              Enter the applicant&apos;s basic personal details.
            </p>
            
            <div className="border border-dashed border-blue-400/60 bg-blue-50/50 dark:bg-slate-800/40 rounded-lg p-4 text-center mb-5 shadow-2xs">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Have a Resume? Auto-Fill this wizard!
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5">
                Drop the CV file here or click below to parse details instantly.
              </p>
              <label className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors shadow-2xs">
                <Upload className="h-3.5 w-3.5" />
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
                  placeholder={isDomestic ? "Rahul" : "John"}
                  value={form.firstName}
                  onChange={(e) => updateForm("firstName", e.target.value)}
                />
              </Field>
              <Field label="Middle Name">
                <input
                  type="text"
                  className={inputCls}
                  placeholder={isDomestic ? "K." : "M."}
                  value={form.middleName}
                  onChange={(e) => updateForm("middleName", e.target.value)}
                />
              </Field>
              <Field label="Last Name" required>
                <input
                  type="text"
                  className={inputCls}
                  placeholder={isDomestic ? "Sharma" : "Doe"}
                  value={form.lastName}
                  onChange={(e) => updateForm("lastName", e.target.value)}
                />
              </Field>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 font-sans">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter contact details and location for <strong className="text-blue-600 dark:text-blue-400">{isDomestic ? "Domestic India" : "US IT"}</strong> candidate.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email Address" required>
                <input
                  type="email"
                  className={inputCls}
                  placeholder={isDomestic ? "rahul.sharma@example.com" : "john.doe@example.com"}
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </Field>
              <Field label="Mobile Number" required>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder={isDomestic ? "+91 98765 43210" : "(555) 000-0000"}
                  value={form.mobile}
                  onChange={(e) => updateForm("mobile", e.target.value)}
                />
              </Field>
              <Field label="Phone / Secondary Number">
                <input
                  type="tel"
                  className={inputCls}
                  placeholder={isDomestic ? "+91 80 1234 5678" : "(555) 000-0000"}
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  className={inputCls}
                  placeholder={isDomestic ? "Bengaluru / Mumbai / Hyderabad" : "San Jose / Washington / New York"}
                  value={form.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                />
              </Field>
              <Field label={isDomestic ? "State / UT" : "State"}>
                <select
                  className={selectCls}
                  value={form.state}
                  onChange={(e) => updateForm("state", e.target.value)}
                >
                  <option value="">— Select {isDomestic ? "Indian State" : "US State"} —</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={isDomestic ? "PIN Code" : "Zip Code"}>
                <input
                  type="text"
                  className={inputCls}
                  placeholder={isDomestic ? "560001" : "20001"}
                  value={form.zipCode}
                  onChange={(e) => updateForm("zipCode", e.target.value)}
                />
              </Field>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 font-sans">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Specify work authorization, compensation, and sourcing details for <strong className="text-blue-600 dark:text-blue-400">{isDomestic ? "Domestic India" : "US IT"}</strong> candidate.
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
                  {workAuthOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Source Channel">
                <select
                  className={selectCls}
                  value={form.source}
                  onChange={(e) => updateForm("source", e.target.value)}
                >
                  <option value="">— Select Source —</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Dynamic Compensation Fields */}
              {isDomestic ? (
                <>
                  <Field label="Current CTC (Lakhs LPA)">
                    <div className="relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        className={cn(inputCls, "pl-8")}
                        placeholder="e.g. 14.5"
                        value={form.currentCtc}
                        onChange={(e) => updateForm("currentCtc", e.target.value)}
                      />
                    </div>
                  </Field>

                  <Field label="Expected CTC (Lakhs LPA)">
                    <div className="relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                      <input
                        type="text"
                        className={cn(inputCls, "pl-8")}
                        placeholder="e.g. 18.0"
                        value={form.expectedCtc}
                        onChange={(e) => updateForm("expectedCtc", e.target.value)}
                      />
                    </div>
                  </Field>

                  <Field label="Notice Period">
                    <select
                      className={selectCls}
                      value={form.noticePeriod}
                      onChange={(e) => updateForm("noticePeriod", e.target.value)}
                    >
                      <option value="Immediate">Immediate / Serving Notice</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="60 Days">60 Days</option>
                      <option value="90 Days">90 Days</option>
                    </select>
                  </Field>

                  <Field label="Currently Serving Notice?">
                    <select
                      className={selectCls}
                      value={form.servingNotice}
                      onChange={(e) => updateForm("servingNotice", e.target.value)}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes (Buyout / LWD active)</option>
                    </select>
                  </Field>

                  <Field label="PAN Card Number">
                    <div className="relative">
                      <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        className={cn(inputCls, "pl-8 uppercase font-mono")}
                        placeholder="e.g. ABCDE1234F"
                        value={form.panCard}
                        onChange={(e) => updateForm("panCard", e.target.value)}
                      />
                    </div>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Submitted Pay Rate ($/hr or $/yr)">
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                      <input
                        type="text"
                        className={cn(inputCls, "pl-8")}
                        placeholder="e.g. $70/hr or $120k/yr"
                        value={form.submittedRate}
                        onChange={(e) => updateForm("submittedRate", e.target.value)}
                      />
                    </div>
                  </Field>
                </>
              )}

              <Field label="Recruiter / Ownership">
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
          <div className="space-y-4 font-sans">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter the applicant&apos;s professional background and skills.
            </p>
            <Field label="Current / Desired Job Title">
              <input
                type="text"
                className={inputCls}
                placeholder={isDomestic ? "Lead Full Stack Developer / Java Tech Lead" : "Senior Software Engineer / DevOps Architect"}
                value={form.jobTitle}
                onChange={(e) => updateForm("jobTitle", e.target.value)}
              />
            </Field>
            <Field label="Primary & Secondary Skills">
              <textarea
                className={cn(inputCls, "resize-none h-20")}
                placeholder={isDomestic ? "Java 17, Spring Boot, Microservices, PostgreSQL, Kafka, React..." : "React, Node.js, TypeScript, AWS, Docker, Kubernetes..."}
                value={form.skills}
                onChange={(e) => updateForm("skills", e.target.value)}
              />
            </Field>
            <Field label="Total Years of Experience">
              <select
                className={selectCls}
                value={form.experience}
                onChange={(e) => updateForm("experience", e.target.value)}
              >
                <option value="">— Select Experience Range —</option>
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
          <div className="space-y-4 font-sans">
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
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-neutral-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-slate-600"
              )}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Drag &amp; drop a resume file here
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                Supports PDF, DOC, DOCX, TXT — Max 10MB
              </p>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors shadow-2xs">
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
    <div className="max-w-3xl mx-auto py-5 px-4 font-sans">
      {/* ── Page Title Header ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Add New Candidate Profile
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Add a structured candidate profile to your talent database
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Clean Market Segment Pill */}
          <div className="flex bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-md border border-neutral-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleMarketChange("IN")}
              className={cn(
                "px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1",
                form.market === "IN"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              <span>🇮🇳</span> Domestic India
            </button>
            <button
              type="button"
              onClick={() => handleMarketChange("US")}
              className={cn(
                "px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1",
                form.market === "US"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              <span>🇺🇸</span> US IT
            </button>
          </div>

          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Step Indicator ──────────────────────────── */}
      <div className="flex items-center mb-6">
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
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isActive
                      ? "bg-white dark:bg-slate-900 border-blue-600 text-blue-600"
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
                      ? "text-blue-600 dark:text-blue-400 font-bold"
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
                      ? "bg-blue-600"
                      : "bg-neutral-200 dark:bg-slate-700"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Form Card ───────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-2xs p-6">
        <div className="mb-4 pb-2.5 border-b border-neutral-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            {STEPS[currentStep - 1].label}
          </h2>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
            Step {currentStep} of {STEPS.length}
          </span>
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
          className="gap-1.5 text-xs font-semibold cursor-pointer rounded-md"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/applicants/all")}
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
              className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer rounded-md"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 border-none cursor-pointer rounded-md"
            >
              {submitting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {submitting ? "Creating..." : "Create Applicant Profile"}
            </Button>
          )}
        </div>
      </div>

      {isParsing && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xl p-8 max-w-sm w-full text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
              <FileText className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Parsing Resume
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Extracting skills, contact, and experience data...
              </p>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
              <div className="bg-blue-600 h-1 rounded-full animate-pulse w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
