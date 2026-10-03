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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AddClientModal } from "../components/add-client-modal";
import { resolveActiveSystemRole, isRoleAdmin } from "@/lib/role-permissions";

import { Country, State, City } from "country-state-city";
import ReactCountryFlag from "react-country-flag";
import { WORK_AUTHORIZATION_OPTIONS, INDIAN_WORK_AUTHORIZATION_OPTIONS, INDIA_STATES_CITIES, US_STATES_CITIES } from "@/lib/job-form-constants";

import { atsApi } from "@/lib/ats-api";
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
    return "landing";
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
  const [pocOpen, setPocOpen] = useState(false);
  const [pocSearch, setPocSearch] = useState('');
  const [selectedPocId, setSelectedPocId] = useState<string | null>(null);
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
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedPodId, setSelectedPodId] = useState("");
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
      setValue("workAuthorization", "Indian Citizen");
      setValue("taxTerms", "Permanent");
      setBillCurrency("INR");
      setBillUnit("LPA");
      setBillTerm("Permanent");
      setPayCurrency("INR");
      setPayUnit("LPA");
      setPayTerm("Permanent");
    } else {
      setValue("country", "United States");
      setValue("jobType", "Contract");
      setValue("shiftTiming", unit.shiftTiming || "US Shift (Night)");
      setValue("workAuthorization", "US Authorized");
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

  const deliveryHeads = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const u of branchUsers) {
      const uid = u.id || u.email;
      if (!uid || seen.has(uid)) continue;
      const r = (u.roles || []).map((x: string) => x.toUpperCase());
      if (r.includes("DELIVERY_HEAD") || r.includes("TENANT_ADMIN") || r.includes("BRANCH_ADMIN") || r.includes("SUPER_ADMIN")) {
        seen.add(uid);
        list.push(u);
      }
    }
    return list;
  }, [branchUsers]);

  const recruitersList = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;

    for (const u of branchUsers) {
      const uid = u.id || u.email;
      if (!uid || seen.has(uid)) continue;

      // 1. Must be an active user
      if (u.isActive === false || u.is_active === false) continue;

      // 2. Branch isolation check if activeBranchId is set
      if (activeBranchId) {
        const userBranchId = u.branchId || u.branch_id;
        const assignedBranches = Array.isArray(u.assignedBranchIds) ? u.assignedBranchIds : (Array.isArray(u.assigned_branch_ids) ? u.assigned_branch_ids : []);
        const belongsToBranch = userBranchId === activeBranchId || assignedBranches.includes(activeBranchId) || !userBranchId;
        if (!belongsToBranch) continue;
      }

      // 3. Granular permission capability check: user must have candidate submission / sourcing permission
      const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
      const hasSourcingPermission = 
        perms.includes("submission:create") || 
        perms.includes("candidate:create") || 
        perms.includes("submission:edit") || 
        perms.includes("submission:view") || 
        perms.includes("job:view");

      // Backward compatibility check for role tokens
      const r = (u.roles || []).map((x: string) => x.toUpperCase().replace(/[\s-_]+/g, ''));
      const isSourcingStaff = hasSourcingPermission || r.includes("RECRUITER") || r.includes("BRANCHADMIN") || r.includes("PODLEAD") || r.length === 0;

      if (isSourcingStaff) {
        seen.add(uid);
        list.push(u);
      }
    }
    return list;
  }, [branchUsers]);

  const getUserRoleLabel = useCallback((u: any): string => {
    const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    
    // 1. Check branch-specific custom roles in active branch
    if (activeBranchId && u.branchRoles && u.branchRoles[activeBranchId] && Array.isArray(u.branchRoles[activeBranchId]) && u.branchRoles[activeBranchId].length > 0) {
      const branchRoleIdOrName = u.branchRoles[activeBranchId][0];
      const matchedRole = (rolesList || []).find((cr: any) => cr.id === branchRoleIdOrName || cr.name?.toUpperCase() === String(branchRoleIdOrName).toUpperCase());
      if (matchedRole?.name) return matchedRole.name;
      if (typeof branchRoleIdOrName === 'string' && !branchRoleIdOrName.includes('-')) return branchRoleIdOrName;
    }

    // 2. Check any branch roles if user has branch assignments
    if (u.branchRoles && typeof u.branchRoles === 'object') {
      for (const bRoleArray of Object.values(u.branchRoles) as any[]) {
        if (Array.isArray(bRoleArray) && bRoleArray.length > 0) {
          const rItem = bRoleArray[0];
          const matchedRole = (rolesList || []).find((cr: any) => cr.id === rItem || cr.name?.toUpperCase() === String(rItem).toUpperCase());
          if (matchedRole?.name) return matchedRole.name;
          if (typeof rItem === 'string' && !rItem.includes('-')) return rItem;
        }
      }
    }

    // 3. Check customRoleName or roleName
    if (u.customRoleName) return u.customRoleName;
    if (u.roleName) {
      const matchedRole = (rolesList || []).find((cr: any) => cr.id === u.roleName || cr.name?.toUpperCase() === String(u.roleName).toUpperCase());
      if (matchedRole?.name) return matchedRole.name;
      return u.roleName;
    }

    // 4. System role
    if (u.systemRole) {
      return u.systemRole.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    // 5. Roles array
    if (Array.isArray(u.roles) && u.roles.length > 0) {
      const rItem = u.roles[0];
      const matchedRole = (rolesList || []).find((cr: any) => cr.id === rItem || cr.name?.toUpperCase() === String(rItem).toUpperCase());
      if (matchedRole?.name) return matchedRole.name;
      return rItem;
    }

    return "Staff";
  }, [rolesList]);

  const branchPods = useMemo(() => {
    const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (!activeBranchId) return podsList;
    return podsList.filter((p: any) => !p.branchId || !p.branch_id || p.branchId === activeBranchId || p.branch_id === activeBranchId);
  }, [podsList]);

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
      workAuthorization: "Indian Citizen",
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
      setValue("workAuthorization", "Indian Citizen");
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
      setValue("workAuthorization", "US Authorized");
    }
  }, [selectedCountry, setValue, commissionType, customCommission]);

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

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

            // Load heavier data in background without blocking job code generation
            Promise.all([
              atsApi.pods.list().catch(() => []),
              atsApi.auth.listUsers().catch(() => []),
              atsApi.auth.listRoles(undefined, true).catch(() => [])
            ]).then(([pList, uList, rList]) => {
              setPodsList(pList || []);
              setBranchUsers(uList || []);
              setRolesList(rList || []);
            });
            
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

          
          if (targetMarket === "IN") {
            setValue("jobType", "Full Time");
            setValue("shiftTiming", "General Shift (Day)");
            setValue("workAuthorization", "Indian Citizen");
            setValue("taxTerms", "Permanent");
            setValue("accountManager", posterName);
            setBillCurrency("INR");
            setBillUnit("LPA");
            setBillTerm("Permanent");
            setPayCurrency("INR");
            setPayUnit("LPA");
            setPayTerm("Permanent");
          } else {
            setValue("jobType", "Contract");
            setValue("shiftTiming", "US Shift (Night)");
            setValue("workAuthorization", "US Authorized");
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

    async function fetchPods() { try { const res = await atsApi.pods.list(); setPodsList(res || []); } catch(e) { console.warn("Could not load pods", e); } }

    fetchProfile();
    fetchClients();
    fetchPods();
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
          icon: "💾",
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

      setValue("jobType", jobData.type || "Contract");
      setValue("jobDescription", cleanDescription);
      setValue("shiftTiming", extractedShiftTiming);
      setPrimarySkills(jobData.skillsRequired || []);
      setSecondarySkills(jobData.secondarySkills || []);
      setValue("businessUnit", jobData.businessUnit || "enfycon Inc");
      setValue("country", jobData.country || "India");
      setValue("states", jobData.state || "");
      setValue("city", jobData.city || "");
      setValue("jobStatus", jobData.jobStatus || "Active");
      setValue("workAuthorization", jobData.visaType || "Indian Citizen");

      if (jobData.jobTimezone) {
        setJobTiming(prev => ({ ...prev, jobTimezone: jobData.jobTimezone! }));
      }

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
      setValue("recruiter", jobData.recruiterId || "");
      setValue("assignedTo", jobData.assignedTo || "");
      setValue("accountManager", jobData.accountManagerId || "");
      setValue("industry", jobData.industry || "");
      setValue("degree", jobData.degree || "");
      setValue("expMin", jobData.expMin);
      setValue("expMax", jobData.expMax);
      setValue("noticePeriod", jobData.noticePeriod || "Select Notice Period");

      if (jobData.podId) {
        setSelectedPodId(`pod:${jobData.podId}`);
      } else if (jobData.recruiterId) {
        setSelectedPodId(`rec:${jobData.recruiterId}`);
      } else if (jobData.assignedTo === "ALL" || jobData.assignedTo === "All Branch Recruiters") {
        setSelectedPodId("all");
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
          setValue("workAuthorization", true ? "Indian Citizen" : "US Authorized");
        }

        // Pre-fill location fields if returned (preserving active branch market)
        if (res.location) {
          if (true) {
            setValue("country", "India");
            if (res.location.state && !["Texas", "California", "New York", "Florida", "Illinois", "Washington", "Virginia", "New Jersey", "Georgia", "North Carolina"].includes(res.location.state)) {
              setValue("states", res.location.state);
            }
          } else {
            if (res.location.country) {
              setValue("country", res.location.country);
            }
            if (res.location.state) {
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
          toast("No skills found in description.", { icon: "⚠️" });
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
    if (!selectedPodId) {
      toast.error("Job Assignment is mandatory. Please select a Staff member, Pod, or Allocation Pool.");
      return;
    }

    const formatRatePayload = (val: string, cur: string, unit: string, term: string) => {
      if (!val || val === "N/A" || val === "Rate") return "N/A";
      const cleanVal = val.replace(/[^0-9.]/g, "");
      if (!cleanVal) return "N/A";
      if (cur === "INR") {
        return `INR - ${cleanVal} LPA`;
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
      assembledPayRate = minVal && maxVal && minVal !== maxVal 
        ? `INR - ${minVal} to ${maxVal} LPA` 
        : minVal 
          ? `INR - ${minVal} LPA` 
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

      let resolvedPodId: string | undefined = undefined;
      let resolvedApproverId: string | undefined = selectedApproverId || undefined;
      let resolvedApproverRole: string = selectedApproverRole || "POD_LEAD";
      let resolvedPrimaryRecruiterId: string | undefined = data.recruiter || undefined;
      let resolvedAssignedTo: string | undefined = data.assignedTo || undefined;

      if (selectedPodId.startsWith("pod:")) {
        resolvedPodId = selectedPodId.replace("pod:", "");
        resolvedApproverRole = "POD_LEAD";
        const pod = podsList.find((p) => p.id === resolvedPodId);
        if (pod?.podHeadId) resolvedApproverId = pod.podHeadId;
        resolvedAssignedTo = pod?.name || "Recruitment Pod";
      } else if (selectedPodId.startsWith("dh:")) {
        resolvedApproverId = selectedPodId.replace("dh:", "");
        resolvedApproverRole = "DELIVERY_HEAD";
        const dh = branchUsers.find((u) => u.id === resolvedApproverId);
        resolvedAssignedTo = dh?.fullName || "Delivery Head";
      } else if (selectedPodId.startsWith("rec:")) {
        resolvedPrimaryRecruiterId = selectedPodId.replace("rec:", "");
        resolvedApproverRole = "PRIMARY_RECRUITER";
        const rec = branchUsers.find((u) => u.id === resolvedPrimaryRecruiterId);
        resolvedAssignedTo = rec?.fullName || "Primary Recruiter";
      } else if (selectedPodId === "all") {
        resolvedAssignedTo = "ALL";
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
        location: data.locationAutocomplete || data.city || data.states || "Remote",
        type: data.jobType || "Contract",
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
        recruiterId: resolvedPrimaryRecruiterId,
        
        accountManagerId: data.accountManager || undefined,
        industry: data.industry || undefined,
        degree: data.degree || undefined,
        expMin: data.expMin,
        expMax: data.expMax,
        respondBy: respondByType === "Date Option" ? (data.respondBy || undefined) : undefined,
        noticePeriod: data.noticePeriod || undefined,
        podId: resolvedPodId,
        
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
                toast("Coming Soon!", { icon: "🚧" });
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
                toast("Coming Soon!", { icon: "🚧" });
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
                  {true ? `${tenantName} India IT Recruitment Workspace` : `${tenantName} US IT Recruitment Workspace`}
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
                                  } else if (val === "Contract") {
                                    setValue("taxTerms", true ? "Contract (3rd Party)" : "C2C");
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
                                } else if (val === "Contract") {
                                  setValue("taxTerms", true ? "Contract (3rd Party)" : "C2C");
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
                                  <option value="LPA">LPA</option>
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

                        {/* Row 3, Col 2: Work Authorization (Fits into red-marked space next to Client Commission) */}
                        {renderWorkAuthBlock()}
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
                          <p className="text-[10px] text-red-655 font-bold">{errors.clientBillRate.message}</p>
                        )}
                      </div>
                    )}

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
                              title="Target Budget CTC Range in Lakhs Per Annum (Min - Max)"
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
                                placeholder="e.g. 10.0"
                                className="w-full h-8 pl-10 pr-10 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">LPA</span>
                            </div>
                            <span className="text-xs font-bold text-neutral-400 shrink-0">to</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">Max</span>
                              <input
                                type="text"
                                value={payRateMax}
                                onChange={(e) => setPayRateMax(e.target.value)}
                                placeholder="e.g. 15.0"
                                className="w-full h-8 pl-10 pr-10 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">LPA</span>
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

                    {/* Job Status (Hidden, Defaults to Active) */}
                    <input type="hidden" {...register("jobStatus")} value="Active" />

                    {/* OLD LOCATION BLOCK - moved to Geographic Location section */}
                    <div style={{display:'none'}}>
                      {/* Country */}
                      <div className="space-y-1">
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">Country</Label>
                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={countryOpen} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                              {watch("country") ? (
                                <div className="flex items-center gap-2">
                                  <ReactCountryFlag countryCode={Country.getAllCountries().find(c => c.name === watch("country"))?.isoCode || ""} svg style={{ width: '1.2em', height: '1.2em' }} />
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
                                  {Country.getAllCountries().filter(c => c.name.toLowerCase().includes(countrySearchText.toLowerCase())).map((c) => (
                                    <CommandItem
                                      key={c.isoCode}
                                      value={c.name}
                                      onSelect={() => {
                                        setValue("country", c.name, { shouldValidate: true, shouldDirty: true });
                                        setValue("states", "");
                                        setValue("city", "");
                                        setCountryOpen(false);
                                      }}
                                      className="text-xs font-medium cursor-pointer"
                                    >
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
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">State</Label>
                        <Popover open={stateOpen} onOpenChange={setStateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={stateOpen} disabled={!watch("country")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
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
                                  {State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === watch("country"))?.isoCode || "").filter(s => s.name.toLowerCase().includes(stateSearchText.toLowerCase())).map((s) => (
                                    <CommandItem
                                      key={s.isoCode}
                                      value={s.name}
                                      onSelect={() => {
                                        setValue("states", s.name, { shouldValidate: true, shouldDirty: true });
                                        setValue("city", "");
                                        setStateOpen(false);
                                      }}
                                      className="text-xs font-medium cursor-pointer"
                                    >
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
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">City</Label>
                        <Popover open={cityOpen} onOpenChange={setCityOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={cityOpen} disabled={!watch("states")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
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
                                    Country.getAllCountries().find(c => c.name === watch("country"))?.isoCode || "",
                                    State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === watch("country"))?.isoCode || "").find(s => s.name === watch("states"))?.isoCode || ""
                                  ).filter(c => c.name.toLowerCase().includes(citySearchText.toLowerCase())).map((c) => (
                                    <CommandItem
                                      key={c.name}
                                      value={c.name}
                                      onSelect={() => {
                                        setValue("city", c.name, { shouldValidate: true, shouldDirty: true });
                                        setCityOpen(false);
                                      }}
                                      className="text-xs font-medium cursor-pointer"
                                    >
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
                                <CommandGroup heading="? My Contacts">
                                  {pocList.myContacts
                                    .filter(p => p.name.toLowerCase().includes(pocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                          setSelectedPocId(p.id);
                                          setPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{p.name}</span>
                                          {p.designation && <span className="text-[10px] text-neutral-500">{p.designation}</span>}
                                        </div>
                                        <Check
                                          className={`ml-auto h-3 w-3 ${selectedPocId === p.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}

                              {pocList.otherContacts.length > 0 && (
                                <CommandGroup heading="?? Other Contacts">
                                  {pocList.otherContacts
                                    .filter(p => p.name.toLowerCase().includes(pocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
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
\n                    {/* Row 4, Col 3: Client Job ID */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Job ID</Label>
                      <input
                        type="text"
                        {...register("clientJobId")}
                        className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                        placeholder="e.g. REQ-9941"
                      />
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

                    {/* Row 5: Tax Terms (1 Col) & Work Authorization (3 Cols) for US Market */}
                    {false && (
                      <>
                        <div className="space-y-1">
                          <Label className="font-bold text-neutral-700 dark:text-neutral-300">
                            Tax Terms <span className="text-red-500">*</span>
                          </Label>
                          <select
                            {...register("taxTerms")}
                            className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                          >
                            <option value="W-2">W-2</option>
                            <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                            <option value="C2C">C2C</option>
                            <option value="1099">1099</option>
                            <option value="Other">Other</option>
                          </select>
                          {errors.taxTerms && (
                            <p className="text-[10px] text-red-655 font-bold">{errors.taxTerms.message}</p>
                          )}
                        </div>
                        {renderWorkAuthBlock("md:col-span-3")}
                      </>
                    )}
                  </div>
                )}
              </div>

              
              {/* -------------------- GEOGRAPHIC LOCATION SECTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="Geographic Location" sectionKey="location" />
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
                      <div className="space-y-1.5 relative" ref={assignmentDropdownRef}>
                        <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between h-5">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                              <User className="h-2.5 w-2.5" />
                            </span>
                            Job Assignment <span className="text-red-500 ml-0.5">*</span>
                          </span>
                        </label>

                        {/* Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setIsAssignmentOpen(!isAssignmentOpen)}
                          className={cn(
                            "w-full min-h-[38px] bg-white dark:bg-slate-950 border rounded-md px-3 py-1.5 text-left text-xs outline-none transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer",
                            isSubmitted && !selectedPodId
                              ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10 focus:border-red-500 focus:ring-red-500/20"
                              : "border-neutral-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            {(() => {
                              if (selectedPodId.startsWith("pod:")) {
                                const pid = selectedPodId.replace("pod:", "");
                                const pod = (branchPods || podsList).find((p: any) => p.id === pid);
                                return (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-semibold text-neutral-900 dark:text-white">Pod: {pod?.name || "Recruitment Pod"}</span>
                                    {pod?.podHeadName && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400">
                                        Lead: {pod.podHeadName}
                                      </span>
                                    )}
                                  </div>
                                );
                              } else if (selectedPodId.startsWith("rec:")) {
                                const recId = selectedPodId.replace("rec:", "");
                                const rec = (recruitersList || branchUsers || []).find((u: any) => u.id === recId);
                                if (rec) {
                                  const roleLabel = getUserRoleLabel(rec);
                                  return (
                                    <div className="flex flex-col text-left py-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-neutral-900 dark:text-white">{rec.fullName || rec.name}</span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                                          [{roleLabel}]
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal">
                                        {rec.email}
                                      </span>
                                    </div>
                                  );
                                }
                                return <span className="text-neutral-400">Select Staff, Pod, or Pool...</span>;
                              } else if (selectedPodId === "all") {
                                return <span className="font-semibold text-neutral-900 dark:text-white">All recruiters</span>;
                              } else if (selectedPodId === "none") {
                                return <span className="font-semibold text-neutral-900 dark:text-white">Unassigned Allocation (Hold for Manager Assignment)</span>;
                              } else if (selectedPodId === "auto_pod") {
                                return <span className="font-semibold text-neutral-900 dark:text-white">Recruitment Pod System (Auto - Sequential)</span>;
                              }
                              return <span className="text-neutral-400">Select Staff, Pod, or Pool...</span>;
                            })()}
                          </div>
                          <ChevronDown className={cn("h-4 w-4 text-neutral-400 transition-transform shrink-0", isAssignmentOpen && "rotate-180")} />
                        </button>
                        {isSubmitted && !selectedPodId && (
                          <p className="text-[11px] text-red-500 font-medium mt-1">
                            Job Assignment is required. Please select a Staff member, Pod, or Pool.
                          </p>
                        )}

                        {/* Dropdown Overlay Menu */}
                        {isAssignmentOpen && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden p-2 space-y-2">
                            {/* Search Input */}
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                placeholder="Search staff, role, email, or pod..."
                                value={assignmentSearch}
                                onChange={(e) => setAssignmentSearch(e.target.value)}
                                className="w-full h-8 bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded pl-7 pr-2 text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:border-indigo-500"
                                autoFocus
                              />
                              <Search className="absolute left-2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin select-none">
                              {/* 1. Recruitment Pods */}
                              {(!activeBranch || ((activeBranch.allowPods ?? activeBranch.allow_pods) !== false)) && !(activeBranch?.allowNone ?? activeBranch?.allow_none) && (
                                <div className="space-y-1">
                                  <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-50/80 dark:bg-slate-800/50 rounded">
                                    Recruitment Pods
                                  </div>
                                  {branchPods && branchPods.length > 0 ? (
                                    branchPods
                                      .filter((pod: any) => !assignmentSearch.trim() || pod.name.toLowerCase().includes(assignmentSearch.toLowerCase()) || (pod.podHeadName && pod.podHeadName.toLowerCase().includes(assignmentSearch.toLowerCase())))
                                      .map((pod: any) => {
                                        const isSelected = selectedPodId === `pod:${pod.id}`;
                                        return (
                                          <div
                                            key={`pod:${pod.id}`}
                                            onClick={() => {
                                              setSelectedPodId(`pod:${pod.id}`);
                                              setSelectedApproverRole("POD_LEAD");
                                              setSelectedApproverId(pod?.podHeadId || "");
                                              setIsAssignmentOpen(false);
                                            }}
                                            className={cn(
                                              "px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between text-xs",
                                              isSelected && "bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60"
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-neutral-800 dark:text-neutral-200">Pod: {pod.name}</span>
                                              {pod.podHeadName && (
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400">
                                                  Lead: {pod.podHeadName}
                                                </span>
                                              )}
                                            </div>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                                          </div>
                                        );
                                      })
                                  ) : (
                                    <div
                                      onClick={() => {
                                        setSelectedPodId("auto_pod");
                                        setIsAssignmentOpen(false);
                                      }}
                                      className="px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800/70 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                                    >
                                      Recruitment Pod System (Auto - Sequential)
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 2. Direct Staff Assignment */}
                              {(!activeBranch || !!(activeBranch.allowNone ?? activeBranch.allow_none)) && recruitersList && recruitersList.length > 0 && (
                                <div className="space-y-1">
                                  <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-50/80 dark:bg-slate-800/50 rounded">
                                    Direct Staff Assignment
                                  </div>
                                  {recruitersList
                                    .filter((rec: any) => {
                                      if (!assignmentSearch.trim()) return true;
                                      const q = assignmentSearch.toLowerCase();
                                      const name = (rec.fullName || rec.name || "").toLowerCase();
                                      const email = (rec.email || "").toLowerCase();
                                      const role = getUserRoleLabel(rec).toLowerCase();
                                      return name.includes(q) || email.includes(q) || role.includes(q);
                                    })
                                    .map((rec: any) => {
                                      const name = rec.fullName || rec.name || "User";
                                      const roleLabel = getUserRoleLabel(rec);
                                      const isSelected = selectedPodId === `rec:${rec.id}`;
                                      return (
                                        <div
                                          key={`rec:${rec.id}`}
                                          onClick={() => {
                                            setSelectedPodId(`rec:${rec.id}`);
                                            setSelectedApproverRole("PRIMARY_RECRUITER");
                                            setSelectedApproverId(rec.id);
                                            setIsAssignmentOpen(false);
                                          }}
                                          className={cn(
                                            "px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between text-xs",
                                            isSelected && "bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60"
                                          )}
                                        >
                                          <div className="flex flex-col text-left">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-semibold text-neutral-900 dark:text-white">{name}</span>
                                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                                                [{roleLabel}]
                                              </span>
                                            </div>
                                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal mt-0.5">
                                              {rec.email}
                                            </span>
                                          </div>
                                          {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}

                              {/* 3. Assign to */}
                              {(!activeBranch || ((activeBranch.allowAll ?? activeBranch.allow_all) === true) || ((activeBranch.allowUnassigned ?? activeBranch.allow_unassigned) === true)) && !(activeBranch?.allowNone ?? activeBranch?.allow_none) && (
                                <div className="space-y-1">
                                  <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-50/80 dark:bg-slate-800/50 rounded">
                                    Assign to
                                  </div>
                                  {(!activeBranch || ((activeBranch.allowAll ?? activeBranch.allow_all) === true)) && (
                                    <div
                                      onClick={() => {
                                        setSelectedPodId("all");
                                        setSelectedApproverRole("BRANCH_ADMIN");
                                        setSelectedApproverId("");
                                        setIsAssignmentOpen(false);
                                      }}
                                      className={cn(
                                        "px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between text-xs",
                                        selectedPodId === "all" && "bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60"
                                      )}
                                    >
                                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">All recruiters</span>
                                      {selectedPodId === "all" && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                                    </div>
                                  )}
                                  {(!activeBranch || ((activeBranch.allowUnassigned ?? activeBranch.allow_unassigned) === true)) && (
                                    <div
                                      onClick={() => {
                                        setSelectedPodId("none");
                                        setSelectedApproverRole("BRANCH_ADMIN");
                                        setSelectedApproverId("");
                                        setIsAssignmentOpen(false);
                                      }}
                                      className={cn(
                                        "px-2.5 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between text-xs",
                                        selectedPodId === "none" && "bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60"
                                      )}
                                    >
                                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">Unassigned Allocation (Hold for Manager Assignment)</span>
                                      {selectedPodId === "none" && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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

      
      {/* Add POC Dialog */}
      <Dialog open={addPocOpen} onOpenChange={setAddPocOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Add New Point of Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="poc-name" className="text-xs font-bold text-neutral-700">Name <span className="text-red-500">*</span></Label>
              <Input id="poc-name" value={newPocName} onChange={e => setNewPocName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Suresh Kumar" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poc-desig" className="text-xs font-bold text-neutral-700">Designation</Label>
              <Input id="poc-desig" value={newPocDesignation} onChange={e => setNewPocDesignation(e.target.value)} className="h-8 text-xs" placeholder="e.g. HR Manager" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poc-email" className="text-xs font-bold text-neutral-700">Email</Label>
              <Input id="poc-email" type="email" value={newPocEmail} onChange={e => setNewPocEmail(e.target.value)} className="h-8 text-xs" placeholder="suresh@company.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="poc-phone" className="text-xs font-bold text-neutral-700">Phone</Label>
              <Input id="poc-phone" value={newPocPhone} onChange={e => setNewPocPhone(e.target.value)} className="h-8 text-xs" placeholder="+91-9876543210" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddPocOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button onClick={async () => {
              if (!newPocName || !selectedClientId) return;
              try {
                const res = await atsApi.clients?.createContact  
                  ? atsApi.clients.createContact(selectedClientId, { name: newPocName, designation: newPocDesignation, email: newPocEmail, phone: newPocPhone })
                  : fetch(`/api/ats/clients/${selectedClientId}/contacts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(window as any).__ats_token || ''}` },
                  body: JSON.stringify({
                    name: newPocName, designation: newPocDesignation, email: newPocEmail, phone: newPocPhone
                  })
                });
                if (res.ok) {
                  const newContact = await res.json();
                  setPocList(prev => ({ ...prev, myContacts: [newContact, ...prev.myContacts] }));
                  setSelectedPocId(newContact.id);
                  setAddPocOpen(false);
                  setNewPocName(''); setNewPocDesignation(''); setNewPocEmail(''); setNewPocPhone('');
                }
              } catch (err) {}
            }} className="h-8 text-xs" disabled={!newPocName}>Save Contact</Button>
          </div>
        </DialogContent>
      </Dialog>
\n\n      <AddClientModal
        open={addClientModalOpen}
        onOpenChange={(open) => {
          setAddClientModalOpen(open);
          if (!open) {
            setPrefilledClientName("");
          }
        }}
        initialClientName={prefilledClientName}
        onClientAdded={(clientName) => {
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
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{publishingModalState.jobType || "Full Time"} • {publishingModalState.location || "Remote"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Positions & Pay Rate</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{publishingModalState.positions || 1} Pos • {publishingModalState.payRate || "N/A"}</span>
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

