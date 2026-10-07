import { ContactDialog } from "../components/contact-dialog";
// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
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
  AlertTriangle,
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
  Search,
  Check,
  Clock,
  Shield,
  Send,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Building2,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AddClientModal } from "../components/add-client-modal";
import { JobAssignmentModal, AssignmentType } from "@/components/ui/job-assignment-modal";
import { resolveActiveSystemRole, isRoleAdmin } from "@/lib/role-permissions";

import { Country, State, City } from "country-state-city";
import ReactCountryFlag from "react-country-flag";
import { WORK_AUTHORIZATION_OPTIONS, INDIAN_WORK_AUTHORIZATION_OPTIONS, INDIA_STATES_CITIES, US_STATES_CITIES } from "@/lib/job-form-constants";

import { atsApi, type JobStaffOption } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";
import { showErrorModal } from "@/components/shared/global-error-modal";





// Zod Validation Schema matching all manual form fields
const formSchema = zod.object({
  // Business Info
  businessUnit: zod.string().min(1, "Business Unit is required"),
  jobCode: zod.string().min(2, "Job Code is required"),
  jobTitle: zod.string().min(3, "Job Title must be at least 3 characters"),
  clientBillRate: zod.string().min(1, "Client Bill Rate is required"),
  payRate: zod.string().min(1, "Pay Rate is required"),
  startDate: zod.string().optional(),
  endDate: zod.string().optional(),
  respondBy: zod.string().optional(),
  country: zod.string().optional(),
  states: zod.string().optional(),
  city: zod.string().optional(),
  remoteJob: zod.string().min(1, "Work Mode is required"),
  hoursPerWeek: zod.union([zod.number().min(1).max(168), zod.nan().transform(() => undefined)]).optional(),
  jobStatus: zod.string(),
  client: zod.string().min(1, "Client is required"),
  endClientName: zod.string().optional(),
  clientJobId: zod.string().optional(),
  priority: zod.enum(["Hot", "Warm", "Cold"]),
  additionalDetails: zod.string().optional(),
  ceipalRefNum: zod.string().optional(),
  duration: zod.string().optional(),
  workAuthorization: zod.string().min(1, "At least one Work Authorization is required"),
  applicationForm: zod.string().optional(),
  placementFeePercent: zod.union([zod.number().min(0).max(100), zod.nan().transform(() => undefined)]).optional(),
  address: zod.string().optional(),
  projectType: zod.string().optional(),
  jobCategory: zod.string().optional(),
  locationAutocomplete: zod.string().optional(),
  employmentTestTemplate: zod.string().optional(),
  turnaroundTime: zod.string().optional(),
  jobType: zod.string().min(1, "Job Type is required"),
  taxTerms: zod.string().min(1, "Tax Terms are required"),
  domain: zod.string().optional(),
  shiftTiming: zod.string().optional(),
  noticePeriod: zod.string().optional(),
  employmentLevel: zod.string().optional(),
  clientManager: zod.string().optional(),
  recruitmentManager: zod.string().optional(),
  recruiter: zod.string().optional(),
  

  // Skills Section
  industry: zod.string().optional(),
  degree: zod.string().optional(),
  expMin: zod.union([zod.number().min(0), zod.nan().transform(() => undefined)]).optional(),
  expMax: zod.union([zod.number().min(0), zod.nan().transform(() => undefined)]).optional(),
  languages: zod.string().optional(),
  evaluationTemplate: zod.string().optional(),

  // Org Info
  numPositions: zod.number({ invalid_type_error: "Number of Positions is required" }).min(1, "Number of Positions is required"),
  maxSubmissions: zod.number({ invalid_type_error: "Maximum Allowed Submissions is required" }).min(1, "Maximum Allowed Submissions is required"),
  department: zod.string().optional(),
  salesManager: zod.string().optional(),
  secondarySalesManager: zod.string().optional(),
  accountManager: zod.string().optional(),
  additionalNotifications: zod.string().optional(),

  // Job Description
  jobDescription: zod.string().min(10, "Job Description must be at least 10 characters"),

  // Portal Settings (Legacy/Optional)
  postToPortal: zod.boolean().optional(),
  displayContactOnPortal: zod.boolean().optional(),
});

type FormValues = zod.infer<typeof formSchema>;




export function IndiaStaffingForm({ editJobId }: { editJobId?: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isJobLoading, setIsJobLoading] = useState(!!editJobId);

// Workflow active screen state: 'landing' | 'manual' | 'parse'
  // Detect cloneFrom query parameter immediately to smoothly transition directly to manual edit page
  const [activeWorkflow, setActiveWorkflow] = useState<"landing" | "manual" | "parse">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("cloneFrom") || params.get("duplicateFrom") || params.get("copyFrom")) {
        return "manual";
      }
    }
    return editJobId ? "manual" : "landing";
  });

  const [isCloningLoading, setIsCloningLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return !!(params.get("cloneFrom") || params.get("duplicateFrom") || params.get("copyFrom"));
    }
    return false;
  });

  // Collapse/Expand state for each form section
  const [collapsedSections, setCollapsedSections] = useState({
    businessInfo: false,
    location: false,
    skills: false,
    orgInfo: false,
    jobDescription: false,
    documents: false,
  });

  // Parser text input
  const [parseText, setParseText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // Skill tags state
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [newPrimarySkill, setNewPrimarySkill] = useState("");
  const [secondarySkills, setSecondarySkills] = useState<string[]>([]);
  const [newSecondarySkill, setNewSecondarySkill] = useState("");

  // Documents file state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [endClientDropdownOpen, setEndClientDropdownOpen] = useState(false);
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [prefilledClientName, setPrefilledClientName] = useState("");
  const [clientModalTarget, setClientModalTarget] = useState<"client" | "endClientName">("client");
  const [clientList, setClientList] = useState<any[]>([]);
  const [clientSearchText, setClientSearchText] = useState("");
  const [endClientSearchText, setEndClientSearchText] = useState("");
  const [publishingModalState, setPublishingModalState] = useState<{
    isOpen: boolean;
    status: "publishing" | "success" | "error";
    jobTitle: string;
    jobCode: string;
    client: string;
    location: string;
    jobType: string;
    positions: number;
    payRate: string;
    businessUnit: string;
    createdJobId?: string;
    errorMessage?: string;
  } | null>(null);

  const [countrySearchText, setCountrySearchText] = useState("");
  const [stateSearchText, setStateSearchText] = useState("");
  const [citySearchText, setCitySearchText] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [pocList, setPocList] = useState<{ myContacts: any[]; otherContacts: any[] }>({ myContacts: [], otherContacts: [] });
  useEffect(() => {
    if (!selectedClientId) { setPocList({ myContacts: [], otherContacts: [] }); return; }
    let active = true;
    atsApi.clients.getContacts(selectedClientId).then(data => { if (active) setPocList(data); }).catch(() => { if (active) setPocList({ myContacts: [], otherContacts: [] }); });
    return () => { active = false; };
  }, [selectedClientId]);
  const [pocOpen, setPocOpen] = useState(false);
  const [pocSearch, setPocSearch] = useState('');
  const [selectedPocId, setSelectedPocId] = useState<string | null>(null);
  const [endPocOpen, setEndPocOpen] = useState(false);
  const [endPocSearch, setEndPocSearch] = useState("");
  const [selectedEndPocId, setSelectedEndPocId] = useState<string | null>(null);

  const [selectedEndClientId, setSelectedEndClientId] = useState<string | null>(null);
  const [endPocList, setEndPocList] = useState<{myContacts: any[], otherContacts: any[]}>({ myContacts: [], otherContacts: [] });
  const [addEndPocOpen, setAddEndPocOpen] = useState(false);
  const [newEndPocName, setNewEndPocName] = useState("");
  const [newEndPocDesignation, setNewEndPocDesignation] = useState("");
  const [newEndPocEmail, setNewEndPocEmail] = useState("");
  const [newEndPocPhone, setNewEndPocPhone] = useState("");

  useEffect(() => {
    if (!selectedEndClientId) {
      setEndPocList({ myContacts: [], otherContacts: [] });
      setSelectedEndPocId(null);
      return;
    }
    const fetchEndPocs = async () => {
      try {
        const data = await atsApi.clients.getContacts(selectedEndClientId);
        {
          const me = session?.user?.email || "me";
          const mine = data.filter((p: any) => p.created_by_email === me || p.createdByEmail === me);
          const others = data.filter((p: any) => p.created_by_email !== me && p.createdByEmail !== me);
          setEndPocList({ myContacts: mine, otherContacts: others });
        }
      } catch (err) {
        console.error("Failed to fetch end POCs", err);
      }
    };
    fetchEndPocs();
  }, [selectedEndClientId, session?.user?.email]);

  // Auto-sync End POC with Client POC if they are the same company
  useEffect(() => {
    if (selectedClientId && selectedEndClientId && selectedClientId === selectedEndClientId && selectedPocId) {
      if (selectedEndPocId !== selectedPocId) {
        setSelectedEndPocId(selectedPocId);
      }
    }
  }, [selectedClientId, selectedEndClientId, selectedPocId, selectedEndPocId]);

  const [addPocOpen, setAddPocOpen] = useState(false);
  const [newPocName, setNewPocName] = useState('');
  const [newPocDesignation, setNewPocDesignation] = useState('');
  const [newPocEmail, setNewPocEmail] = useState('');
  const [newPocPhone, setNewPocPhone] = useState('');

  const countryListRef = useRef<HTMLDivElement>(null);
  const stateListRef = useRef<HTMLDivElement>(null);
  const cityListRef = useRef<HTMLDivElement>(null);

  const sortedCountries = useMemo(() => {
    const popularNames = ["India", "United States", "United Kingdom", "Canada", "Australia", "United Arab Emirates", "Singapore"];
    const countries = Country.getAllCountries();
    const popular = Country.getAllCountries().filter(c => popularNames.includes(c.name));
    const others = Country.getAllCountries().filter(c => !popularNames.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    return [...popular, ...others];
  }, []);

  useEffect(() => {
    if (countryListRef.current) {
      countryListRef.current.scrollTop = 0;
    }
  }, [countrySearchText]);

  useEffect(() => {
    if (stateListRef.current) {
      stateListRef.current.scrollTop = 0;
    }
  }, [stateSearchText]);

  useEffect(() => {
    if (cityListRef.current) {
      cityListRef.current.scrollTop = 0;
    }
  }, [citySearchText]);

  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [respondByType, setRespondByType] = useState("Open Until Filled");
  const [workAuthSearch, setWorkAuthSearch] = useState("");
  const [isWorkAuthOpen, setIsWorkAuthOpen] = useState(false);
  const workAuthDropdownRef = useRef<HTMLDivElement>(null);
  
const getInitialActiveBranchContext = () => {
  if (typeof window === "undefined") {
    return { branchName: "", branchId: "" };
  }
  const bId = localStorage.getItem("active_branch_id") || "";
  const bName = localStorage.getItem("active_branch_name") || "";
  return { branchName: bName, branchId: bId };
};
  const initialBranchContext = useMemo(() => getInitialActiveBranchContext(), []);

  // Pod & User selection and approver routing
  const [podsList, setPodsList] = useState<any[]>([]);
  const [branchUsers, setBranchUsers] = useState<JobStaffOption[]>([]);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("unassigned");
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);
  const [selectedApproverRole, setSelectedApproverRole] = useState<string>("POD_LEAD");
  const [selectedApproverId, setSelectedApproverId] = useState<string>("");
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const selectedUnitObj = useMemo(() => availableUnits.find(u => u.id === selectedUnitId), [availableUnits, selectedUnitId]);

  const handleUnitChange = async (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId);
    if (!unit) return;

    setValue("businessUnit", unit.name);

    // Determine market from unit
    const unitMarket = (unit.market || "").toUpperCase();
    
    const targetM = "IN";

    
    if (targetM === "IN") {
      setValue("country", "India");
      setValue("jobType", "Full Time");
      setValue("shiftTiming", unit.shiftTiming || "General Shift (Day)");
      setValue("taxTerms", "Permanent");
                                    setBillUnit("LPA");
                                    setPayUnit("LPA");
      setBillCurrency("INR");
      setBillUnit("LPA");
      setBillTerm("Permanent");
      setPayCurrency("INR");
      setPayUnit("LPA");
      setPayTerm("Permanent");
    } else {
      setValue("country", "United States");
      setValue("jobType", "Full Time");
      setValue("shiftTiming", unit.shiftTiming || "US Shift (Night)");
      setValue("taxTerms", "C2C");
      setBillCurrency("USD");
      setBillUnit("Hourly");
      setBillTerm("C2C");
      setPayCurrency("USD");
      setPayUnit("Hourly");
      setPayTerm("C2C");
    }

    try {
      const res = await atsApi.jobs.getNextCode({
        branchId: unit.branchId || undefined,
        businessUnitId: unit.id || undefined,
        shift: "DAY",
      });
      if (res && res.code) {
        setValue("jobCode", res.code);
      }
    } catch (e) {
      console.warn("Could not fetch next job code for selected unit:", e);
    }
  };
  
  const [tenantName, setTenantName] = useState(() => initialBranchContext.branchName || "enfycon Inc");
  
  const currentWorkAuthOptions = INDIAN_WORK_AUTHORIZATION_OPTIONS;

  // Active Perspective & Approver Persona Calculations
  const userPerspective = useMemo(() => {
    const override = typeof window !== "undefined" ? localStorage.getItem("override_role") : null;
    if (override) return resolveActiveSystemRole(override);
    const localUser = typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null;
    const userRoles = localUser?.roles || (session as any)?.user?.roles || [];
    return resolveActiveSystemRole(userRoles);
  }, [session]);

  // Granular check: Does this creator require approval before publishing live?
  // Purely permission-based: creators with `job:publish_direct` post directly; those without it enter Pending Approval
  const requireApproval = useMemo(() => {
    const localUser = typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null;
    const permissions: string[] = localUser?.permissions || (session as any)?.user?.permissions || [];

    // 1. Direct publish permission bypasses approval gate
    if (permissions.includes("job:publish_direct")) return false;

    // 2. Admins bypass approval
    if (userPerspective === "SUPER_ADMIN" || userPerspective === "TENANT_ADMIN" || userPerspective === "BRANCH_ADMIN") {
      return false;
    }

    // 3. User lacks job:publish_direct permission -> requires approval
    return true;
  }, [userPerspective, session]);

  const deliveryHeads = useMemo(() => branchUsers.filter(user => user.canReview), [branchUsers]);
  const recruitersList = useMemo(() => branchUsers.filter(user => user.canRecruit), [branchUsers]);
  const getUserRoleLabel = useCallback((user: JobStaffOption): string =>
    user.canRecruit && user.canReview ? "Recruiter / Reviewer" : user.canRecruit ? "Recruiter" : "Reviewer", []);

  const branchPods = useMemo(() => podsList.filter((pod: any) =>
    (pod.businessUnitId || pod.business_unit_id) === selectedUnitId), [podsList, selectedUnitId]);


  // Currency, Unit, and Term States for Bill Rate
  const [billCurrency, setBillCurrency] = useState(() => "INR");
  const [billUnit, setBillUnit] = useState(() => "LPA");
  const [billTerm, setBillTerm] = useState(() => "Permanent");

  // Commission States for Domestic Indian Permanent Roles
  const [commissionType, setCommissionType] = useState<string>("8.33");
  const [customCommission, setCustomCommission] = useState<string>("");

  // Currency, Unit, and Term States for Pay Rate
  const [payCurrency, setPayCurrency] = useState(() => "INR");
  const [payUnit, setPayUnit] = useState(() => "LPA");
  const [payTerm, setPayTerm] = useState(() => "Permanent");
  const [payRateMin, setPayRateMin] = useState("");
  const [payRateMax, setPayRateMax] = useState("");

  // Job Assignment Dropdown states
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const assignmentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        workAuthDropdownRef.current &&
        !workAuthDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWorkAuthOpen(false);
      }
      if (
        assignmentDropdownRef.current &&
        !assignmentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAssignmentOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<FormValues>({
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessUnit: "",
      jobCode: "",
      clientBillRate: "8.33% Placement Commission",
      country: "India",
      states: "",
      city: "",
      remoteJob: "In Office",
      hoursPerWeek: undefined,
      jobStatus: "Active",
      priority: "Warm",
      workAuthorization: "",
      jobType: "Full Time",
      taxTerms: "Permanent",
      expMin: undefined,
      expMax: undefined,
      numPositions: 1,
      maxSubmissions: 5,
      postToPortal: true,
      displayContactOnPortal: false,
      jobDescription: "",
      noticePeriod: "",
      endClientName: "",
      shiftTiming: "General Shift",
    },
  });

  const selectedCountry = watch("country");
  const watchTaxTerms = watch("taxTerms");

  // Clear clientBillRate if it switches from Permanent to something else and contains %
  useEffect(() => {
    const currentRate = watch("clientBillRate");
    if (watch("taxTerms") !== "Permanent" && currentRate && currentRate.includes("Placement")) {
      setValue("clientBillRate", "");
    } else if (watch("taxTerms") === "Permanent" && !currentRate) {
      setValue("clientBillRate", "8.33% Placement Commission");
    }
  }, [watch("taxTerms")]);


  // Keep clientBillRate synced when market is IN and taxTerms is Permanent
  useEffect(() => {
    if (true && watchTaxTerms === "Permanent") {
      const commVal = commissionType === "custom" ? customCommission : commissionType;
      if (commVal) {
        setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: false });
      }
    }
  }, [watchTaxTerms, commissionType, customCommission, setValue]);

  useEffect(() => {
    if (selectedCountry === "India") {
      
      setBillCurrency("INR");
      setBillUnit("LPA");
      setBillTerm("Permanent");

      setPayCurrency("INR");
      setPayUnit("LPA");
      setPayTerm("Permanent");
      
      setValue("taxTerms", "Permanent");
                                    setBillUnit("LPA");
                                    setPayUnit("LPA");
      const commVal = commissionType === "custom" ? customCommission : commissionType;
      setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: false });
    } else if (selectedCountry === "United States") {
      
      setBillCurrency("USD");
      setBillUnit("Hourly");
      setBillTerm("C2C");

      setPayCurrency("USD");
      setPayUnit("Hourly");
      setPayTerm("C2C");
      
      setValue("taxTerms", "C2C");
    }
  }, [selectedCountry, setValue, commissionType, customCommission]);

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const assignmentPolicy = selectedUnitObj;
  const canAssignRecruiters = !!currentUserProfile?.permissions?.includes("job:assign_recruiter");
  const canAssignPods = !!currentUserProfile?.permissions?.includes("job:assign_pod");
  const canAssignJob = canAssignRecruiters || canAssignPods;
  const assignmentRequired = assignmentPolicy?.allowUnassigned !== true;
  const assignmentValid = (assignmentType === "pod" && branchPods.some(p => p.id === selectedPodId) && canAssignPods && assignmentPolicy?.allowPods === true) ||
    (assignmentType === "recruiters" && selectedRecruiterIds.length > 0 && selectedRecruiterIds.every(id => recruitersList.some(r => r.id === id)) && canAssignRecruiters && assignmentPolicy?.allowNone === true);
  useEffect(() => {
    let cancelled = false;
    setPodsList([]);
    if (!canAssignPods || !selectedUnitId) return;
    const unit = availableUnits.find(unit => unit.id === selectedUnitId);
    atsApi.jobs.podOptions({ branchId: unit?.branchId || currentUserProfile?.branchId, businessUnitId: selectedUnitId })
      .then(pods => { if (!cancelled) { setPodsList(pods); setSelectedPodId(id => pods.some(p => p.id === id) ? id : null); } })
      .catch(error => { if (!cancelled) toast.error(error.message || "Could not load pods."); });
    return () => { cancelled = true; };
  }, [selectedUnitId, canAssignPods, availableUnits, currentUserProfile]);

  useEffect(() => {
    let cancelled = false;
    setBranchUsers([]);
    if (!currentUserProfile?.permissions?.includes("job:assign_recruiter") || !selectedUnitId) return;
    const unit = availableUnits.find(unit => unit.id === selectedUnitId);
    atsApi.jobs.staffingOptions({ branchId: unit?.branchId || unit?.branch_id || currentUserProfile.branchId,
      businessUnitId: selectedUnitId }).then(staff => {
      if (!cancelled) {
        setBranchUsers(staff);
        setSelectedRecruiterIds(ids => ids.filter(id => staff.some(person => person.id === id && person.canRecruit)));
      }
    }).catch(error => {
      if (!cancelled) toast.error(error.message || "Unable to load eligible job staff.");
    });
    return () => { cancelled = true; };
  }, [selectedUnitId, availableUnits, currentUserProfile]);


  const fetchClients = useCallback(async () => {
    try {
      const res = await atsApi.clients.list();
      setClientList(res || []);
    } catch (e) {
      console.error("Failed to fetch clients", e);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    async function fetchProfile() {
      try {
        const prof = await atsApi.auth.me();
        if (prof) {
          setCurrentUserProfile(prof);
          let tName = prof.tenant?.name || prof.tenantDomain || "";
          if (!tName) {
            tName = typeof window !== 'undefined' ? getTenantIdentifier() : "";
          }
          
          if (!tName || tName === "temp") {
            tName = "enfycon Inc";
          } else if (tName.toLowerCase() === "deb") {
            tName = "deb saas tenant";
          } else {
            if (tName.toLowerCase().endsWith(".com")) {
              tName = tName.slice(0, -4);
            }
            if (/^[a-z0-9-]+$/.test(tName)) {
              tName = tName.charAt(0).toUpperCase() + tName.slice(1);
            }
          }

          // Fetch dynamic next jobCode and market based on Active Branch Context & Shift
          const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
          const activeBranchName = typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') || "" : "";
          
          
          const displayBusinessUnit = activeBranchName || tName;
          setTenantName(displayBusinessUnit);

          // Fetch branches and units immediately
          let branchesList: any[] = [];
          let matchedUnit = null;
          try {
            const [bList, unitsList] = await Promise.all([
              atsApi.branches.list().catch(() => []),
              atsApi.businessUnits.list().catch(() => []),
            ]);
            branchesList = bList || [];
            
            let finalUnits = unitsList || [];

            finalUnits = finalUnits.filter((u: any) => {
              const m = (u.market || u.marketSegmentCode || u.marketSegment?.code || "").toUpperCase();
              return m === "IN" || m === "INDIA" || m === "IND";
            });

            let finalBranches = branchesList || [];
            const isAdmin = prof ? isRoleAdmin(resolveActiveSystemRole(prof.roles)) : false;
            
            if (!isAdmin) {
              if (prof?.businessUnitId) {
                finalUnits = finalUnits.filter((u: any) => u.id === prof.businessUnitId);
              } else if (activeBranchId && activeBranchId !== "all") {
                finalUnits = finalUnits.filter((u: any) => u.branchId === activeBranchId);
              }
              
              if (prof?.branchId) {
                finalBranches = finalBranches.filter((b: any) => b.id === prof.branchId);
              } else if (activeBranchId && activeBranchId !== "all") {
                finalBranches = finalBranches.filter((b: any) => b.id === activeBranchId);
              }
            }
            
            setAvailableBranches(finalBranches);
            setAvailableUnits(finalUnits);

            if (activeBranchId) {
              matchedUnit = (finalUnits || []).find((u: any) => u.branchId === activeBranchId);
            }
            if (!matchedUnit && prof?.businessUnitId) {
              matchedUnit = (finalUnits || []).find((u: any) => u.id === prof.businessUnitId);
            }
            if (!matchedUnit && finalUnits && finalUnits.length > 0) {
              matchedUnit = finalUnits[0];
            }
            if (matchedUnit) {
              setSelectedUnitId(matchedUnit.id);
              setValue("businessUnit", matchedUnit.name);
            }



          } catch (e) {
            console.warn("Failed to load units:", e);
          }

          let activeBranchObj = null;
          if (activeBranchId) {
            activeBranchObj = branchesList.find((b: any) => b.id === activeBranchId);
          }
          if (!activeBranchObj && activeBranchName) {
            activeBranchObj = branchesList.find((b: any) => b.name?.toLowerCase() === activeBranchName.toLowerCase());
          }
          setActiveBranch(activeBranchObj || null);
          

          
          

          try {
            const res = await atsApi.jobs.getNextCode({ 
              branchId: activeBranchId || undefined,
              businessUnitId: matchedUnit?.id || undefined,
              shift: 'DAY'
            });
            if (res && res.code) {
              setValue("jobCode", res.code);
            } else {
              const date = new Date();
              const yy = date.getFullYear().toString().slice(-2);
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              const sCode = 'D';
              setValue("jobCode", `GEN-${yy}${mm}${dd}-${sCode}00001`);
            }
          } catch (e) {
            const date = new Date();
            const yy = date.getFullYear().toString().slice(-2);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const sCode = 'D';
            setValue("jobCode", `GEN-${yy}${mm}${dd}-${sCode}00001`);
          }

          const posterName = (session as any)?.user?.name || prof?.name || prof?.email || "Account Manager";

          
          const tMarket = "IN";
          if (tMarket === "IN") {
            setValue("jobType", "Full Time");
            setValue("shiftTiming", "General Shift (Day)");
            setValue("taxTerms", "Permanent");
                                    setBillUnit("LPA");
                                    setPayUnit("LPA");
            setValue("accountManager", posterName);
            setBillCurrency("INR");
            setBillUnit("LPA");
            setBillTerm("Permanent");
            setPayCurrency("INR");
            setPayUnit("LPA");
            setPayTerm("Permanent");
          } else {
            setValue("jobType", "Full Time");
            setValue("shiftTiming", "US Shift (Night)");
            setValue("taxTerms", "C2C");
            setBillCurrency("USD");
            setBillUnit("Hourly");
            setBillTerm("C2C");
            setPayCurrency("USD");
            setPayUnit("Hourly");
            setPayTerm("C2C");
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }

  async function checkAndLoadCloneData() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cloneFromId = params.get('cloneFrom') || params.get('duplicateFrom') || params.get('copyFrom');
    if (!cloneFromId) {
      setIsCloningLoading(false);
      return;
    }

    try {
      setIsCloningLoading(true);
      const sourceJob = await atsApi.jobs.get(cloneFromId);
      if (sourceJob) {
        toast.success(`Duplicating job: Pre-filled form from ${sourceJob.jobCode}`, { id: "clone-toast" });
        setActiveWorkflow("manual");

        if (sourceJob.jobTitle) setValue("jobTitle", sourceJob.jobTitle);
        if (sourceJob.businessUnit) {
          setValue("businessUnit", sourceJob.businessUnit);
          const u = (availableUnits || []).find((unit: any) => unit.name?.toLowerCase() === sourceJob.businessUnit?.toLowerCase());
          if (u) setSelectedUnitId(u.id);
        }
        if (sourceJob.client) setValue("client", sourceJob.client);
        if (sourceJob.endClientName) setValue("endClientName", sourceJob.endClientName);
        if (sourceJob.clientJobId) setValue("clientJobId", sourceJob.clientJobId);
        if (sourceJob.location) setValue("city", sourceJob.location);
        if (sourceJob.state) setValue("states", sourceJob.state);
        if (sourceJob.country) {
          setValue("country", sourceJob.country);
        }
        if (sourceJob.type) setValue("jobType", sourceJob.type);
        if (sourceJob.priority) {
          const p = sourceJob.priority;
          setValue("priority", p === "Hot" || p === "High" || p === "Urgent" ? "Hot" : p === "Cold" || p === "Low" ? "Cold" : "Warm");
        }
        if (sourceJob.remoteJob) {
          const rLower = (sourceJob.remoteJob || "").toLowerCase();
          if (rLower.includes("remote") || rLower === "yes") {
            setValue("remoteJob", "Remote");
          } else if (rLower.includes("hybrid")) {
            setValue("remoteJob", "Hybrid");
          } else {
            setValue("remoteJob", "In Office");
          }
        }
        if (sourceJob.duration) setValue("duration", sourceJob.duration);
        if (sourceJob.hoursPerWeek) setValue("hoursPerWeek", sourceJob.hoursPerWeek);
        if (sourceJob.noOfPositions) setValue("numPositions", sourceJob.noOfPositions);
        if (sourceJob.submissionRequired) setValue("maxSubmissions", sourceJob.submissionRequired);
        if (sourceJob.industry) setValue("industry", sourceJob.industry);
        if (sourceJob.degree) setValue("degree", sourceJob.degree);
        if (sourceJob.expMin != null) setValue("expMin", sourceJob.expMin);
        if (sourceJob.expMax != null) setValue("expMax", sourceJob.expMax);
        if (sourceJob.taxTerms) setValue("taxTerms", sourceJob.taxTerms);
        if ((sourceJob as any).workAuthorization || sourceJob.visaType) setValue("workAuthorization", (sourceJob as any).workAuthorization || sourceJob.visaType);
        if (sourceJob.clientBillRate) setValue("clientBillRate", sourceJob.clientBillRate);
        if (sourceJob.payRate) setValue("payRate", sourceJob.payRate);
        if (sourceJob.description) {
          const cleanDesc = sourceJob.description
            .replace(/<p>\s*<strong>Shift Timing:<\/strong>[^<]*<\/p>/gi, "")
            .replace(/<p>\s*Shift Timing:[^<]*<\/p>/gi, "")
            .replace(/^Shift Timing:[^\n]*\n*/gim, "")
            .trim();
          setValue("jobDescription", cleanDesc);
        }
        if (sourceJob.shiftTiming) {
          setValue("shiftTiming", sourceJob.shiftTiming);
        } else if (sourceJob.description) {
          const shiftTimingMatch = sourceJob.description.match(/<p>\s*<strong>Shift Timing:<\/strong>\s*([^<]+)<\/p>/i)
            || sourceJob.description.match(/Shift Timing:\s*([^\n<]+)/i);
          if (shiftTimingMatch) {
            setValue("shiftTiming", shiftTimingMatch[1].trim());
          }
        }
        if (Array.isArray(sourceJob.skillsRequired) && sourceJob.skillsRequired.length > 0) {
          setPrimarySkills(sourceJob.skillsRequired);
        }
        if (Array.isArray(sourceJob.secondarySkills) && sourceJob.secondarySkills.length > 0) {
          setSecondarySkills(sourceJob.secondarySkills);
        }
        if ((sourceJob as any).payRateMin != null) setPayRateMin((sourceJob as any).payRateMin);
        if ((sourceJob as any).payRateMax != null) setPayRateMax((sourceJob as any).payRateMax);
      }
    } catch (err) {
      console.error("Failed to load clone job data:", err);
    } finally {
      setIsCloningLoading(false);
    }
  }


    fetchProfile();
    fetchClients();
    checkAndLoadCloneData();
  }, [status, session, setValue, fetchClients]);

  const getSelectedDisplayText = () => {
    const selected = watch("workAuthorization") || "";
    const list = selected.split(", ").filter(Boolean);
    const currentOptions = INDIAN_WORK_AUTHORIZATION_OPTIONS;
    if (list.length === 0) return "Select Work Authorization...";
    if (list.length === 1) return list[0];
    if (list.length === currentOptions.length) return "All Selected";
    return `${list[0]} (+${list.length - 1} others)`;
  };

  // Autocomplete auto-save simulation
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty && activeWorkflow === "manual") {
        toast("Draft auto-saved successfully", {
          icon: undefined,
          duration: 2000,
        });
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [isDirty, activeWorkflow]);

  // Skill tags handlers

  useEffect(() => {
    if (!editJobId) return;
    setIsJobLoading(true);
    atsApi.jobs.get(editJobId).then(jobData => {
      if (!jobData) return;
      setValue("jobCode", jobData.jobCode || "");
      setValue("jobTitle", jobData.jobTitle || "");
      setValue("client", jobData.client || "");
      setValue("endClientName", jobData.endClientName || "");
      setValue("locationAutocomplete", jobData.location || "");
      
      const shiftTimingMatch = jobData.description?.match(/<p>\s*<strong>Shift Timing:<\/strong>\s*([^<]+)<\/p>/i)
        || jobData.description?.match(/Shift Timing:\s*([^\n<]+)/i);
      const extractedShiftTiming = jobData.shiftTiming || (shiftTimingMatch ? shiftTimingMatch[1].trim() : "General Shift");
      let cleanDescription = (jobData.description || "")
        .replace(/<p>\s*<strong>Shift Timing:<\/strong>[^<]*<\/p>/gi, "")
        .replace(/<p>\s*Shift Timing:[^<]*<\/p>/gi, "")
        .replace(/^Shift Timing:[^\n]*\n*/gim, "")
        .trim();

      setValue("jobType", jobData.type || "Full Time");
      setValue("jobDescription", cleanDescription);
      setValue("shiftTiming", extractedShiftTiming);
      setPrimarySkills(jobData.skillsRequired || []);
      setSecondarySkills(jobData.secondarySkills || []);
      setValue("businessUnit", jobData.businessUnit || "enfycon Inc");
      setValue("country", jobData.country || "India");
      setValue("states", jobData.state || "");
      setValue("city", jobData.city || "");
      setValue("jobStatus", jobData.jobStatus || "Active");
      setValue("workAuthorization", jobData.visaType || "");

      // if (jobData.jobTimezone) {
      //   // @ts-ignore
      //   setJobTiming(prev => ({ ...prev, jobTimezone: jobData.jobTimezone! }));
      // }

      // Parse Bill Rate
      const rawBillRate = jobData.clientBillRate || "";
      if (rawBillRate.includes("% Placement Commission")) {
        const matches = rawBillRate.match(/([\d.]+)\s*%\s*Placement/);
        const commVal = matches ? matches[1] : "8.33";
        const normalizedVal = commVal === "10.0" ? "10" : commVal === "15.0" ? "15" : commVal;
        if (["8.33", "10", "12.5", "15"].includes(normalizedVal)) {
          setCommissionType(normalizedVal);
        } else {
          setCommissionType("custom");
          setCustomCommission(commVal);
        }
        setValue("clientBillRate", "N/A");
      } else {
        setValue("clientBillRate", rawBillRate);
      }

      // Parse Pay Rate (CTC)
      const matchesPay = (jobData.payRate || "").match(/([\d.]+)/);
      setValue("payRate", matchesPay ? matchesPay[1] : (jobData.payRate || ""));

      setValue("numPositions", jobData.noOfPositions || 1);
      setValue("maxSubmissions", jobData.submissionRequired || 5);
      setValue("priority", (jobData.priority || "Warm") as any);
      setValue("taxTerms", jobData.taxTerms || "Permanent");
      
      const rLower = (jobData.remoteJob || "").toLowerCase();
      setValue("remoteJob", (rLower.includes("remote") || rLower === "yes") ? "Remote" : rLower.includes("hybrid") ? "Hybrid" : "In Office");
      
      setValue("startDate", jobData.startDate ? jobData.startDate.split("T")[0] : "");
      setValue("endDate", jobData.endDate ? jobData.endDate.split("T")[0] : "");
      setValue("hoursPerWeek", jobData.hoursPerWeek || 40);
      setValue("duration", jobData.duration || "");
      setValue("recruitmentManager", jobData.recruitmentManagerId || "");
      // @ts-ignore
      setValue("recruiter", jobData.recruiterId || "");
      // @ts-ignore
      setValue("assignedTo", jobData.assignedTo || "");
      setValue("accountManager", jobData.accountManagerId || "");
      setValue("industry", jobData.industry || "");
      setValue("degree", jobData.degree || "");
      setValue("expMin", jobData.expMin);
      setValue("expMax", jobData.expMax);
      setValue("noticePeriod", jobData.noticePeriod || "Select Notice Period");

      if (jobData.podId) {
        setSelectedPodId(`pod:${jobData.podId}`);
      // @ts-ignore
      } else if (jobData.recruiterId) {
        // @ts-ignore
        setSelectedPodId(`rec:${jobData.recruiterId}`);
      // @ts-ignore
      } else if (jobData.assignedTo === "ALL" || jobData.assignedTo === "All Branch Recruiters") {
        setSelectedPodId("all");
      // @ts-ignore
      } else if (jobData.assignedTo === "Unassigned") {
        setSelectedPodId("none");
      }

      if (jobData.respondBy) {
        setRespondByType("Date Option");
        setValue("respondBy", jobData.respondBy.split("T")[0]);
      } else {
        setRespondByType("Unlimited");
      }

    }).catch(err => { console.error("Error populating edit job data:", err); toast.error("Failed to load job details"); })
      .finally(() => setIsJobLoading(false));
  }, [editJobId, setValue]);


  
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
      const filesArray = Array.from(e.target.files).map((f: File) => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + " KB",
      }));
      setUploadedFiles((prev) => [...prev, ...filesArray]);
      toast.success("Document uploaded successfully");
    }
  };

  // Parser real extraction using Python/Gemini NLP pipeline
  const handleStartParsing = async () => {
    if (!parseText.trim()) {
      toast.error("Please paste or type a job description first.");
      return;
    }
    setIsParsing(true);
    try {
      const res = await atsApi.jobs.parseJd(parseText);
      if (res && res.success) {
        // Pre-fill extracted details
        const extractedTitle = res.jobTitle || res.title;
        if (extractedTitle && extractedTitle !== "Unknown") {
          setValue("jobTitle", extractedTitle, { shouldValidate: true, shouldDirty: true });
        }
        
        // Auto-assign work authorization if matched
        if (res.workAuthorization) {
          setValue("workAuthorization", res.workAuthorization);
        } else {
        }

        // Pre-fill location fields if returned (preserving active branch market)
        if (res.location) {
          if (true) {
            setValue("country", "India");
            if (res.location.state && !["Texas", "California", "New York", "Florida", "Illinois", "Washington", "Virginia", "New Jersey", "Georgia", "North Carolina"].includes(res.location.state)) {
              setValue("states", res.location.state);
            }
          } else {
            // @ts-ignore
            if (res.location.country) {
              // @ts-ignore
              setValue("country", res.location.country);
            }
            // @ts-ignore
            if (res.location.state) {
              // @ts-ignore
              setValue("states", res.location.state);
            }
          }
          if (res.location.city) {
            setValue("city", res.location.city);
          }
        }

        // Pre-fill experience ranges
        if (res.experienceMin !== undefined && res.experienceMin !== null) {
          setValue("expMin", Number(res.experienceMin));
        }
        if (res.experienceMax !== undefined && res.experienceMax !== null) {
          setValue("expMax", Number(res.experienceMax));
        }

        // Pre-fill pay rate / Candidate CTC
        const extractedPay = res.payRate || res.ctc || res.salary;
        if (extractedPay) {
          setValue("payRate", String(extractedPay), { shouldValidate: true, shouldDirty: true });
        }

        // Pre-fill notice period
        if (res.noticePeriod) {
          setValue("noticePeriod", res.noticePeriod);
        }

        // Pre-fill job type & remote mode
        if (res.jobType) {
          setValue("jobType", res.jobType);
        }
        if (res.remoteJob) {
          const rLower = (res.remoteJob || "").toLowerCase();
          if (rLower.includes("remote") || rLower === "yes") {
            setValue("remoteJob", "Remote");
          } else if (rLower.includes("hybrid")) {
            setValue("remoteJob", "Hybrid");
          } else {
            setValue("remoteJob", "In Office");
          }
        }
        
        // Pre-fill primary/secondary skills
        setPrimarySkills(res.primarySkills || []);
        setSecondarySkills(res.secondarySkills || []);

        // Pre-fill description
        // Format description in HTML
        let formattedDesc = `<h3>${res.jobTitle || 'Job Requirement'}</h3>`;
        if (parseText.includes("\n")) {
          formattedDesc += parseText.split("\n").map(para => `<p>${para.trim()}</p>`).filter(p => p !== "<p></p>").join("");
        } else {
          formattedDesc += `<p>${parseText}</p>`;
        }
        setValue("jobDescription", formattedDesc);

        setActiveWorkflow("manual");
        toast.success("AI extraction completed! Review pre-filled form fields below.");
      } else {
        toast.error("Failed to parse Job Description.");
      }
    } catch (err: any) {
      toast.error("AI parsing failed: " + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const [isExtractingSkills, setIsExtractingSkills] = useState(false);

  const handleExtractSkillsFromDescription = async () => {
    console.log("[AI EXTRACT] Extraction button clicked.");
    const jdHtml = getValues("jobDescription") || "";
    const strippedText = jdHtml.replace(/<[^>]*>/g, " ").trim();
    console.log("[AI EXTRACT] Cleaned JD text length:", strippedText.length);
    if (!strippedText) {
      toast.error("Please enter a job description in the editor below first.");
      return;
    }
    
    setIsExtractingSkills(true);
    try {
      const res = await atsApi.jobs.parseJd(strippedText);
      if (res && res.success) {
        // Pre-fill job title if extracted
        const extractedTitle = res.jobTitle || res.title;
        if (extractedTitle && extractedTitle !== "Unknown") {
          const currentTitle = getValues("jobTitle");
          if (!currentTitle || currentTitle.trim() === "" || currentTitle.includes("Auto-generated")) {
            setValue("jobTitle", extractedTitle, { shouldValidate: true, shouldDirty: true });
          }
        }

        // Merge extracted skills with existing manually entered ones
        const pSkills = res.primarySkills || [];
        const sSkills = res.secondarySkills || [];
        const mergedPrimary = Array.from(new Set([...primarySkills, ...pSkills]));
        const mergedSecondary = Array.from(new Set([...secondarySkills, ...sSkills]));
        
        setPrimarySkills(mergedPrimary);
        setSecondarySkills(mergedSecondary);

        // Pre-fill experience ranges if extracted and not already manually set
        const currentMin = getValues("expMin");
        const currentMax = getValues("expMax");

        if ((currentMin === undefined || currentMin === null || isNaN(currentMin)) && res.experienceMin !== undefined && res.experienceMin !== null) {
          setValue("expMin", Number(res.experienceMin));
        }
        if ((currentMax === undefined || currentMax === null || isNaN(currentMax)) && res.experienceMax !== undefined && res.experienceMax !== null) {
          setValue("expMax", Number(res.experienceMax));
        }

        // Pre-fill CTC / Pay Rate & Budget Range (Min / Max)
        const resAny = res as any;
        const extractedPay = resAny.payRate || resAny.ctc || resAny.salary;
        let minRate = resAny.payRateMin || resAny.budgetMin || resAny.ctcMin || "";
        let maxRate = resAny.payRateMax || resAny.budgetMax || resAny.ctcMax || "";

        if (!minRate && !maxRate && extractedPay) {
          const match = String(extractedPay).match(/([\d\.]+)\s*[\–\—\-to\s]+\s*([\d\.]+)/);
          if (match) {
            minRate = match[1];
            maxRate = match[2];
          } else {
            const singleMatch = String(extractedPay).match(/([\d\.]+)/);
            if (singleMatch) {
              maxRate = singleMatch[1];
            }
          }
        }

        if (minRate) setPayRateMin(String(minRate));
        if (maxRate) setPayRateMax(String(maxRate));

        const combinedPay = minRate || maxRate ? `${minRate || "0"}-${maxRate || minRate}` : String(extractedPay || "");
        if (combinedPay) {
          setValue("payRate", combinedPay, { shouldValidate: false, shouldDirty: true });
        }

        if (pSkills.length > 0 || sSkills.length > 0 || res.experienceMin !== undefined || extractedTitle) {
          toast.success(`AI extracted Job Title (${extractedTitle || 'Role'}), Skills & Experience (${res.experienceMin ?? 0}-${res.experienceMax ?? 5} yrs)!`);
        } else {
          toast("No skills found in description.", { icon: undefined });
        }
      } else {
        toast.error("Failed to parse Job Description.");
      }
    } catch (err: any) {
      toast.error("AI parsing failed: " + err.message);
    } finally {
      setIsExtractingSkills(false);
    }
  };
  const onSubmit = async (data: FormValues) => {
    if (assignmentRequired && !assignmentValid) {
      toast.error("Select a pod or at least one recruiter. Your active role must have assignment permission.");
      return;
    }

    const formatRatePayload = (val: string, cur: string, unit: string, term: string) => {
      if (!val || val === "N/A" || val === "Rate") return "N/A";
      const cleanVal = val.replace(/[^0-9.]/g, "");
      if (!cleanVal) return "N/A";
      if (cur === "INR") {
        const suffix = ["Contract", "C2H", "Freelance"].includes(data.jobType) ? "/mo" : "LPA";
        return `INR - ${cleanVal} ${suffix}`;
      } else {
        const unitLabel = unit === "Hourly" ? "hr" : unit === "Yearly" ? "yr" : "hr";
        return `USD - $${cleanVal}/${unitLabel}`;
      }
    };

    let assembledBillRate = "";
    if (true && data.taxTerms === "Permanent") {
      const commValue = commissionType === "custom" ? customCommission : commissionType;
      assembledBillRate = `${commValue}% Placement Commission`;
    } else {
      assembledBillRate = formatRatePayload(data.clientBillRate, billCurrency, billUnit, billTerm);
    }

    let assembledPayRate = "";
    if (true) {
      const minVal = payRateMin || data.payRate || "";
      const maxVal = payRateMax || minVal;
      const suffix = ["Contract", "C2H", "Freelance"].includes(data.jobType) ? "/mo" : "LPA";
      assembledPayRate = minVal && maxVal && minVal !== maxVal 
        ? `INR - ${minVal} to ${maxVal} ${suffix}` 
        : minVal 
          ? `INR - ${minVal} ${suffix}` 
          : "N/A";
    } else {
      assembledPayRate = formatRatePayload(data.payRate, payCurrency, payUnit, payTerm);
    }

    const locSummary = [data.city, data.states, data.country].filter(Boolean).join(", ") || data.locationAutocomplete || "Remote";

    // Show posting popup window immediately with short details
    setPublishingModalState({
      isOpen: true,
      status: "publishing",
      jobTitle: data.jobTitle,
      jobCode: data.jobCode,
      client: data.client || data.endClientName || "Direct Client",
      location: locSummary,
      jobType: data.jobType || "Full Time",
      positions: data.numPositions || 1,
      payRate: assembledPayRate,
      businessUnit: data.businessUnit || (typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') || 'Main Office' : 'Main Office'),
    });

    try {
      let finalDescription = data.jobDescription;

      let resolvedPodId: string | undefined = "none";
      let resolvedApproverId: string | undefined = selectedApproverId || undefined;
      let resolvedApproverRole: string = selectedApproverRole || "POD_LEAD";
      let resolvedPrimaryRecruiterId: string | undefined = undefined;
      // @ts-ignore
      let resolvedAssignedTo: string | undefined = data.assignedTo || undefined;

      let resolvedRecruiterIds: string[] = [];

      if (assignmentValid && assignmentType === "pod" && selectedPodId) {
        resolvedPodId = selectedPodId;
        resolvedApproverRole = "POD_LEAD";
        const pod = podsList.find((p) => p.id === resolvedPodId);
        if (pod?.podHeadId) resolvedApproverId = pod.podHeadId;
        resolvedAssignedTo = pod?.name || "Recruitment Pod";
      } else if (assignmentValid && assignmentType === "recruiters" && selectedRecruiterIds.length > 0) {
        resolvedRecruiterIds = selectedRecruiterIds;
        resolvedPrimaryRecruiterId = selectedRecruiterIds[0];
        resolvedApproverRole = "PRIMARY_RECRUITER";
        const rec = branchUsers.find((u) => u.id === resolvedPrimaryRecruiterId);
        resolvedAssignedTo = selectedRecruiterIds.length === 1 ? (rec?.fullName || "Primary Recruiter") : `${selectedRecruiterIds.length} Recruiters`;
      } else if (assignmentType === "unassigned") {
        resolvedAssignedTo = "Unassigned";
        resolvedApproverRole = "BRANCH_ADMIN";
      } else if (selectedPodId === "none") {
        resolvedAssignedTo = "Unassigned";
        resolvedApproverRole = "BRANCH_ADMIN";
      }

      // Determine initial approval status based on creator's permissions
      const hasDirectPublish = currentUserProfile?.permissions?.includes("job:publish_direct") || 
        currentUserProfile?.roles?.some((r: string) => ["TENANT_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(r.toUpperCase().replace(/[\s-_]+/g, "")));
      const hasDesignatedReviewer = Boolean(currentUserProfile?.jobReviewerId || currentUserProfile?.jobReviewerName || currentUserProfile?.job_reviewer_id);

      const shouldRequireApproval = !hasDirectPublish;
      const initialApprovalStatus = shouldRequireApproval ? "PENDING_APPROVAL" : "APPROVED";
      const initialJobStatus = shouldRequireApproval ? "Pending Approval" : (data.jobStatus || "Active");
      const finalApproverId = hasDesignatedReviewer ? (currentUserProfile?.jobReviewerId || currentUserProfile?.job_reviewer_id || resolvedApproverId) : resolvedApproverId;
      const finalApproverRole = hasDesignatedReviewer ? "DESIGNATED_REVIEWER" : resolvedApproverRole;

      // Map frontend form fields → backend CreateJobDto
      const payload = {
        jobCode: data.jobCode,
        branchId: selectedUnitObj?.branchId || (typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') || undefined : undefined),
        businessUnitId: selectedUnitId || undefined,
        title: data.jobTitle,
        client: data.client || data.endClientName || "Direct Client",
        endClientName: data.endClientName || undefined,
        pocId: selectedPocId || undefined,
        endClientPocId: selectedEndPocId || undefined,
        location: data.locationAutocomplete || data.city || data.states || "Remote",
        type: data.jobType || "Full Time",
        description: finalDescription,
        skillsRequired: primarySkills,
        secondarySkills: secondarySkills,
        businessUnit: data.businessUnit,
        state: data.states,
        city: data.city || undefined,
        country: data.country,
        status: initialJobStatus,
          market: selectedUnitObj?.market,
        approvalStatus: initialApprovalStatus,
        assignedApproverId: finalApproverId,
        
        visaType: data.workAuthorization,
        clientBillRate: assembledBillRate,
        payRate: assembledPayRate,
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
        recruiterId: canAssignRecruiters ? resolvedPrimaryRecruiterId : undefined,
        recruiterIds: canAssignRecruiters ? resolvedRecruiterIds : undefined,
        
        accountManagerId: data.accountManager || undefined,
        industry: data.industry || undefined,
        degree: data.degree || undefined,
        expMin: data.expMin,
        expMax: data.expMax,
        respondBy: respondByType === "Date Option" ? (data.respondBy || undefined) : undefined,
        noticePeriod: data.noticePeriod || undefined,
        podId: canAssignPods ? resolvedPodId : undefined,
        
        shiftTiming: data.shiftTiming || undefined,
      };

      
      let created;
      if (editJobId) {
        created = await atsApi.jobs.update(editJobId, payload);
      } else {
        created = await atsApi.jobs.create(payload);
      }
  

      setPublishingModalState(prev => prev ? {
        ...prev,
        status: "success",
        jobCode: created.jobCode || prev.jobCode,
        createdJobId: created.id,
      } : null);

      toast.success(`Job requirement published successfully! Code: ${created.jobCode}`);
    } catch (err: any) {
      console.error("[NewJob] API error:", err);
      setPublishingModalState(prev => prev ? {
        ...prev,
        status: "error",
        errorMessage: err.message || "Backend connection failed. Please check required fields and try again.",
      } : null);
      if (err.message && (err.message.includes('expired') || err.message.includes('Unauthorized') || err.message.includes('Session has expired'))) {
        return;
      }
      showErrorModal(err.message || "Backend connection failed.", "Job Posting Error");
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
        className={cn(
          "flex items-center justify-between bg-blue-50/80 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 px-4 py-2.5 cursor-pointer select-none border-b border-blue-100 dark:border-blue-900/40 first:rounded-t-lg font-sans transition-colors group",
          isCollapsed && "rounded-b-lg border-b-0"
        )}
      >
        <span className="text-[11px] font-bold text-blue-950 dark:text-blue-100 uppercase tracking-wider">
          {title}
        </span>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform group-hover:translate-y-0.5" />
        ) : (
          <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform group-hover:-translate-y-0.5" />
        )}
      </div>
    );
  };

  if (isCloningLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[65vh] py-16 px-4 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-3 border-blue-600/20 border-t-blue-600 animate-spin" />
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Duplicating Job Requirement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading source details and pre-filling the form...
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const renderWorkAuthBlock = (colSpanClass = "") => (
    <div className={cn("space-y-1 relative", colSpanClass)} ref={workAuthDropdownRef}>
      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Work Authorization <span className="text-red-500">*</span></Label>
      
      {/* Trigger Input (styled like standard select field) */}
      <div
        onClick={() => setIsWorkAuthOpen(!isWorkAuthOpen)}
        className={cn(
          "w-full bg-white dark:bg-slate-955 border rounded px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 flex items-center justify-between cursor-pointer select-none transition-colors min-h-[32px] h-8",
          isWorkAuthOpen
            ? "border-primary ring-1 ring-primary/20"
            : "border-neutral-300 dark:border-slate-700 hover:border-neutral-400 dark:hover:border-slate-600"
        )}
      >
        <div className="flex flex-wrap gap-1 items-center max-w-[88%] py-0.5 overflow-hidden">
          {(() => {
            const selected = watch("workAuthorization") || "";
            const list = selected.split(", ").filter(Boolean);
            if (list.length === 0) {
              return <span className="text-neutral-400 dark:text-slate-500 font-medium truncate">Select Work Authorization...</span>;
            }
            if (list.length === currentWorkAuthOptions.length) {
              return (
                <span className="font-bold text-primary dark:text-blue-400 bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded text-[10px]">
                  All Selected
                </span>
              );
            }
            
            const limit = 2;
            const visibleItems = list.slice(0, limit);
            const hiddenCount = list.length - limit;
            
            return (
              <>
                {visibleItems.map((opt) => (
                  <span
                    key={opt}
                    className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shrink-0"
                  >
                    <span className="truncate max-w-[90px]">{opt}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newList = list.filter((item) => item !== opt).join(", ");
                        setValue("workAuthorization", newList, { shouldDirty: true });
                      }}
                      className="text-blue-400 hover:text-red-500 dark:hover:text-red-400 font-bold ml-0.5 rounded-full p-0.5 hover:bg-blue-200/50 cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <span className="bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-400 border border-primary/20 text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0">
                    +{hiddenCount} more
                  </span>
                )}
              </>
            );
          })()}
        </div>
        
        <div className="flex items-center gap-1 text-neutral-400 dark:text-slate-500 shrink-0">
          {((watch("workAuthorization") || "").split(", ").filter(Boolean).length > 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setValue("workAuthorization", "", { shouldDirty: true });
              }}
              className="p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors cursor-pointer"
              title="Clear all selections"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Dropdown Overlay Container */}
      {isWorkAuthOpen && (
        <div className="absolute left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-800 rounded-md shadow-xl p-2.5 space-y-2 min-w-[240px]">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search Auth..."
              value={workAuthSearch}
              onChange={(e) => setWorkAuthSearch(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-slate-955 border border-neutral-200 dark:border-slate-800 rounded pl-7 pr-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-855 dark:text-neutral-200"
              autoFocus
            />
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
          </div>
          
          <div className="w-full max-h-60 overflow-y-auto space-y-1.5 text-xs select-none pr-1 scrollbar-thin">
            {/* Select All Checkbox */}
            {workAuthSearch === "" && (
              <label className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800/60 rounded-md cursor-pointer font-bold text-neutral-700 dark:text-neutral-300 transition-colors">
                <input
                  type="checkbox"
                  checked={
                    (watch("workAuthorization") || "").split(", ").filter(Boolean).length === currentWorkAuthOptions.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue("workAuthorization", currentWorkAuthOptions.join(", "), { shouldDirty: true });
                    } else {
                      setValue("workAuthorization", "", { shouldDirty: true });
                    }
                  }}
                  className="sr-only"
                />
                <div className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0",
                  (watch("workAuthorization") || "").split(", ").filter(Boolean).length === currentWorkAuthOptions.length
                    ? "bg-primary border-primary text-white"
                    : "border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-955"
                )}>
                  {((watch("workAuthorization") || "").split(", ").filter(Boolean).length === currentWorkAuthOptions.length) && (
                    <Check className="h-3 w-3 stroke-[3]" />
                  )}
                </div>
                <span>[Select all]</span>
              </label>
            )}
            
            {/* Option Checkboxes */}
            {currentWorkAuthOptions.filter((opt) =>
              opt.toLowerCase().includes(workAuthSearch.toLowerCase())
            ).map((opt) => {
              const selectedList = (watch("workAuthorization") || "").split(", ").filter(Boolean);
              const isSelected = selectedList.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800/60 rounded-md cursor-pointer font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      let newList;
                      if (e.target.checked) {
                        newList = (current: string) => {
                          const currentList = current ? current.split(", ").filter(Boolean) : [];
                          return [...currentList.filter((x) => x !== opt), opt].join(", ");
                        };
                      } else {
                        newList = (current: string) => {
                          const currentList = current ? current.split(", ").filter(Boolean) : [];
                          return currentList.filter((item) => item !== opt).join(", ");
                        };
                      }
                      const currentVal = watch("workAuthorization") || "";
                      setValue("workAuthorization", newList(currentVal), { shouldDirty: true });
                    }}
                    className="sr-only"
                  />
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0",
                    isSelected
                      ? "bg-primary border-primary text-white"
                      : "border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-955"
                  )}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className={cn(
                    "truncate transition-colors text-xs",
                    isSelected ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-700 dark:text-neutral-300"
                  )}>
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {errors.workAuthorization && (
        <p className="text-[10px] text-red-655 font-bold">{errors.workAuthorization.message}</p>
      )}
    </div>
  );

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
                toast("Coming Soon!", { icon: undefined });
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
                toast("Coming Soon!", { icon: undefined });
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
                  {true ? `${tenantName} India Staffing Workspace` : `${tenantName} US IT Recruitment Workspace`}
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
              {(() => {
                const hasDirectPublish = currentUserProfile?.permissions?.includes("job:publish_direct") || 
                  currentUserProfile?.roles?.some((r: string) => ["TENANT_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(r.toUpperCase().replace(/[\s-_]+/g, "")));
                const requiresApproval = !hasDirectPublish;

                return (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={publishingModalState?.status === "publishing"}
                    className="h-8.5 px-4 font-bold text-white shadow-xs cursor-pointer text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/90 active:bg-primary/80 hover:shadow-md transition-all duration-200 group transform active:scale-95"
                  >
                    {publishingModalState?.status === "publishing" ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        <span>Publishing Job...</span>
                      </>
                    ) : requiresApproval ? (
                      <>
                        <Shield className="h-3.5 w-3.5 text-amber-300 transition-transform group-hover:scale-110" />
                        <span>Submit for Approval</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        <span>Publish Job Requirement</span>
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>

          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto pb-12">
            <div className="w-full p-4 space-y-4">
              {/* Requisition Completeness Alert Banner with Recruitment Jargon */}
              {isSubmitted && Object.keys(errors).length > 0 && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-600 border border-red-200 dark:border-red-900/50 rounded-r-lg text-red-900 dark:text-red-300 shadow-xs space-y-2 font-sans">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                      <span>Requisition Incomplete — Please complete the {Object.keys(errors).length} mandatory field{Object.keys(errors).length > 1 ? "s" : ""} below before submitting:</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5 pl-6">
                    {Object.entries(errors).map(([key, err]) => {
                      const jargonLabels: Record<string, string> = {
                        client: "Client Account / End Client",
                        clientBillRate: "Client Bill Rate / Commission",
                        payRate: "Candidate Target CTC / Pay Rate",
                        jobTitle: "Requisition Designation (Job Title)",
                        jobCode: "Requisition Job Code",
                        jobType: "Employment Engagement Type",
                        remoteJob: "Work Mode",
                        taxTerms: "Billing & Tax Classification",
                        workAuthorization: "Work Authorization & Visa Eligibility",
                        numPositions: "Target Headcount Requisition",
                        maxSubmissions: "SLA Submission Cap",
                        jobDescription: "Job Specification Scope",
                        businessUnit: "Business Unit Requisition",
                        country: "Geographic Location (Country)",
                        states: "Geographic Location (State)",
                        city: "Geographic Location (City)",
                      };
                      const label = jargonLabels[key] || key;
                      const msg = (err?.message as string) || "Required";
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 bg-red-100/90 dark:bg-red-900/50 text-red-900 dark:text-red-200 text-[11px] font-bold px-2.5 py-1 rounded border border-red-300 dark:border-red-800 shadow-2xs"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0 animate-pulse" />
                          <span>{label}:</span>
                          <span className="font-semibold text-red-700 dark:text-red-300">{msg}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------- BUSINESS INFORMATION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="Business Information" sectionKey="businessInfo" />
                {!collapsedSections.businessInfo && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">

                    {/* Branch Unit / Division */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                        <span>Business Unit <span className="text-red-500">*</span></span>
                        
                      </Label>
                      {availableUnits.length === 1 ? (
                        <div className="w-full h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border border-neutral-300 dark:border-slate-700 rounded px-2 font-semibold text-neutral-800 dark:text-neutral-200 flex items-center select-none opacity-80 cursor-not-allowed">
                          {availableUnits[0].name}
                        </div>
                      ) : availableUnits.length > 0 ? (
                        <select
                          value={selectedUnitId}
                          onChange={(e) => handleUnitChange(e.target.value)}
                          className="w-full h-8 text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded px-2 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-primary transition-colors cursor-pointer"
                        >
                          <option value="">-- Select Business Unit --</option>
                          {availableBranches.length > 0 ? (
                            availableBranches.map((b) => {
                              const unitsInBranch = availableUnits.filter((u) => u.branchId === b.id);
                              if (unitsInBranch.length === 0) return null;
                              return (
                                <optgroup key={b.id} label={`${b.name} (${b.city ? b.city + ', ' : ''}${b.country || ''})`}>
                                  {unitsInBranch.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name} — {u.shiftTiming || 'General Shift'} ({u.currency || 'INR'})
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })
                          ) : (
                            availableUnits.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} — {u.shiftTiming || 'General Shift'}
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        <Input
                          type="text"
                          readOnly
                          {...register("businessUnit")}
                          className="h-8 text-xs bg-neutral-100 dark:bg-slate-800 border-neutral-300 dark:border-slate-700 font-semibold cursor-not-allowed"
                        />
                      )}
                      {errors.businessUnit && (
                        <p className="text-[10px] text-red-650 font-bold">{errors.businessUnit.message}</p>
                      )}
                    </div>

                    {/* Job Code */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Code <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        readOnly
                        {...register("jobCode")}
                        className="h-8 text-xs bg-neutral-100 dark:bg-slate-800 border-neutral-300 dark:border-slate-700 font-semibold cursor-not-allowed"
                      />
                      {errors.jobCode && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.jobCode.message}</p>
                      )}
                    </div>


                    {/* Job Title */}
                    <div className="space-y-1 md:col-span-2">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Title <span className="text-red-500">*</span></Label>
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

                    {/* Row 2, Col 1: Job Type (with End Date subfield if not Full Time) */}
                    <div className="space-y-1">
                      {watch("jobType") !== "Full Time" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Type <span className="text-red-500">*</span></Label>
                            <select
                              {...register("jobType", {
                                onChange: (e) => {
                                  const val = e.target.value;
                                  if (val === "Full Time") {
                                    setValue("taxTerms", "Permanent");
                                    setBillUnit("LPA");
                                    setPayUnit("LPA");
                                  } else if (val === "Contract") {
                                    setValue("taxTerms", true ? "Contract (3rd Party)" : "C2C");
                                    setBillUnit("Monthly");
                                    setPayUnit("Monthly");
                                  }
                                }
                              })}
                              className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                            >
                              <option value="Full Time">Full Time</option>
                              <option value="Part Time">Part Time</option>
                              <option value="Contract">Contract</option>
                              <option value="C2H">C2H</option>
                              <option value="Intern">Intern</option>
                              <option value="Seasonal">Seasonal</option>
                              <option value="Freelance">Freelance</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="font-bold text-neutral-700 dark:text-neutral-300">End Date</Label>
                            <input
                              type="date"
                              {...register("endDate")}
                              className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2 py-1 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Type <span className="text-red-500">*</span></Label>
                          <select
                            {...register("jobType", {
                              onChange: (e) => {
                                const val = e.target.value;
                                if (val === "Full Time") {
                                  setValue("taxTerms", "Permanent");
                                    setBillUnit("LPA");
                                    setPayUnit("LPA");
                                } else if (val === "Contract") {
                                  setValue("taxTerms", true ? "Contract (3rd Party)" : "C2C");
                                    setBillUnit("Monthly");
                                    setPayUnit("Monthly");
                                }
                              }
                            })}
                            className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                          >
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                            <option value="Contract">Contract</option>
                            <option value="C2H">C2H</option>
                            <option value="Intern">Intern</option>
                            <option value="Seasonal">Seasonal</option>
                            <option value="Freelance">Freelance</option>
                          </select>
                        </>
                      )}
                      {errors.jobType && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.jobType.message}</p>
                      )}
                    </div>

                    {/* Row 2, Col 2: Work Mode */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">
                        Work Mode <span className="text-red-500">*</span>
                      </Label>
                      <select
                        {...register("remoteJob")}
                        className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                      >
                        <option value="In Office">In Office</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                      {errors.remoteJob && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.remoteJob.message}</p>
                      )}
                    </div>

                    {/* Row 2, Col 3: Shift Timings (India) or Job Start Date (US) */}
                    <div className="space-y-1">
                      {true ? (
                        <>
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">Shift Timings</Label>
                          <select
                            {...register("shiftTiming")}
                            className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                          >
                            <option value="General Shift">General Shift (Day)</option>
                            <option value="Night Shift">Night Shift</option>
                            <option value="Rotational Shift">Rotational Shift</option>
                            <option value="UK/EMEA Shift">UK/EMEA Shift</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Start Date</Label>
                          <input
                            type="date"
                            {...register("startDate")}
                            className="w-full h-8 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                          />
                        </>
                      )}
                    </div>

                    {/* Row 2, Col 4: Notice Period (India) or Required Hours/Week (US) */}
                    <div className="space-y-1">
                      {true ? (
                        <>
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">Notice Period</Label>
                          <select
                            {...register("noticePeriod")}
                            className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                          >
                            <option value="">Select Notice Period</option>
                            <option value="Immediate">Immediate</option>
                            <option value="15 Days">15 Days</option>
                            <option value="30 Days">30 Days</option>
                            <option value="45 Days">45 Days</option>
                            <option value="60 Days">60 Days</option>
                            <option value="90 Days">90 Days</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">Required Hours/Week</Label>
                          <input
                            type="number"
                            {...register("hoursPerWeek", { valueAsNumber: true })}
                            className="w-full h-8 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 font-semibold"
                            placeholder="e.g. 40"
                          />
                        </>
                      )}
                    </div>

                    {/* Row 4, Col 4: Priority */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Priority <span className="text-red-500">*</span></Label>
                      <select
                        {...register("priority")}
                        className="w-full h-8 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 cursor-pointer font-semibold"
                      >
                        <option value="Hot">Hot</option>
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                      </select>
                      {errors.priority && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.priority.message}</p>
                      )}
                    </div>
                    {renderWorkAuthBlock()}
                    {/* Pay Rate / Budget Min & Max (Row 3, Right Span 2 -> Same Row as Client Bill Rate!) */}
                    <div className="space-y-1 md:col-span-2">
                      {true ? (
                        <>
                          <div className="flex items-center gap-1">
                            <label className="font-bold text-neutral-700 dark:text-neutral-300">
                              {["Contract", "C2H", "Freelance"].includes(watch("jobType"))
                                ? <span>Budget Range <span className="text-green-600">(Per Month ₹)</span> <span className="text-red-500">*</span></span>
                                : <span>Budget Range <span className="text-blue-600">(LPA)</span> <span className="text-red-500">*</span></span>
                              }
                            </label>
                            <span
                              className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help"
                              title={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "Target Budget in Per Month (Min - Max)" : "Target Budget CTC Range in Lakhs Per Annum (Min - Max)"}
                            >
                              ?
                            </span>
                          </div>
                          <div className="flex gap-2.5 items-center w-full">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">Min</span>
                              <input
                                type="text"
                                value={payRateMin}
                                onChange={(e) => {
                                  setPayRateMin(e.target.value);
                                  setValue("payRate", e.target.value, { shouldValidate: true });
                                }}
                                placeholder={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "e.g. 50000" : "e.g. 10.0"}
                                className="w-full h-8 pl-10 pr-10 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">{["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "/mo" : "LPA"}</span>
                            </div>
                            <span className="text-xs font-bold text-neutral-400 shrink-0">to</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">Max</span>
                              <input
                                type="text"
                                value={payRateMax}
                                onChange={(e) => setPayRateMax(e.target.value)}
                                placeholder={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "e.g. 80000" : "e.g. 15.0"}
                                className="w-full h-8 pl-10 pr-10 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">{["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "/mo" : "LPA"}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <label className="font-bold text-neutral-700 dark:text-neutral-300">Pay Rate / Salary <span className="text-red-500">*</span></label>
                            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Pay rate information">?</span>
                          </div>
                          <div className="flex gap-1.5 items-center w-full">
                            <select
                              value={payCurrency}
                              onChange={(e) => setPayCurrency(e.target.value)}
                              className="w-16 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              <option value="USD">USD</option>
                              <option value="CAD">CAD</option>
                              <option value="GBP">GBP</option>
                            </select>
                            <input
                              type="text"
                              {...register("payRate")}
                              className="h-8 flex-1 min-w-[70px] bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                              placeholder="Pay Rate"
                            />
                            <select
                              value={payUnit}
                              onChange={(e) => setPayUnit(e.target.value)}
                              className="w-24 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              <option value="Hourly">Hourly</option>
                              <option value="Daily">Daily</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Bi-Weekly">Bi-Weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Yearly">Yearly</option>
                                  <option value="LPA">LPA</option>
                            </select>
                            <select
                              value={payTerm}
                              onChange={(e) => setPayTerm(e.target.value)}
                              className="w-36 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              <option value="W-2">W-2</option>
                              <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                              <option value="C2C">C2C</option>
                              <option value="1099">1099</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </>
                      )}
                      {errors.payRate && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.payRate.message}</p>
                      )}
                    </div>

                                      </div>
                )}
              </div>

              {/* -------------------- CLIENT INFORMATION SECTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="CLIENT INFORMATION" sectionKey={"clientInfo" as any} />
                {!(collapsedSections as any).clientInfo && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    {/* Client */}
                    <div className="space-y-1 flex flex-col">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Client <span className="text-red-500">*</span></label>
                      <Popover open={clientDropdownOpen} onOpenChange={(open) => {
                        setClientDropdownOpen(open);
                        if (!open) {
                          setClientSearchText("");
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            role="combobox"
                            aria-expanded={clientDropdownOpen}
                            className="w-full justify-between h-8 text-xs font-normal bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-900 dark:text-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100"
                          >
                            <span className={cn("truncate", watch("client") ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-400 dark:text-slate-400 font-medium")}>
                              {watch("client") ? watch("client") : "Search for a Client..."}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search for a Client..."
                              className="h-9 text-xs"
                              value={clientSearchText}
                              onValueChange={setClientSearchText}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const query = clientSearchText.trim();
                                  if (query) {
                                    const exactMatch = clientList.find((cl: any) => {
                                      const cName = (cl.client_name || cl.clientName || cl.name || "").toLowerCase();
                                      return cName === query.toLowerCase();
                                    });
                                    if (exactMatch) {
                                      const clientNameStr = exactMatch.client_name || exactMatch.clientName || exactMatch.name || "";
                                      setValue("client", clientNameStr, { shouldValidate: true });
                                      setClientDropdownOpen(false);
                                      setClientSearchText("");
                                    } else {
                                      setClientModalTarget("client");
                                      setPrefilledClientName(query);
                                      setClientDropdownOpen(false);
                                      setAddClientModalOpen(true);
                                    }
                                    e.preventDefault();
                                  }
                                }
                              }}
                            />
                            <CommandList className="max-h-[240px] overflow-y-auto">
                              {(() => {
                                const query = clientSearchText.trim().toLowerCase();
                                const filtered = clientList.filter((cl: any) => {
                                  const cName = (cl.client_name || cl.clientName || cl.name || "").toLowerCase();
                                  return !query || cName.includes(query);
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div className="py-4 px-3 text-center text-xs text-neutral-500">
                                      {query ? (
                                        <div className="space-y-2">
                                          <p>No client matching "{clientSearchText.trim()}"</p>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setClientModalTarget("client");
                                              setPrefilledClientName(clientSearchText.trim());
                                              setClientDropdownOpen(false);
                                              setAddClientModalOpen(true);
                                            }}
                                            className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-primary/90 transition-colors cursor-pointer"
                                          >
                                            Use "{clientSearchText.trim()}" as Client
                                          </button>
                                        </div>
                                      ) : (
                                        "No clients available in database."
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <CommandGroup heading="Existing Clients">
                                    {filtered.map((cl: any) => {
                                      const clientNameStr = cl.client_name || cl.clientName || cl.name || "";
                                      return (
                                        <CommandItem
                                          key={cl.id || clientNameStr}
                                          value={clientNameStr}
                                          onSelect={() => {
                                            setValue("client", clientNameStr, { shouldValidate: true });
                                            setClientDropdownOpen(false);
                                            setClientSearchText("");
                                            // Auto-fill commission & load POCs
                                            const found = clientList.find((c: any) => (c.client_name || c.clientName || c.name || '') === clientNameStr);
                                            if (found) {
                                              setSelectedClientId(found.id);
                                              if (found.commissionPercentage || found.commission_percentage) {
                                                const pct = found.commissionPercentage || found.commission_percentage;
                                                setCommissionType(String(pct));
                                              }
                                              // Load POCs for this client
                                              atsApi.clients?.getContacts
                                                ? atsApi.clients.getContacts(found.id).then((data: any) => setPocList(data)).catch(() => {})
                                                : fetch(`/api/ats/clients/${found.id}/contacts`, { credentials: 'include' })
                                                    .then(r => r.json()).then(data => setPocList(data)).catch(() => {});
                                            }
                                          }}
                                          className="text-xs cursor-pointer"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              watch("client") === clientNameStr ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {clientNameStr}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                );
                              })()}
                            </CommandList>
                            <div className="p-2 border-t flex items-center justify-between gap-2">
                              {clientSearchText.trim() !== "" && (
                                <button
                                  type="button"
                                  className="text-primary font-bold text-xs hover:underline bg-transparent border-0 cursor-pointer"
                                  onClick={() => {
                                    const query = clientSearchText.trim();
                                    const exactMatch = clientList.find((cl: any) => {
                                      const cName = (cl.client_name || cl.clientName || cl.name || "").toLowerCase();
                                      return cName === query.toLowerCase();
                                    });
                                    if (exactMatch) {
                                      const clientNameStr = exactMatch.client_name || exactMatch.clientName || exactMatch.name || "";
                                      setValue("client", clientNameStr, { shouldValidate: true });
                                      setClientDropdownOpen(false);
                                      setClientSearchText("");
                                    } else {
                                      setClientModalTarget("client");
                                      setPrefilledClientName(query);
                                      setClientDropdownOpen(false);
                                      setAddClientModalOpen(true);
                                    }
                                  }}
                                >
                                  ✔ Select "{clientSearchText.trim()}"
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-blue-600 dark:text-blue-400 font-bold flex items-center hover:underline bg-transparent border-0 cursor-pointer text-xs ml-auto"
                                onClick={() => {
                                  setClientModalTarget("client");
                                  setPrefilledClientName(clientSearchText.trim());
                                  setClientDropdownOpen(false);
                                  setAddClientModalOpen(true);
                                }}
                              >
                                + Add Client
                              </button>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {errors.client && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.client.message}</p>
                      )}
                    </div>

                    {true ? (
                      <>
                        {/* Row 3, Col 1: Client Commission (%) (India Permanent) or Client Bill Rate (India Contract) */}
                        <div className="space-y-1">
                          {watch("taxTerms") === "Permanent" ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Commission (%) <span className="text-red-500">*</span></Label>
                                <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Permanent placement agency commission percentage">?</span>
                              </div>
                              <div className="flex gap-2 items-center w-full">
                                <select
                                  value={commissionType}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCommissionType(val);
                                    const commVal = val === "custom" ? customCommission : val;
                                    if (commVal) {
                                      setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: true });
                                    }
                                  }}
                                  className={cn(
                                    "h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold",
                                    commissionType === "custom" ? "w-2/3" : "w-full"
                                  )}
                                >
                                  <option value="8.33">8.33% (1 Month Salary)</option>
                                  <option value="10">10.0%</option>
                                  <option value="12.5">12.5%</option>
                                  <option value="15">15.0%</option>
                                  <option value="custom">Custom Percentage...</option>
                                </select>
                                {commissionType === "custom" && (
                                  <div className="flex items-center gap-1 shrink-0 w-1/3">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={customCommission}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomCommission(val);
                                        if (val) {
                                          setValue("clientBillRate", `${val}% Placement Commission`, { shouldValidate: true });
                                        }
                                      }}
                                      placeholder="e.g. 10.5"
                                      className="h-8 w-full text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700 rounded font-semibold"
                                    />
                                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">%</span>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Bill Rate <span className="text-red-500">*</span></Label>
                                <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Bill rate information">?</span>
                              </div>
                              <div className="flex gap-1.5 items-center w-full">
                                <select
                                  value={billCurrency}
                                  onChange={(e) => setBillCurrency(e.target.value)}
                                  className="w-16 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                                >
                                  <option value="INR">INR</option>
                                  <option value="USD">USD</option>
                                </select>
                                <Input
                                  type="text"
                                  {...register("clientBillRate")}
                                  className="h-8 flex-1 min-w-[70px] text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700 font-semibold"
                                  placeholder="Rate"
                                />
                                <select
                                  value={billUnit}
                                  onChange={(e) => setBillUnit(e.target.value)}
                                  className="w-24 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                                >
                                  
                                  <option value="Monthly">Monthly</option>
                                  <option value="Hourly">Hourly</option>
                                </select>
                              </div>
                            </>
                          )}
                          {errors.clientBillRate && (
                            <p className="text-[10px] text-red-655 font-bold">{errors.clientBillRate.message}</p>
                          )}
                        </div>

                        
                        
                      </>
                    ) : (
                      /* For US Market: Client Bill Rate spans 2 cols */
                      <div className="space-y-1 md:col-span-2">
                        <div className="flex items-center gap-1">
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Bill Rate / Salary <span className="text-red-500">*</span></Label>
                          <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Bill rate information">?</span>
                        </div>
                        <div className="flex gap-1.5 items-center w-full">
                          <select
                            value={billCurrency}
                            onChange={(e) => setBillCurrency(e.target.value)}
                            className="w-16 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                          >
                            <option value="USD">USD</option>
                            <option value="CAD">CAD</option>
                          </select>
                          <Input
                            type="text"
                            {...register("clientBillRate")}
                            className="h-8 flex-1 min-w-[70px] text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700 font-semibold"
                            placeholder="Rate"
                          />
                          <select
                            value={billUnit}
                            onChange={(e) => setBillUnit(e.target.value)}
                            className="w-24 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                          >
                            <option value="Hourly">Hourly</option>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-Weekly">Bi-Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Yearly">Yearly</option>
                                  <option value="LPA">LPA</option>
                          </select>
                          <select
                            value={billTerm}
                            onChange={(e) => setBillTerm(e.target.value)}
                            className="w-36 h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                          >
                            <option value="W-2">W-2</option>
                            <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                            <option value="C2C">C2C</option>
                            <option value="1099">1099</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        {errors.clientBillRate && (
                          // @ts-ignore
                          <p className="text-[10px] text-red-655 font-bold">{errors.clientBillRate.message}</p>
                        )}
                      </div>
                    )}
{/* Point of Contact (POC) */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Point of Contact</Label>
                      <Popover open={pocOpen} onOpenChange={setPocOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!selectedClientId}
                            className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700"
                          >
                            <span className="truncate">
                              {selectedPocId
                                ? pocList.myContacts.concat(pocList.otherContacts).find(p => p.id === selectedPocId)?.name || "Unknown POC"
                                : "Select POC..."}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search POC..."
                              className="text-xs h-8"
                              value={pocSearch}
                              onValueChange={setPocSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No POC found.</CommandEmpty>

                              {pocList.myContacts.length > 0 && (
                                <CommandGroup heading="My Contacts">
                                  {Array.from(new Map(pocList.myContacts.map(p => [p.name, p])).values())
                                    .filter(p => p.name.toLowerCase().includes(pocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={`${p.name} ${p.id}`}
                                        onSelect={() => {
                                          setSelectedPocId(p.id);
                                          setPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{p.name}</span>
                                          <span className="text-[10px] text-neutral-500">{[p.designation, p.email, p.phone].filter(Boolean).join(" | ")}</span>
                                        </div>
                                        <Check
                                          className={`ml-auto h-3 w-3 ${selectedPocId === p.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}

                              {pocList.otherContacts.length > 0 && (
                                <CommandGroup heading="Other Contacts">
                                  {Array.from(new Map(pocList.otherContacts.map(p => [p.name, p])).values())
                                    .filter(p => p.name.toLowerCase().includes(pocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={`${p.name} ${p.id}`}
                                        onSelect={() => {
                                          setSelectedPocId(p.id);
                                          setPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{p.name}</span>
                                          <span className="text-[10px] text-neutral-500">Added by {p.addedBy?.name || 'Unknown'}</span>
                                        </div>
                                        <Check
                                          className={`ml-auto h-3 w-3 ${selectedPocId === p.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                            <div className="p-2 border-t">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-xs font-semibold text-blue-600 justify-start h-8"
                                onClick={() => {
                                  setPocOpen(false);
                                  setAddPocOpen(true);
                                }}
                              >
                                + Add New Contact
                              </Button>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* End Client */}
                    <div className="space-y-1 flex flex-col">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">End Client</label>
                      <Popover open={endClientDropdownOpen} onOpenChange={(open) => {
                        setEndClientDropdownOpen(open);
                        if (!open) {
                          setEndClientSearchText("");
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            role="combobox"
                            aria-expanded={endClientDropdownOpen}
                            className="w-full justify-between h-8 text-xs font-normal bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-900 dark:text-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100"
                          >
                            <span className={cn("truncate", watch("endClientName") ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-400 dark:text-slate-400 font-medium")}>
                              {watch("endClientName") ? watch("endClientName") : "Search or enter End Client..."}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search for an End Client..."
                              className="h-9 text-xs"
                              value={endClientSearchText}
                              onValueChange={setEndClientSearchText}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const query = endClientSearchText.trim();
                                  if (query) {
                                    const exactMatch = clientList.find((cl: any) => {
                                      const cName = (cl.client_name || cl.clientName || cl.name || "").toLowerCase();
                                      return cName === query.toLowerCase();
                                    });
                                    if (exactMatch) {
                                      const clientNameStr = exactMatch.client_name || exactMatch.clientName || exactMatch.name || "";
                                      setValue("endClientName", clientNameStr, { shouldValidate: true });
                                      // @ts-ignore
                                      if (exactMatch?.id) setSelectedEndClientId(exactMatch.id); else if (typeof cl !== "undefined" && cl?.id) setSelectedEndClientId(cl.id);
                                      setEndClientDropdownOpen(false);
                                      setEndClientSearchText("");
                                    } else {
                                      setClientModalTarget("endClientName");
                                      setPrefilledClientName(query);
                                      setEndClientDropdownOpen(false);
                                      setAddClientModalOpen(true);
                                    }
                                    e.preventDefault();
                                  }
                                }
                              }}
                            />
                            <CommandList className="max-h-[240px] overflow-y-auto">
                              {(() => {
                                const query = endClientSearchText.trim().toLowerCase();
                                const filtered = clientList.filter((cl: any) => {
                                  const cName = (cl.client_name || cl.clientName || cl.name || "").toLowerCase();
                                  return !query || cName.includes(query);
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div className="py-4 px-3 text-center text-xs text-neutral-500">
                                      {query ? (
                                        <div className="space-y-2">
                                          <p>No client matching "{endClientSearchText.trim()}"</p>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setClientModalTarget("endClientName");
                                              setPrefilledClientName(endClientSearchText.trim());
                                              setEndClientDropdownOpen(false);
                                              setAddClientModalOpen(true);
                                            }}
                                            className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-primary/90 transition-colors cursor-pointer"
                                          >
                                            Use "{endClientSearchText.trim()}" as End Client
                                          </button>
                                        </div>
                                      ) : (
                                        "No clients available in database."
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <CommandGroup heading="Existing Clients">
                                    {filtered.map((cl: any) => {
                                      const clientNameStr = cl.client_name || cl.clientName || cl.name || "";
                                      return (
                                        <CommandItem
                                          key={cl.id || clientNameStr}
                                          value={clientNameStr}
                                          onSelect={() => {
                                            setValue("endClientName", clientNameStr, { shouldValidate: true });
                                      // @ts-ignore
                                      if (exactMatch?.id) setSelectedEndClientId(exactMatch.id); else if (typeof cl !== "undefined" && cl?.id) setSelectedEndClientId(cl.id);
                                            setEndClientDropdownOpen(false);
                                            setEndClientSearchText("");
                                          }}
                                          className="text-xs cursor-pointer"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              watch("endClientName") === clientNameStr ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {clientNameStr}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                );
                              })()}
                            </CommandList>
                            <div className="p-2 border-t flex items-center justify-between gap-2">
                              {endClientSearchText.trim() !== "" && (
                                <button
                                  type="button"
                                  className="text-primary font-bold text-xs hover:underline bg-transparent border-0 cursor-pointer"
                                  onClick={() => {
                                    const query = endClientSearchText.trim();
                                    const exactMatch = clientList.find((cl: any) => {
                                      const cName = (cl.client_name || cl.clientName || cl.name || "").toLowerCase();
                                      return cName === query.toLowerCase();
                                    });
                                    if (exactMatch) {
                                      const clientNameStr = exactMatch.client_name || exactMatch.clientName || exactMatch.name || "";
                                      setValue("endClientName", clientNameStr, { shouldValidate: true });
                                      // @ts-ignore
                                      if (exactMatch?.id) setSelectedEndClientId(exactMatch.id); else if (typeof cl !== "undefined" && cl?.id) setSelectedEndClientId(cl.id);
                                      setEndClientDropdownOpen(false);
                                      setEndClientSearchText("");
                                    } else {
                                      setClientModalTarget("endClientName");
                                      setPrefilledClientName(query);
                                      setEndClientDropdownOpen(false);
                                      setAddClientModalOpen(true);
                                    }
                                  }}
                                >
                                  ✔ Select "{endClientSearchText.trim()}"
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-blue-600 dark:text-blue-400 font-bold flex items-center hover:underline bg-transparent border-0 cursor-pointer text-xs ml-auto"
                                onClick={() => {
                                  setClientModalTarget("endClientName");
                                  setPrefilledClientName(endClientSearchText.trim());
                                  setEndClientDropdownOpen(false);
                                  setAddClientModalOpen(true);
                                }}
                              >
                                + Add Client
                              </button>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {errors.endClientName && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.endClientName.message}</p>
                      )}
                    </div>

                    
                    
                    {/* End Client POC */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">End Client POC</Label>
                      <Popover open={endPocOpen} onOpenChange={setEndPocOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!watch("endClientName")}
                            className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700"
                          >
                            <span className="truncate">
                              {selectedEndPocId
                                ? endPocList.myContacts.concat(endPocList.otherContacts).find(p => p.id === selectedEndPocId)?.name || "Unknown POC"
                                : "Select End POC..."}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search POC..."
                              className="text-xs h-8"
                              value={endPocSearch}
                              onValueChange={setEndPocSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No POC found.</CommandEmpty>

                              {endPocList.myContacts.length > 0 && (
                                <CommandGroup heading="My Contacts">
                                  {Array.from(new Map(endPocList.myContacts.map(p => [p.name, p])).values())
                                    .filter(p => p.name.toLowerCase().includes(endPocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={`${p.name} ${p.id}`}
                                        onSelect={() => {
                                          setSelectedEndPocId(p.id);
                                          setEndPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer py-1.5"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                                          {p.email && <span className="text-[10px] text-neutral-500">{p.email}</span>}
                                        </div>
                                        <Check
                                          className={`ml-auto h-3 w-3 ${selectedEndPocId === p.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}

                              {endPocList.otherContacts.length > 0 && (
                                <CommandGroup heading="Company Contacts">
                                  {Array.from(new Map(endPocList.otherContacts.map(p => [p.name, p])).values())
                                    .filter(p => p.name.toLowerCase().includes(endPocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={`${p.name} ${p.id}`}
                                        onSelect={() => {
                                          setSelectedEndPocId(p.id);
                                          setEndPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer py-1.5"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                                          {p.email && <span className="text-[10px] text-neutral-500">{p.email}</span>}
                                        </div>
                                        <Check
                                          className={`ml-auto h-3 w-3 ${selectedEndPocId === p.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                              <div className="p-1 mt-1 border-t border-neutral-200 dark:border-slate-800">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="w-full text-xs font-semibold text-blue-600 justify-start h-8"
                                  onClick={() => {
                                    setEndPocOpen(false);
                                    setAddEndPocOpen(true);
                                  }}
                                >
                                  + Add New Contact
                                </Button>
                              </div>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Row 4, Col 3: Client Job ID */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Job ID</Label>
                      <input
                        type="text"
                        {...register("clientJobId")}
                        className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                        placeholder="e.g. REQ-9941"
                      />
                    </div>

                                      </div>
                )}
              </div>

              {/* Job Status (Hidden, Defaults to Active) */}
                    <input type="hidden" {...register("jobStatus")} value="Active" />

              {/* -------------------- JOB LOCATION SECTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="JOB LOCATION" sectionKey="location" />
                {!collapsedSections.location && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Country */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Country</label>
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                            {watch("country") ? (
                              <div className="flex items-center gap-2">
                                <ReactCountryFlag countryCode={Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || ""} svg style={{ width: "1.2em", height: "1.2em" }} />
                                <span className="truncate">{watch("country")}</span>
                              </div>
                            ) : "Select Country..."}
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search country..." className="text-xs h-8" value={countrySearchText} onValueChange={setCountrySearchText} />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {Country.getAllCountries().filter((c: any) => c.name.toLowerCase().includes(countrySearchText.toLowerCase())).map((c: any) => (
                                  <CommandItem key={c.isoCode} value={c.name} onSelect={() => { setValue("country", c.name, { shouldValidate: true, shouldDirty: true }); setValue("states", ""); setValue("city", ""); setCountryOpen(false); }} className="text-xs font-medium cursor-pointer">
                                    <ReactCountryFlag countryCode={c.isoCode} svg className="mr-2 h-4 w-4" />
                                    {c.name}
                                    <Check className={cn("ml-auto h-3 w-3", watch("country") === c.name ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* State */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">State</label>
                      <Popover open={stateOpen} onOpenChange={setStateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" disabled={!watch("country")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                            <span className="truncate">{watch("states") || "Select State..."}</span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search state..." className="text-xs h-8" value={stateSearchText} onValueChange={setStateSearchText} />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No state found.</CommandEmpty>
                              <CommandGroup>
                                {State.getStatesOfCountry(Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || "").filter((s: any) => s.name.toLowerCase().includes(stateSearchText.toLowerCase())).map((s: any) => (
                                  <CommandItem key={s.isoCode} value={s.name} onSelect={() => { setValue("states", s.name, { shouldValidate: true, shouldDirty: true }); setValue("city", ""); setStateOpen(false); }} className="text-xs font-medium cursor-pointer">
                                    {s.name}
                                    <Check className={cn("ml-auto h-3 w-3", watch("states") === s.name ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* City */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">City</label>
                      <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" disabled={!watch("states")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                            <span className="truncate">{watch("city") || "Select City..."}</span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search city..." className="text-xs h-8" value={citySearchText} onValueChange={setCitySearchText} />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No city found.</CommandEmpty>
                              <CommandGroup>
                                {City.getCitiesOfState(
                                  Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || "",
                                  State.getStatesOfCountry(Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || "").find((s: any) => s.name === watch("states"))?.isoCode || ""
                                ).filter((c: any) => c.name.toLowerCase().includes(citySearchText.toLowerCase())).map((c: any) => (
                                  <CommandItem key={c.name} value={c.name} onSelect={() => { setValue("city", c.name, { shouldValidate: true, shouldDirty: true }); setCityOpen(false); }} className="text-xs font-medium cursor-pointer">
                                    {c.name}
                                    <Check className={cn("ml-auto h-3 w-3", watch("city") === c.name ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

{/* -------------------- REQUIRED SKILLS SECTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="Required Skills" sectionKey="skills" />
                {!collapsedSections.skills && (
                  <div className="p-4 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Industry */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Industry</label>
                        <input
                          type="text"
                          {...register("industry")}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                          placeholder="e.g. Banking / FinTech"
                        />
                      </div>

                      {/* Degree */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Degree</label>
                        <input
                          type="text"
                          {...register("degree")}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
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
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                            Primary Skills <span className="text-[10px] text-neutral-400 font-normal">(Press Enter to add)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleExtractSkillsFromDescription}
                            disabled={isExtractingSkills}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isExtractingSkills ? (
                              <>
                                <span className="h-2.5 w-2.5 border border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                Extracting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" /> Auto-Extract from JD below
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 min-h-[36px] items-center focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                          {primarySkills.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold flex items-center gap-1 shadow-none rounded px-1.5 py-0.5"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removePrimarySkill(tag)}
                                className="hover:text-red-500 text-indigo-500/80 transition-colors cursor-pointer"
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
                            className="bg-transparent border-none outline-none text-xs flex-1 min-w-[80px] text-neutral-800 dark:text-neutral-200"
                          />
                        </div>
                      </div>

                      {/* Secondary Skills */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                            Secondary Skills <span className="text-[10px] text-neutral-400 font-normal">(Press Enter to add)</span>
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 min-h-[36px] items-center focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                          {secondarySkills.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1 shadow-none rounded px-1.5 py-0.5"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeSecondarySkill(tag)}
                                className="hover:text-red-500 text-slate-500 transition-colors cursor-pointer"
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
                            className="bg-transparent border-none outline-none text-xs flex-1 min-w-[80px] text-neutral-800 dark:text-neutral-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* -------------------- ORGANIZATIONAL INFORMATION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="Organizational Information" sectionKey="orgInfo" />
                {!collapsedSections.orgInfo && (
                  <div className="p-4 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Positions */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center h-5">
                          Number of Positions <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                          type="number"
                          {...register("numPositions", { valueAsNumber: true })}
                          className="w-full h-9 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200 font-medium"
                        />
                      </div>

                      {/* Max Submissions */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center h-5">
                          Maximum Allowed Submissions <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                          type="number"
                          {...register("maxSubmissions", { valueAsNumber: true })}
                          className="w-full h-9 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200 font-medium"
                        />
                      </div>

                      {/* Job Assignment Custom Dropdown */}
                      {canAssignJob && assignmentPolicy && <div className="space-y-1.5 relative">
                        <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between h-5">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                              <User className="h-2.5 w-2.5" />
                            </span>
                            Job Assignment {assignmentRequired && <span className="text-red-500 ml-0.5">*</span>}
                          </span>
                        </label>
                        <div 
                          onClick={() => setIsAssignmentModalOpen(true)}
                          className={cn(
                            "flex items-center justify-between w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm",
                            (assignmentRequired && !assignmentValid) && isSubmitted ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                {assignmentType === "pod" && selectedPodId ? podsList.find(p => p.id === selectedPodId)?.name || "Recruitment Pod" :
                                 assignmentType === "recruiters" && selectedRecruiterIds.length > 0 ? `${selectedRecruiterIds.length} Recruiter${selectedRecruiterIds.length > 1 ? 's' : ''} Selected` :
                                 assignmentType === "unassigned" ? (assignmentRequired ? "Select Pods or Recruiters" : "No assignment (optional)") :
                                 "Select Assignment..."}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Click to configure job assignment
                              </span>
                            </div>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] px-2 font-bold uppercase tracking-wider">
                            Change
                          </Button>
                        </div>
                        {isSubmitted && (assignmentRequired && !assignmentValid) && (
                          <p className="text-[11px] text-red-500 font-medium mt-1">
                            Select a pod or at least one recruiter.
                          </p>
                        )}
                        
                        <JobAssignmentModal
                          isOpen={isAssignmentModalOpen}
                          onClose={() => setIsAssignmentModalOpen(false)}
                          assignmentType={assignmentType}
                          selectedPodId={selectedPodId}
                          selectedRecruiterIds={selectedRecruiterIds}
                          onApply={(type, podId, recruiterIds) => {
                            setAssignmentType(type);
                            setSelectedPodId(podId);
                            setSelectedRecruiterIds(recruiterIds);
                          }}
                          podsList={branchPods}
                          recruitersList={recruitersList}
                          activeBranch={assignmentPolicy}
                          canAssignPods={canAssignPods}
                          canAssignRecruiters={canAssignRecruiters}
                        />
                      </div>}
                    </div>
                  </div>
                )}
              </div>

              {/* -------------------- JOB DESCRIPTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="Job Description & Editor" sectionKey="jobDescription" />
                {!collapsedSections.jobDescription && (
                  <div className="p-4 space-y-3">
                    <RichTextEditor
                      value={watch("jobDescription") || ""}
                      onChange={(val) => setValue("jobDescription", val, { shouldValidate: true, shouldDirty: true })}
                      placeholder="Type or paste rich job description from Word, PDF, or Docs..."
                    />
                    {errors.jobDescription && (
                      <p className="text-[10px] text-red-655 font-bold">{errors.jobDescription.message}</p>
                    )}
                  </div>
                )}
              </div>


              {/* -------------------- DOCUMENTS -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
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
            {/* Bottom Action Footer Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 flex items-center justify-between sticky bottom-0 z-20 shadow-md">
              <div className="text-xs text-neutral-500 font-medium hidden sm:block">
                Fill in the mandatory fields marked with <span className="text-red-500 font-bold">*</span> to publish your job requisition.
              </div>
              <div className="flex items-center gap-2 ml-auto">
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
                {(() => {
                  const hasDirectPublish = currentUserProfile?.permissions?.includes("job:publish_direct") || 
                    currentUserProfile?.roles?.some((r: string) => ["TENANT_ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(r.toUpperCase().replace(/[\s-_]+/g, "")));
                  const requiresApproval = !hasDirectPublish;

                  return (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={publishingModalState?.status === "publishing"}
                      className="h-8.5 px-4 font-bold text-white shadow-xs cursor-pointer text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/90 active:bg-primary/80 hover:shadow-md transition-all duration-200 group transform active:scale-95"
                    >
                      {publishingModalState?.status === "publishing" ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          <span>Publishing Job...</span>
                        </>
                      ) : requiresApproval ? (
                        <>
                          <Shield className="h-3.5 w-3.5 text-amber-300 transition-transform group-hover:scale-110" />
                          <span>Submit for Approval</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          <span>Publish Job Requirement</span>
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>
        </form>
      )}

      

      {/* Add End POC Dialog */}
      <ContactDialog open={addEndPocOpen} onOpenChange={setAddEndPocOpen} clientId={selectedEndClientId} market="IN" endClient onSaved={contact => {
        setEndPocList(prev => ({ ...prev, myContacts: [contact, ...prev.myContacts] }));
        setSelectedEndPocId(contact.id);
      }} />
      {/* Add POC Dialog */}
      <ContactDialog open={addPocOpen} onOpenChange={setAddPocOpen} clientId={selectedClientId} market="IN"  onSaved={contact => {
        setPocList(prev => ({ ...prev, myContacts: [contact, ...prev.myContacts] }));
        setSelectedPocId(contact.id);
      }} />
      <AddClientModal
        market="IN"
        open={addClientModalOpen}
        onOpenChange={(open) => {
          setAddClientModalOpen(open);
          if (!open) {
            setPrefilledClientName("");
          }
        }}
        initialClientName={prefilledClientName}
        onClientAdded={async (clientName) => {
          const latestClients = await atsApi.clients.list();
          const addedClient = latestClients.find((c: any) => (c.client_name || c.clientName) === clientName);
          if (addedClient && clientModalTarget === "client") setSelectedClientId(addedClient.id);
          fetchClients();
          if (clientModalTarget === "client") {
            setValue("client", clientName, { shouldValidate: true });
            if (!getValues("endClientName")) {
              setValue("endClientName", clientName, { shouldValidate: true });
            }
          } else {
            setValue("endClientName", clientName, { shouldValidate: true });
          }
          setPrefilledClientName("");
        }}
        
      />

      {/* 4. POSTING NEW JOB REQUISITION POPUP MODAL */}
      {publishingModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                publishingModalState.status === "publishing" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" :
                publishingModalState.status === "success" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" :
                "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
              )}>
                {publishingModalState.status === "publishing" ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                ) : publishingModalState.status === "success" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {publishingModalState.status === "publishing" ? "Posting New Job Requirement..." :
                   publishingModalState.status === "success" ? "Job Requirement Published!" :
                   "Job Posting Failed"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {publishingModalState.status === "publishing" ? "Registering requisition and configuring allocation..." :
                   publishingModalState.status === "success" ? "Your job posting is now active and published to the workspace." :
                   publishingModalState.errorMessage || "An error occurred while publishing the job."}
                </p>
              </div>
            </div>

            {/* Short Details Preview Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 space-y-3 font-sans text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Job Title</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{publishingModalState.jobTitle || "Job Requisition"}</span>
                </div>
                {publishingModalState.jobCode && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 font-mono font-bold text-[11px] rounded-md shrink-0">
                    {publishingModalState.jobCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Client Account</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{publishingModalState.client || "Direct Client"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Business Unit</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{publishingModalState.businessUnit || "Main Office"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Type & Location</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{publishingModalState.jobType || "Full Time"} {"\u2022"} {publishingModalState.location || "Remote"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Positions & Pay Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{publishingModalState.positions || 1} Pos {"\u2022"} {publishingModalState.payRate || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Progress or Action Buttons */}
            {publishingModalState.status === "publishing" ? (
              <div className="space-y-2 pt-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full w-4/5 animate-pulse rounded-full" />
                </div>
                <p className="text-[11px] text-center text-slate-400 font-medium italic">
                  Connecting with database & synchronizing recruiters...
                </p>
              </div>
            ) : publishingModalState.status === "success" ? (
              <div className="flex items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  onClick={() => router.push("/job-posting")}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 cursor-pointer shadow-xs"
                >
                  <span>View All Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                {publishingModalState.createdJobId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/job-posting/${publishingModalState.createdJobId}`)}
                    className="flex-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs h-9 cursor-pointer"
                  >
                    <span>View Requisition</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPublishingModalState(null)}
                  className="border-slate-300 dark:border-slate-700 font-bold text-xs h-9 cursor-pointer"
                >
                  Close & Review Form
                </Button>
              </div>
            )}

          </div>
        </div>
      )}
      </div>
  );
}

