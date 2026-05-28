"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  ChevronLeft,
  Briefcase,
  Layers,
  FileText,
  FileSearch,
  Save,
  CheckCircle,
  X,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Calendar,
  DollarSign,
  User,
  Plus,
  Trash2,
  Minimize2,
  Maximize2,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

// Zod Validation Schema matching all manual form fields
const formSchema = zod.object({
  // Business Info
  businessUnit: zod.string().min(1, "Business Unit is required"),
  jobCode: zod.string().min(2, "Job Code is required"),
  facility: zod.string().optional(),
  jobTitle: zod.string().min(3, "Job Title must be at least 3 characters"),
  clientBillRate: zod.string().min(1, "Client Bill Rate is required"),
  payRate: zod.string().min(1, "Pay Rate is required"),
  startDate: zod.string().min(1, "Start Date is required"),
  endDate: zod.string().optional(),
  respondBy: zod.string().optional(),
  country: zod.string().min(1, "Country is required"),
  states: zod.string().min(1, "State is required"),
  remoteJob: zod.enum(["Yes", "No", "Hybrid"]),
  hoursPerWeek: zod.number().min(1).max(168),
  jobStatus: zod.string(),
  client: zod.string().min(1, "Client is required"),
  clientJobId: zod.string().optional(),
  priority: zod.enum(["High", "Medium", "Low"]),
  additionalDetails: zod.string().optional(),
  ceipalRefNum: zod.string().optional(),
  duration: zod.string().optional(),
  workAuthorization: zod.string().min(1, "Work Authorization is required"),
  applicationForm: zod.string().optional(),
  placementFeePercent: zod.number().min(0).max(100).optional(),
  address: zod.string().optional(),
  projectType: zod.string().optional(),
  jobCategory: zod.string().optional(),
  locationAutocomplete: zod.string().optional(),
  employmentTestTemplate: zod.string().optional(),
  turnaroundTime: zod.string().optional(),
  taxTerms: zod.string().min(1, "Tax Terms are required"),
  domain: zod.string().optional(),
  noticePeriod: zod.string().optional(),
  employmentLevel: zod.string().optional(),
  clientManager: zod.string().optional(),
  recruitmentManager: zod.string().optional(),
  primaryRecruiter: zod.string().optional(),
  assignedTo: zod.string().optional(),

  // Skills Section
  industry: zod.string().optional(),
  degree: zod.string().optional(),
  expMin: zod.number().min(0),
  expMax: zod.number().min(0),
  languages: zod.string().optional(),
  evaluationTemplate: zod.string().optional(),

  // Org Info
  numPositions: zod.number().min(1),
  maxSubmissions: zod.number().min(1),
  department: zod.string().optional(),
  salesManager: zod.string().optional(),
  secondarySalesManager: zod.string().optional(),
  accountManager: zod.string().optional(),
  additionalNotifications: zod.string().optional(),

  // Job Description
  jobDescription: zod.string().min(10, "Job Description must be at least 10 characters"),

  // Portal Settings
  postToPortal: zod.boolean(),
  displayContactOnPortal: zod.boolean(),
});

type FormValues = zod.infer<typeof formSchema>;

export default function NewJobPostingPage() {
  const router = useRouter();

  // Workflow active screen state: 'landing' | 'manual' | 'parse'
  const [activeWorkflow, setActiveWorkflow] = useState<"landing" | "manual" | "parse">("landing");

  // Collapse/Expand state for each form section
  const [collapsedSections, setCollapsedSections] = useState({
    businessInfo: false,
    skills: false,
    orgInfo: false,
    jobDescription: false,
    portalSettings: false,
    documents: false,
  });

  // Parser text input
  const [parseText, setParseText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // Skill tags state
  const [primarySkills, setPrimarySkills] = useState<string[]>(["Java", "Spring Boot", "React"]);
  const [newPrimarySkill, setNewPrimarySkill] = useState("");
  const [secondarySkills, setSecondarySkills] = useState<string[]>(["Docker", "AWS", "Git"]);
  const [newSecondarySkill, setNewSecondarySkill] = useState("");

  // Documents file state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);

  // WYSIWYG Editor custom HTML state / source mode state
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [respondByType, setRespondByType] = useState("Open Until Filled");

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessUnit: "enfycon Inc",
      jobCode: "JPC-" + Math.floor(1000 + Math.random() * 9000),
      country: "United States",
      states: "Texas",
      remoteJob: "Hybrid",
      hoursPerWeek: 40,
      jobStatus: "Active",
      priority: "Medium",
      workAuthorization: "US Citizen / Green Card",
      taxTerms: "C2C",
      expMin: 3,
      expMax: 8,
      numPositions: 1,
      maxSubmissions: 5,
      postToPortal: true,
      displayContactOnPortal: false,
      jobDescription: "",
    },
  });

  // Autocomplete auto-save simulation
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty && activeWorkflow === "manual") {
        toast("Draft auto-saved successfully", {
          icon: "💾",
          duration: 2000,
        });
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [isDirty, activeWorkflow]);

  // Skill tags handlers
  const addPrimarySkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newPrimarySkill.trim()) {
      e.preventDefault();
      if (!primarySkills.includes(newPrimarySkill.trim())) {
        setPrimarySkills([...primarySkills, newPrimarySkill.trim()]);
      }
      setNewPrimarySkill("");
    }
  };

  const removePrimarySkill = (tag: string) => {
    setPrimarySkills(primarySkills.filter((t) => t !== tag));
  };

  const addSecondarySkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newSecondarySkill.trim()) {
      e.preventDefault();
      if (!secondarySkills.includes(newSecondarySkill.trim())) {
        setSecondarySkills([...secondarySkills, newSecondarySkill.trim()]);
      }
      setNewSecondarySkill("");
    }
  };

  const removeSecondarySkill = (tag: string) => {
    setSecondarySkills(secondarySkills.filter((t) => t !== tag));
  };

  // Document Upload Sim
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map((f) => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + " KB",
      }));
      setUploadedFiles((prev) => [...prev, ...filesArray]);
      toast.success("Document uploaded successfully");
    }
  };

  // Parser simulated extraction
  const handleStartParsing = () => {
    if (!parseText.trim()) {
      toast.error("Please paste or type a job description first.");
      return;
    }
    setIsParsing(true);
    setTimeout(() => {
      setValue("jobTitle", "Senior Java Engineer (Cloud Platforms)");
      setValue("clientBillRate", "USD - $95/hr");
      setValue("payRate", "USD - $75/hr");
      setValue("workAuthorization", "US Citizen / GC / H1B");
      setValue("expMin", 5);
      setValue("expMax", 10);
      setPrimarySkills(["Java 17", "Spring Boot", "Microservices", "Kafka"]);
      setSecondarySkills(["Docker", "Kubernetes", "AWS EKS", "CI/CD"]);
      setValue(
        "jobDescription",
        `<h3>Senior Java Engineer (Cloud Platforms)</h3><p>We are looking for a Senior Java Developer with strong experience in building cloud-native microservices, containerized deployment, and highly scalable back-end services.</p><p><strong>Requirements:</strong></p><ul><li>5+ years of Java backend experience</li><li>Deep knowledge of Spring Boot & Kafka</li><li>Familiarity with AWS EKS and Docker</li></ul>`
      );
      setIsParsing(false);
      setActiveWorkflow("manual");
      toast.success("AI extraction completed! Review pre-filled form fields below.");
    }, 2000);
  };

  // Form submit handler — POST to real backend API
  const onSubmit = async (data: FormValues) => {
    try {
      if (!atsApi.auth.isAuthenticated()) {
        await atsApi.auth.login("recruiter@enfycon.com", "enfycon123");
      }

      // Map frontend form fields → backend CreateJobDto
      const payload = {
        title: data.jobTitle,
        client: data.client,
        location: data.locationAutocomplete || data.states || "Remote",
        type: data.taxTerms || "Contract",
        description: data.jobDescription,
        skillsRequired: primarySkills,
        secondarySkills: secondarySkills,
        businessUnit: data.businessUnit,
        state: data.states,
        country: data.country,
        clientJobId: data.clientJobId || undefined,
        status: data.jobStatus,
        visaType: data.workAuthorization,
        clientBillRate: data.clientBillRate,
        payRate: data.payRate,
        noOfPositions: data.numPositions,
        submissionRequired: data.maxSubmissions,
        priority: data.priority,
        taxTerms: data.taxTerms,
        remoteJob: data.remoteJob,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        hoursPerWeek: data.hoursPerWeek,
        duration: data.duration || undefined,
        recruitmentManagerId: data.recruitmentManager || undefined,
        primaryRecruiterId: data.primaryRecruiter || undefined,
        assignedTo: data.assignedTo || undefined,
        accountManagerId: data.accountManager || undefined,
        industry: data.industry || undefined,
        degree: data.degree || undefined,
        expMin: data.expMin,
        expMax: data.expMax,
      };

      const created = await atsApi.jobs.create(payload);

      toast.success(`Job posting created successfully! Code: ${created.jobCode}`);
      router.push("/job-posting");
    } catch (err: any) {
      console.error("[NewJob] API error:", err);
      toast.error("Failed to create job: " + (err.message || "Backend connection failed."));
    }
  };

  // Section Header component for clean toggling
  const SectionHeader = ({
    title,
    sectionKey,
  }: {
    title: string;
    sectionKey: keyof typeof collapsedSections;
  }) => {
    const isCollapsed = collapsedSections[sectionKey];
    return (
      <div
        onClick={() =>
          setCollapsedSections({
            ...collapsedSections,
            [sectionKey]: !isCollapsed,
          })
        }
        className="flex items-center justify-between bg-neutral-100 dark:bg-slate-800/80 px-4 py-2 cursor-pointer select-none hover:bg-neutral-200 dark:hover:bg-slate-700/80 border-y border-neutral-200 dark:border-slate-800 first:border-t-0 font-sans transition-colors"
      >
        <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
          {title}
        </span>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/50 dark:bg-slate-900/10 font-sans">
      {/* 1. LANDING WORKFLOW */}
      {activeWorkflow === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-xl space-y-2 mb-8 animate-fadeIn">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Create New Job Requirement
            </h1>
            <p className="text-sm text-neutral-500 font-medium">
              Select a requirement sourcing method below to begin the job posting workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full">
            {/* Card 1: Manual */}
            <div
              onClick={() => setActiveWorkflow("manual")}
              className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg cursor-pointer shadow-xs hover:shadow-md hover:border-primary/50 group transition-all duration-300"
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mt-4">
                Manual Creation
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                Manually input client, business info, and recruiter mappings.
              </p>
            </div>

            {/* Card 2: Requisition */}
            <div
              onClick={() => {
                toast.success("Loading requisitions lists...");
                setActiveWorkflow("manual");
              }}
              className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg cursor-pointer shadow-xs hover:shadow-md hover:border-primary/50 group transition-all duration-300"
            >
              <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mt-4">
                From Requisition
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                Load client-approved requirements from VMS or internal intakes.
              </p>
            </div>

            {/* Card 3: Job Template */}
            <div
              onClick={() => {
                toast.success("Opening template catalog...");
                setActiveWorkflow("manual");
              }}
              className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg cursor-pointer shadow-xs hover:shadow-md hover:border-primary/50 group transition-all duration-300"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mt-4">
                Job Template
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                Select from library of pre-configured developer/manager descriptions.
              </p>
            </div>

            {/* Card 4: Parse Description */}
            <div
              onClick={() => setActiveWorkflow("parse")}
              className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg cursor-pointer shadow-xs hover:shadow-md hover:border-primary/50 group transition-all duration-300"
            >
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                <FileSearch className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mt-4">
                Parse Job Details
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                Paste job text to automatically extract title, skills, and rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. PARSE JOB DETAILS WORKFLOW */}
      {activeWorkflow === "parse" && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
          {/* Header Panel */}
          <div className="p-3 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveWorkflow("landing")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors text-neutral-500 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                Parse Job Details
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveWorkflow("landing")}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleStartParsing}
                disabled={isParsing}
                className="bg-primary text-white flex items-center gap-1.5 cursor-pointer font-bold text-xs"
              >
                {isParsing ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Start Parsing
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col space-y-4">
            <div>
              <Label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Paste Job Description
              </Label>
              <p className="text-[11px] text-neutral-555 mt-0.5 font-medium">
                Copy and paste the raw email requirement, client specifications, or portal text.
              </p>
            </div>
            <Textarea
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              placeholder="e.g. We require a Java Full Stack Developer for an initial 12-month C2C project with our client in Plano, TX. Rate: $95/hr C2C. Required skills: Java 17, Spring Boot, Microservices, and basic AWS container services..."
              className="flex-1 w-full p-4 text-xs font-mono min-h-[300px]"
            />
          </div>
        </div>
      )}

      {/* 3. MANUAL JOB CREATION FORM */}
      {activeWorkflow === "manual" && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col min-h-0 bg-neutral-50/20 dark:bg-slate-900/10"
        >
          {/* Top Sticky Action Bar */}
          <div className="p-3 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-20 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveWorkflow("landing")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors text-neutral-600 cursor-pointer"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                  New Job Requirement Form
                </h2>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                  Enfycon US IT Recruitment Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  toast.success("Draft saved successfully to local catalog");
                  router.push("/job-posting");
                }}
                className="h-8.5 font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-slate-800 cursor-pointer text-xs"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/job-posting")}
                className="h-8.5 font-bold text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-slate-700 cursor-pointer text-xs bg-white dark:bg-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8.5 font-bold bg-primary text-white shadow-xs hover:bg-primary/95 cursor-pointer text-xs"
              >
                Save Posting
              </Button>
            </div>
          </div>

          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto pb-12">
            <div className="w-full p-4 space-y-4">
              {/* Validation errors summary badge */}
              {Object.keys(errors).length > 0 && (
                <div className="p-3 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded text-red-700 dark:text-red-400 flex items-center gap-2 text-xs font-semibold">
                  <X className="h-4 w-4 shrink-0" />
                  <span>
                    Form validation failed. Please check the {Object.keys(errors).length} highlighted fields below before submitting.
                  </span>
                </div>
              )}

              {/* -------------------- BUSINESS INFORMATION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
                <SectionHeader title="Business Information" sectionKey="businessInfo" />
                {!collapsedSections.businessInfo && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    {/* BU */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Business Unit *</Label>
                      <select
                        {...register("businessUnit")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="enfycon Inc">enfycon Inc</option>
                        <option value="US Staffing">US Staffing</option>
                        <option value="RPO Division">RPO Division</option>
                      </select>
                      {errors.businessUnit && (
                        <p className="text-[10px] text-red-650 font-bold">{errors.businessUnit.message}</p>
                      )}
                    </div>

                    {/* Job Code */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Code *</Label>
                      <Input
                        type="text"
                        {...register("jobCode")}
                        className="h-8 text-xs bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700 font-semibold"
                      />
                      {errors.jobCode && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.jobCode.message}</p>
                      )}
                    </div>

                    {/* Facility */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Facility</Label>
                      <Input
                        type="text"
                        {...register("facility")}
                        className="h-8 text-xs bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700"
                        placeholder="e.g. HQ Office"
                      />
                    </div>

                    {/* Job Title */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Title *</Label>
                      <Input
                        type="text"
                        {...register("jobTitle")}
                        className="h-8 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700"
                        placeholder="e.g. Senior Java Developer"
                      />
                      {errors.jobTitle && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.jobTitle.message}</p>
                      )}
                    </div>

                    {/* Bill Rate */}
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-1">
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Bill Rate / Salary *</Label>
                        <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Bill rate information">?</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <select className="w-16 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0">
                          <option value="USD">USD</option>
                          <option value="CAD">CAD</option>
                          <option value="GBP">GBP</option>
                        </select>
                        <Input
                          type="text"
                          {...register("clientBillRate")}
                          className="h-8 text-xs bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700"
                          placeholder="Rate"
                        />
                        <select className="w-20 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0">
                          <option value="Hour">Hour</option>
                          <option value="Day">Day</option>
                          <option value="Year">Year</option>
                        </select>
                        <select className="w-20 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0">
                          <option value="C2C">C2C</option>
                          <option value="W2">W2</option>
                          <option value="1099">1099</option>
                        </select>
                      </div>
                      {errors.clientBillRate && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.clientBillRate.message}</p>
                      )}
                    </div>

                    {/* Pay Rate */}
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Pay Rate / Salary *</label>
                        <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Pay rate information">?</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <select className="w-16 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0">
                          <option value="USD">USD</option>
                          <option value="CAD">CAD</option>
                          <option value="GBP">GBP</option>
                        </select>
                        <input
                          type="text"
                          {...register("payRate")}
                          className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                          placeholder="Pay Rate"
                        />
                        <select className="w-20 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0">
                          <option value="Hour">Hour</option>
                          <option value="Day">Day</option>
                          <option value="Year">Year</option>
                        </select>
                        <select className="w-20 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0">
                          <option value="C2C">C2C</option>
                          <option value="W2">W2</option>
                          <option value="1099">1099</option>
                        </select>
                      </div>
                      {errors.payRate && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.payRate.message}</p>
                      )}
                    </div>

                    {/* Job Start Date */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Job Start Date *</label>
                      <input
                        type="date"
                        {...register("startDate")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                      />
                      {errors.startDate && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.startDate.message}</p>
                      )}
                    </div>

                    {/* Job End Date */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Job End Date</label>
                      <input
                        type="date"
                        {...register("endDate")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                      />
                    </div>

                    {/* Respond By */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Respond By</label>
                      <div className="flex gap-2">
                        <select
                          value={respondByType}
                          onChange={(e) => setRespondByType(e.target.value)}
                          className="bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 flex-1 cursor-pointer"
                        >
                          <option value="Open Until Filled">Open Until Filled</option>
                          <option value="Date Option">Date Option</option>
                        </select>
                        {respondByType === "Date Option" && (
                          <input
                            type="date"
                            {...register("respondBy")}
                            className="bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200 w-1/2"
                          />
                        )}
                      </div>
                    </div>

                    {/* Country */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Country *</label>
                      <select
                        {...register("country")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                      </select>
                    </div>

                    {/* States */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">States *</label>
                      <select
                        {...register("states")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="Texas">Texas</option>
                        <option value="California">California</option>
                        <option value="New York">New York</option>
                        <option value="New Jersey">New Jersey</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                    </div>

                    {/* Remote Job */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Remote Job</label>
                      <select
                        {...register("remoteJob")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    {/* Required Hours/Week */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Required Hours/Week</label>
                      <input
                        type="number"
                        {...register("hoursPerWeek", { valueAsNumber: true })}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                      />
                    </div>

                    {/* Job Status */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Job Status</label>
                      <select
                        {...register("jobStatus")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-green-700 dark:text-green-400 font-bold cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Hold">Hold</option>
                      </select>
                    </div>

                    {/* Client */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Client *</label>
                      <select
                        {...register("client")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="">-- Select Client --</option>
                        <option value="A2C Consulting">A2C Consulting</option>
                        <option value="Cleo Consulting INC">Cleo Consulting INC</option>
                        <option value="Zen & Art">Zen & Art</option>
                        <option value="Morph Enterprise">Morph Enterprise</option>
                      </select>
                      {errors.client && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.client.message}</p>
                      )}
                    </div>

                    {/* Client Job ID */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Client Job ID</label>
                      <input
                        type="text"
                        {...register("clientJobId")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                        placeholder="e.g. REQ-9941"
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Priority</label>
                      <select
                        {...register("priority")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    {/* Work Auth */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Work Authorization *</label>
                      <select
                        {...register("workAuthorization")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="US Citizen / Green Card">US Citizen / Green Card</option>
                        <option value="US Citizen / GC / H1B">US Citizen / GC / H1B</option>
                        <option value="H1B / EAD / OPT">H1B / EAD / OPT</option>
                        <option value="All authorized to work">All authorized to work</option>
                      </select>
                    </div>

                    {/* Tax Terms */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Tax Terms *</label>
                      <select
                        {...register("taxTerms")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="C2C">C2C</option>
                        <option value="W2">W2</option>
                        <option value="1099">1099</option>
                      </select>
                    </div>

                    {/* Location Autocomplete */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Location Autocomplete</label>
                      <input
                        type="text"
                        {...register("locationAutocomplete")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                        placeholder="e.g. Plano, TX"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* -------------------- SKILLS SECTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
                <SectionHeader title="Skills" sectionKey="skills" />
                {!collapsedSections.skills && (
                  <div className="p-4 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Industry */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Industry</label>
                        <input
                          type="text"
                          {...register("industry")}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                          placeholder="e.g. Banking / FinTech"
                        />
                      </div>

                      {/* Degree */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Degree</label>
                        <input
                          type="text"
                          {...register("degree")}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                          placeholder="e.g. BS / MS in Computer Science"
                        />
                      </div>

                      {/* Experience Min */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Experience Min (Years)</label>
                        <input
                          type="number"
                          {...register("expMin", { valueAsNumber: true })}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                        />
                      </div>

                      {/* Experience Max */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Experience Max (Years)</label>
                        <input
                          type="number"
                          {...register("expMax", { valueAsNumber: true })}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                    </div>

                    {/* Skill Tag Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Skills */}
                      <div className="space-y-2">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300 font-medium">Primary Skills (Press Enter to add)</label>
                        <div className="flex flex-wrap gap-1.5 p-2 border border-neutral-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 min-h-[42px] items-center">
                          {primarySkills.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-primary/10 border border-primary text-primary text-[10px] font-bold flex items-center gap-1 shadow-none rounded-sm"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removePrimarySkill(tag)}
                                className="hover:text-red-500 text-primary/70 transition-colors cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <input
                            type="text"
                            placeholder="Add Skill..."
                            value={newPrimarySkill}
                            onChange={(e) => setNewPrimarySkill(e.target.value)}
                            onKeyDown={addPrimarySkill}
                            className="bg-transparent border-none outline-hidden text-xs flex-1 min-w-[80px] text-neutral-800 dark:text-neutral-200"
                          />
                        </div>
                      </div>

                      {/* Secondary Skills */}
                      <div className="space-y-2">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300 font-medium">Secondary Skills (Press Enter to add)</label>
                        <div className="flex flex-wrap gap-1.5 p-2 border border-neutral-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 min-h-[42px] items-center">
                          {secondarySkills.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-neutral-100 dark:bg-slate-800 border border-neutral-350 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center gap-1 shadow-none rounded-sm"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeSecondarySkill(tag)}
                                className="hover:text-red-500 text-neutral-500 transition-colors cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <input
                            type="text"
                            placeholder="Add Skill..."
                            value={newSecondarySkill}
                            onChange={(e) => setNewSecondarySkill(e.target.value)}
                            onKeyDown={addSecondarySkill}
                            className="bg-transparent border-none outline-hidden text-xs flex-1 min-w-[80px] text-neutral-800 dark:text-neutral-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* -------------------- ORGANIZATIONAL INFORMATION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
                <SectionHeader title="Organizational Information" sectionKey="orgInfo" />
                {!collapsedSections.orgInfo && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    {/* Positions */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Number of Positions</label>
                      <input
                        type="number"
                        {...register("numPositions", { valueAsNumber: true })}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                      />
                    </div>

                    {/* Max Submissions */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Maximum Allowed Submissions</label>
                      <input
                        type="number"
                        {...register("maxSubmissions", { valueAsNumber: true })}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                      />
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Department</label>
                      <select
                        {...register("department")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="IT Services">IT Services</option>
                        <option value="Operations">Operations</option>
                        <option value="Sales">Sales</option>
                      </select>
                    </div>

                    {/* Sales Manager */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Sales Manager</label>
                      <select
                        {...register("salesManager")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="Sanjay Kumar">Sanjay Kumar</option>
                        <option value="Kunal Sharma">Kunal Sharma</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* -------------------- JOB DESCRIPTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
                <SectionHeader title="Job Description & Editor" sectionKey="jobDescription" />
                {!collapsedSections.jobDescription && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-t-lg p-2 transition-colors">
                      {/* Editor formatting toolbar mock */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toast("Bold style template", { icon: "📝" })}
                          className="px-2 py-1 hover:bg-neutral-200 dark:hover:bg-slate-750 rounded font-bold text-xs cursor-pointer text-neutral-700 dark:text-neutral-300"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => toast("Italic style template", { icon: "📝" })}
                          className="px-2 py-1 hover:bg-neutral-200 dark:hover:bg-slate-750 rounded italic text-xs cursor-pointer text-neutral-700 dark:text-neutral-300"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => toast("Underline style template", { icon: "📝" })}
                          className="px-2 py-1 hover:bg-neutral-200 dark:hover:bg-slate-750 rounded underline text-xs cursor-pointer text-neutral-700 dark:text-neutral-300"
                        >
                          U
                        </button>
                        <span className="w-px h-4 bg-neutral-300 dark:bg-slate-700 mx-1" />
                        <button
                          type="button"
                          onClick={() => toast("List template inserted", { icon: "📝" })}
                          className="px-2 py-1 hover:bg-neutral-200 dark:hover:bg-slate-750 rounded text-xs cursor-pointer text-neutral-700 dark:text-neutral-300"
                        >
                          • Bullet List
                        </button>
                      </div>

                      {/* Source Mode Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsHtmlMode(!isHtmlMode)}
                        className={cn(
                          "px-3 py-1 rounded text-xs font-bold border transition-colors cursor-pointer",
                          isHtmlMode
                            ? "bg-primary text-white border-primary"
                            : "hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        )}
                      >
                        {isHtmlMode ? "View Rich Text" : "HTML Source"}
                      </button>
                    </div>

                    <div className="relative">
                      {isHtmlMode ? (
                        <textarea
                          {...register("jobDescription")}
                          className="w-full h-64 bg-neutral-50 dark:bg-slate-950 border border-t-0 border-neutral-200 dark:border-slate-800 rounded-b-lg p-3 outline-hidden text-xs font-mono resize-none leading-relaxed text-neutral-800 dark:text-neutral-200"
                          placeholder="HTML Raw Content..."
                        />
                      ) : (
                        <textarea
                          {...register("jobDescription")}
                          className="w-full h-64 bg-white dark:bg-slate-950 border border-t-0 border-neutral-200 dark:border-slate-800 rounded-b-lg p-3 outline-hidden text-xs resize-none leading-relaxed text-neutral-800 dark:text-neutral-200"
                          placeholder="Type or paste rich job descriptions here..."
                        />
                      )}
                    </div>
                    {errors.jobDescription && (
                      <p className="text-[10px] text-red-655 font-bold">{errors.jobDescription.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* -------------------- CAREER PORTAL SETTINGS -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
                <SectionHeader title="Career Portal Settings" sectionKey="portalSettings" />
                {!collapsedSections.portalSettings && (
                  <div className="p-4 space-y-3 text-xs select-none">
                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-neutral-800 dark:text-neutral-250">
                      <input
                        type="checkbox"
                        {...register("postToPortal")}
                        className="h-4 w-4 accent-primary rounded"
                      />
                      <span>Post Job on Career Portal</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-neutral-800 dark:text-neutral-250">
                      <input
                        type="checkbox"
                        {...register("displayContactOnPortal")}
                        className="h-4 w-4 accent-primary rounded"
                      />
                      <span>Display Contact Details on Career Portal</span>
                    </label>
                  </div>
                )}
              </div>

              {/* -------------------- DOCUMENTS -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
                <SectionHeader title="Documents & Templates" sectionKey="documents" />
                {!collapsedSections.documents && (
                  <div className="p-4 space-y-4 text-xs">
                    {/* Drag and Drop Zone */}
                    <div className="border-2 border-dashed border-neutral-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-neutral-50/20 dark:bg-slate-950/10 hover:bg-neutral-50/50 dark:hover:bg-slate-955/20 transition-colors relative cursor-pointer group">
                      <Cloud className="h-8 w-8 text-neutral-400 group-hover:text-primary transition-colors" />
                      <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mt-2">
                        Drag & Drop documents here, or <span className="text-primary dark:text-blue-400 hover:underline">Browse files</span>
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                        PDF, DOCX, or TXT up to 10MB
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => toast.success("Connected to Dropbox catalog")}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                      >
                        Connect Dropbox
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success("Connected to OneDrive catalog")}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                      >
                        Connect OneDrive
                      </button>
                    </div>

                    {/* Uploaded List */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Uploaded Files ({uploadedFiles.length})
                        </div>
                        {uploadedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-slate-850 rounded border border-neutral-200 dark:border-slate-800"
                          >
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{file.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-neutral-500 font-medium text-[10px]">{file.size}</span>
                              <button
                                type="button"
                                onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                                className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
