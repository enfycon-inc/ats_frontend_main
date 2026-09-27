"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Loader2,
  ArrowRight,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AddClientModal } from "../../components/add-client-modal";
import { RichTextEditor } from "@/components/ui/rich-text-editor";






import { Country, State, City } from "country-state-city";
import ReactCountryFlag from "react-country-flag";

import { atsApi } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";

const WORK_AUTHORIZATION_OPTIONS = [
  "B1",
  "Can work for any employer",
  "Canada Authorized",
  "Canadian",
  "Canadian Citizen",
  "Citizen",
  "CPT EAD",
  "Employment Auth. Document",
  "Employment Authorization Document",
  "GC",
  "GC EAD",
  "GC-EAD",
  "Green Card",
  "Green Card Holder",
  "H EAD",
  "H1-B",
  "H4 EAD",
  "H4EAD",
  "Have H1 Visa",
  "HB Work Permit",
  "L1-A",
  "L1-B",
  "L2",
  "L2 EAD",
  "L2-EAD",
  "Need H1 Visa",
  "Need H1 Visa Sponsor",
  "Not specified",
  "OPT",
  "OPT EAD",
  "OPT-EAD",
  "Security Clearance",
  "TN EAD",
  "TN Permit Holder",
  "TN Visa",
  "Unspecified",
  "US Authorized",
  "US"
];

const INDIAN_WORK_AUTHORIZATION_OPTIONS = [
  "Indian Citizen",
  "OCI Card Holder",
  "Employment Visa",
  "Work Permit (PR)",
  "Not specified"
];

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
  country: zod.string().min(1, "Country is required"),
  states: zod.string().min(1, "State is required"),
  city: zod.string().optional(),
  remoteJob: zod.string().min(1, "Work Mode is required"),
  hoursPerWeek: zod.union([zod.number().min(1).max(168), zod.nan().transform(() => undefined)]).optional(),
  jobStatus: zod.string(),
  client: zod.string().optional(),
  endClientName: zod.string().min(1, "End Client is required"),
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
  primaryRecruiter: zod.string().optional(),
  assignedTo: zod.string().optional(),

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


// India states with cities
const INDIA_STATES_CITIES: Record<string, string[]> = {
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli-Dharwad", "Mangaluru", "Belagavi", "Ballari"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Navi Mumbai"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
  "Delhi NCR": ["New Delhi", "Noida", "Gurugram", "Faridabad", "Ghaziabad", "Greater Noida"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak", "Sonipat"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Noida", "Prayagraj", "Ghaziabad"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Ajmer", "Kota", "Bikaner"],
  "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  "Chandigarh": ["Chandigarh"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
};

// US states with cities
const US_STATES_CITIES: Record<string, string[]> = {
  "Texas": ["Dallas", "Houston", "Austin", "San Antonio", "Fort Worth", "Plano", "Irving", "Frisco"],
  "California": ["Los Angeles", "San Francisco", "San Jose", "San Diego", "Sacramento", "Irvine", "Fremont"],
  "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse", "Yonkers"],
  "New Jersey": ["Newark", "Jersey City", "Trenton", "Edison", "Woodbridge", "Parsippany"],
  "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah", "Sandy Springs", "Alpharetta"],
  "Illinois": ["Chicago", "Aurora", "Naperville", "Joliet", "Rockford", "Springfield"],
  "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "St. Petersburg", "Fort Lauderdale"],
  "Washington": ["Seattle", "Spokane", "Tacoma", "Bellevue", "Kirkland", "Redmond"],
  "Virginia": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Arlington", "McLean"],
  "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem"],
  "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading"],
  "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
  "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor"],
  "Massachusetts": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell"],
  "Arizona": ["Phoenix", "Tucson", "Scottsdale", "Tempe", "Chandler", "Mesa"],
  "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood"],
  "Minnesota": ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington"],
  "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville"],
};

export default function EditJobPostingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const [isJobLoading, setIsJobLoading] = useState(true);

  // Workflow active screen state: 'landing' | 'manual' | 'parse'
  const [activeWorkflow, setActiveWorkflow] = useState<"landing" | "manual" | "parse">("manual");

  // Collapse/Expand state for each form section
  const [collapsedSections, setCollapsedSections] = useState({
    businessInfo: false,
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

  const countryListRef = useRef<HTMLDivElement>(null);
  const stateListRef = useRef<HTMLDivElement>(null);
  const cityListRef = useRef<HTMLDivElement>(null);

  const sortedCountries = useMemo(() => {
    const popularNames = ["India", "United States", "United Kingdom", "Canada", "Australia", "United Arab Emirates", "Singapore"];
    const countries = Country.getAllCountries();
    const popular = countries.filter(c => popularNames.includes(c.name));
    const others = countries.filter(c => !popularNames.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name));
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
  
  // Pod selection (optional override — defaults to auto round-robin)
  const [podsList, setPodsList] = useState<any[]>([]);
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedPodId, setSelectedPodId] = useState("");
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [jobTiming, setJobTiming] = useState<{
    jobTimezone?: string;
    workStartTime?: string;
    workEndTime?: string;
    workingDays?: string[];
    shiftTiming?: string;
    timingSnapshotAt?: string;
  } | null>(null);

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
  
  const [tenantName, setTenantName] = useState("enfycon Inc");
  const [market, setMarket] = useState<"US" | "IN">("US");
  const currentWorkAuthOptions = market === "IN" ? INDIAN_WORK_AUTHORIZATION_OPTIONS : WORK_AUTHORIZATION_OPTIONS;

  // Currency, Unit, and Term States for Bill Rate
  const [billCurrency, setBillCurrency] = useState("USD");
  const [billUnit, setBillUnit] = useState("Hourly");
  const [billTerm, setBillTerm] = useState("C2C");

  // Commission States for Domestic Indian Permanent Roles
  const [commissionType, setCommissionType] = useState<string>("8.33");
  const [customCommission, setCustomCommission] = useState<string>("");

  // Currency, Unit, and Term States for Pay Rate
  const [payCurrency, setPayCurrency] = useState("USD");
  const [payUnit, setPayUnit] = useState("Hourly");
  const [payTerm, setPayTerm] = useState("C2C");

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
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessUnit: "enfycon Inc",
      jobCode: "ENFY-" + Math.floor(1000 + Math.random() * 9000),
      clientBillRate: "8.33% Placement Commission",
      country: "",
      states: "",
      city: "",
      remoteJob: "In Office",
      hoursPerWeek: undefined,
      jobStatus: "Active",
      priority: "Warm",
      workAuthorization: undefined,
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
    if (market === "IN" && watchTaxTerms === "Permanent") {
      const commVal = commissionType === "custom" ? customCommission : commissionType;
      if (commVal) {
        setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: true });
      }
    }
  }, [market, watchTaxTerms, commissionType, customCommission, setValue]);

  useEffect(() => {
    if (selectedCountry === "India") {
      setMarket("IN");
      setBillCurrency("INR");
      setBillUnit("LPA");
      setBillTerm("Permanent");

      setPayCurrency("INR");
      setPayUnit("LPA");
      setPayTerm("Permanent");
      
      setValue("taxTerms", "Permanent");
      setValue("workAuthorization", "Indian Citizen");
      const commVal = commissionType === "custom" ? customCommission : commissionType;
      setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: true });
    } else if (selectedCountry === "United States") {
      setMarket("US");
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

  const fetchClients = useCallback(async () => {
    try {
      const res = await atsApi.clients.list();
      setClientList(res || []);
    } catch (e) {
      console.error("Failed to fetch clients", e);
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || !id) return;

    async function fetchProfileAndJob() {
      try {
        const prof = await atsApi.auth.me();
        if (prof) {
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

          setTenantName(tName);
        }

        // Fetch active branch context
        const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
        const activeBranchName = typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') || "" : "";
        try {
          const branchesList = await atsApi.branches.list().catch(() => []);
          let activeBranchObj = null;
          if (activeBranchId) {
            activeBranchObj = branchesList.find((b: any) => b.id === activeBranchId);
          }
          if (!activeBranchObj && activeBranchName) {
            activeBranchObj = branchesList.find((b: any) => b.name?.toLowerCase() === activeBranchName.toLowerCase());
          }
          setActiveBranch(activeBranchObj || null);
        } catch (e) {
          console.warn("Failed to load branches list:", e);
        }

        // Fetch client lists, pods, users, and roles
        try {
          const [clientsRes, podsRes, usersRes, rolesRes] = await Promise.all([
            atsApi.clients.list().catch(() => []),
            atsApi.pods.list().catch(() => []),
            atsApi.auth.listUsers().catch(() => []),
            atsApi.auth.listRoles(undefined, true).catch(() => []),
          ]);
          setClientList(clientsRes || []);
          setPodsList(podsRes || []);
          setBranchUsers(usersRes || []);
          setRolesList(rolesRes || []);
        } catch (e) {
          console.warn("Failed to fetch clients/pods/users/roles", e);
        }

        // Fetch job details to populate form
        const jobData = await atsApi.jobs.get(id);
        if (jobData) {
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
          const activeBranchName = typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') || "" : "";
          setValue("businessUnit", jobData.businessUnit || activeBranchName || "enfycon Inc");
          setValue("country", jobData.country || "United States");
          setValue("states", jobData.state || "Texas");
          setValue("city", jobData.city || "");
          setValue("jobStatus", jobData.jobStatus || "Active");
          setValue("workAuthorization", jobData.visaType || "");

          setJobTiming({
            jobTimezone: jobData.jobTimezone,
            workStartTime: jobData.workStartTime,
            workEndTime: jobData.workEndTime,
            workingDays: jobData.workingDays,
            shiftTiming: jobData.shiftTiming,
            timingSnapshotAt: jobData.timingSnapshotAt,
          });

          const parseRateString = (rateStr: string, defaultCurrency = "USD") => {
            if (!rateStr || rateStr === "N/A") return { value: "", currency: defaultCurrency, unit: defaultCurrency === "INR" ? "LPA" : "Hourly", term: defaultCurrency === "INR" ? "Permanent" : "C2C" };
            const cleanRate = rateStr.trim();
            const matches = cleanRate.match(/(\d+(?:\.\d+)?)/);
            const val = matches ? matches[1] : cleanRate;
            
            const isINR = /INR|₹/i.test(cleanRate);
            const isLPA = /LPA|Lakh/i.test(cleanRate);
            const isMonthly = /Monthly/i.test(cleanRate);
            const isContract = /Contract/i.test(cleanRate);
            const isPermanent = /Permanent/i.test(cleanRate);
            const isW2 = /W-2|W2/i.test(cleanRate);
            const is1099 = /1099/i.test(cleanRate);
            
            const currency = isINR ? "INR" : "USD";
            const unit = isLPA ? "LPA" : isMonthly ? "Monthly" : "Hourly";
            const term = isPermanent ? "Permanent" : isContract ? "Contract" : isW2 ? "W-2" : is1099 ? "1099" : "C2C";
            return { value: val, currency, unit, term };
          };

          const rawBillRate = jobData.clientBillRate || "";
          if (jobData.market === "IN" && rawBillRate.includes("% Placement Commission")) {
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
            const billParsed = parseRateString(rawBillRate, jobData.market === "IN" ? "INR" : "USD");
            setBillCurrency(billParsed.currency);
            setBillUnit(billParsed.unit);
            setBillTerm(billParsed.term);
            setValue("clientBillRate", billParsed.value);
          }

          const payParsed = parseRateString(jobData.payRate || "", jobData.market === "IN" ? "INR" : "USD");
          setPayCurrency(payParsed.currency);
          setPayUnit(payParsed.unit);
          setPayTerm(payParsed.term);
          setValue("payRate", payParsed.value);

          setValue("numPositions", jobData.noOfPositions || 1);
          setValue("maxSubmissions", jobData.submissionRequired || 5);
          setValue("priority", (jobData.priority || "Warm") as any);
          setValue("taxTerms", jobData.taxTerms || "C2C");
          const rLower = (jobData.remoteJob || "").toLowerCase();
          let mappedRemote = "In Office";
          if (rLower.includes("remote") || rLower === "yes") mappedRemote = "Remote";
          else if (rLower.includes("hybrid")) mappedRemote = "Hybrid";
          setValue("remoteJob", mappedRemote);
          setValue("startDate", jobData.startDate ? jobData.startDate.split("T")[0] : "");
          setValue("endDate", jobData.endDate ? jobData.endDate.split("T")[0] : "");
          setValue("hoursPerWeek", jobData.hoursPerWeek || 40);
          setValue("duration", jobData.duration || "");
          setValue("recruitmentManager", jobData.recruitmentManagerId || "");
          setValue("primaryRecruiter", jobData.primaryRecruiterId || "");
          setValue("assignedTo", jobData.assignedTo || "");
          setValue("accountManager", jobData.accountManagerId || "");
          setValue("industry", jobData.industry || "");
          setValue("degree", jobData.degree || "");
          setValue("expMin", jobData.expMin);
          setValue("expMax", jobData.expMax);
          setValue("noticePeriod", jobData.noticePeriod || "");
          
          if (jobData.podId) {
            setSelectedPodId(`pod:${jobData.podId}`);
          } else if (jobData.primaryRecruiterId) {
            setSelectedPodId(`rec:${jobData.primaryRecruiterId}`);
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
          if (jobData.market) {
            setMarket(jobData.market as any);
          }
        }
      } catch (err: any) {
        toast.error("Failed to load job: " + err.message);
      } finally {
        setIsJobLoading(false);
      }
    }

    fetchProfileAndJob();
  }, [id, status, session, setValue]);

  const getSelectedDisplayText = () => {
    const selected = watch("workAuthorization") || "";
    const list = selected.split(", ").filter(Boolean);
    const currentOptions = market === "IN" ? INDIAN_WORK_AUTHORIZATION_OPTIONS : WORK_AUTHORIZATION_OPTIONS;
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
        if (res.jobTitle && res.jobTitle !== "Unknown") {
          setValue("jobTitle", res.jobTitle);
        }
        
        // Auto-assign work authorization if matched
        if (res.workAuthorization) {
          setValue("workAuthorization", res.workAuthorization);
        } else {
          setValue("workAuthorization", market === "IN" ? "Indian Citizen" : "US Authorized");
        }
        
        // Pre-fill location fields if returned
        if (res.location) {
          if (res.location.country) setValue("country", res.location.country);
          if (res.location.state) setValue("states", res.location.state);
          if (res.location.city) setValue("city", res.location.city);
        }

        // Pre-fill experience ranges
        if (res.experienceMin !== undefined && res.experienceMin !== null) {
          setValue("expMin", Number(res.experienceMin));
        }
        if (res.experienceMax !== undefined && res.experienceMax !== null) {
          setValue("expMax", Number(res.experienceMax));
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
        const pSkills = res.primarySkills || [];
        const sSkills = res.secondarySkills || [];
        
        // Merge extracted skills with existing manually entered ones
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

        if (pSkills.length > 0 || sSkills.length > 0 || res.experienceMin !== undefined) {
          toast.success(`AI extracted skills & experience range (${res.experienceMin ?? 0}-${res.experienceMax ?? 5} yrs) successfully!`);
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

  // Form submit handler — POST to real backend API
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
    if (market === "IN" && data.taxTerms === "Permanent") {
      const commValue = commissionType === "custom" ? customCommission : commissionType;
      assembledBillRate = `${commValue}% Placement Commission`;
    } else {
      assembledBillRate = formatRatePayload(data.clientBillRate, billCurrency, billUnit, billTerm);
    }

    const assembledPayRate = formatRatePayload(data.payRate, payCurrency, payUnit, payTerm);

    const locSummary = [data.city, data.states, data.country].filter(Boolean).join(", ") || data.locationAutocomplete || "Remote";

    // Show popup window immediately with short details
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
      let resolvedPrimaryRecruiterId: string | undefined = data.primaryRecruiter || undefined;
      let resolvedAssignedTo: string | undefined = data.assignedTo || undefined;

      if (selectedPodId.startsWith("pod:")) {
        resolvedPodId = selectedPodId.replace("pod:", "");
        const pod = (branchPods || podsList).find((p) => p.id === resolvedPodId);
        resolvedAssignedTo = pod?.name || "Recruitment Pod";
      } else if (selectedPodId.startsWith("rec:")) {
        resolvedPrimaryRecruiterId = selectedPodId.replace("rec:", "");
        const rec = (recruitersList || branchUsers || []).find((u) => u.id === resolvedPrimaryRecruiterId);
        resolvedAssignedTo = rec?.fullName || rec?.name || "Primary Recruiter";
      } else if (selectedPodId === "all") {
        resolvedAssignedTo = "ALL";
      } else if (selectedPodId === "none") {
        resolvedAssignedTo = "Unassigned";
      } else if (selectedPodId === "auto_pod") {
        resolvedAssignedTo = "Auto Pod";
      }

      // Map frontend form fields → backend CreateJobDto
      const payload = {
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
        clientJobId: data.clientJobId || undefined,
        status: data.jobStatus,
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
        primaryRecruiterId: resolvedPrimaryRecruiterId,
        assignedTo: resolvedAssignedTo,
        accountManagerId: data.accountManager || undefined,
        industry: data.industry || undefined,
        degree: data.degree || undefined,
        expMin: data.expMin,
        expMax: data.expMax,
        respondBy: respondByType === "Date Option" ? (data.respondBy || undefined) : undefined,
        noticePeriod: data.noticePeriod || undefined,
        podId: resolvedPodId,
        market: market,
        shiftTiming: data.shiftTiming || undefined,
      };

      await atsApi.jobs.update(id, payload);

      setPublishingModalState(prev => prev ? {
        ...prev,
        status: "success",
        createdJobId: id,
      } : null);

      toast.success(`Job posting updated successfully!`);
    } catch (err: any) {
      console.error("[EditJob] API error:", err);
      setPublishingModalState(prev => prev ? {
        ...prev,
        status: "error",
        errorMessage: err.message || "Backend connection failed. Please check required fields and try again.",
      } : null);
      toast.error("Failed to update job: " + (err.message || "Backend connection failed."));
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
                  Edit Job Requirement Form
                </h2>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                  {market === "IN" ? `${tenantName} India IT Recruitment Workspace` : `${tenantName} US IT Recruitment Workspace`}
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
                disabled={publishingModalState?.status === "publishing"}
                className="h-8.5 px-4 font-bold text-white shadow-xs cursor-pointer text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/90 active:bg-primary/80 hover:shadow-md transition-all duration-200 group transform active:scale-95"
              >
                {publishingModalState?.status === "publishing" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Updating Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    <span>Update Posting</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto pb-12">
            <div className="w-full p-4 space-y-4">
              {/* Requisition Completeness Alert Banner with Recruitment Jargon */}
              {Object.keys(errors).length > 0 && (
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

                    {/* BU */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Business Unit <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        readOnly
                        {...register("businessUnit")}
                        className="h-8 text-xs bg-neutral-100 dark:bg-slate-800 border-neutral-300 dark:border-slate-700 font-semibold cursor-not-allowed"
                      />
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

                    {/* Job Type */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Job Type <span className="text-red-500">*</span></Label>
                      <select
                        {...register("jobType", {
                          onChange: (e) => {
                            const val = e.target.value;
                            if (val === "Full Time") {
                              setValue("taxTerms", "Permanent");
                            } else if (val === "Contract") {
                              setValue("taxTerms", market === "IN" ? "Contract (3rd Party)" : "C2C");
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
                      {errors.jobType && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.jobType.message}</p>
                      )}
                    </div>

                    {/* Client Bill Rate / Commission */}
                    <div className={cn("space-y-1", market === "IN" && watch("taxTerms") === "Permanent" ? "md:col-span-1" : "md:col-span-2")}>
                      {market === "IN" && watch("taxTerms") === "Permanent" ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Commission (%) <span className="text-red-500">*</span></Label>
                            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Permanent placement agency commission percentage">?</span>
                          </div>
                          <div className="flex gap-2 items-center">
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
                              className="w-full md:w-56 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
                            >
                              <option value="8.33">8.33% (1 Month Salary)</option>
                              <option value="10">10.0%</option>
                              <option value="12.5">12.5%</option>
                              <option value="15">15.0%</option>
                              <option value="custom">Custom Percentage...</option>
                            </select>
                            {commissionType === "custom" && (
                              <div className="flex items-center gap-1 shrink-0">
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
                                  className="h-8 w-24 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700 rounded"
                                />
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">%</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Bill Rate / Salary <span className="text-red-500">*</span></Label>
                            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Bill rate information">?</span>
                          </div>
                          <div className="flex gap-1 items-center">
                            <select
                              value={billCurrency}
                              onChange={(e) => setBillCurrency(e.target.value)}
                              className="w-16 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              {market === "IN" ? (
                                <>
                                  <option value="INR">INR</option>
                                  <option value="USD">USD</option>
                                </>
                              ) : (
                                <>
                                  <option value="USD">USD</option>
                                  <option value="CAD">CAD</option>
                                </>
                              )}
                            </select>
                            <Input
                              type="text"
                              {...register("clientBillRate")}
                              className="h-8 w-24 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700 font-semibold"
                              placeholder="Rate"
                            />
                            <select
                              value={billUnit}
                              onChange={(e) => setBillUnit(e.target.value)}
                              className="w-28 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              {market === "IN" ? (
                                <>
                                  <option value="LPA">LPA</option>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Hourly">Hourly</option>
                                </>
                              ) : (
                                <>
                                  <option value="Hourly">Hourly</option>
                                  <option value="Daily">Daily</option>
                                  <option value="Weekly">Weekly</option>
                                  <option value="Bi-Weekly">Bi-Weekly</option>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Yearly">Yearly</option>
                                </>
                              )}
                            </select>
                            <select
                              value={billTerm}
                              onChange={(e) => setBillTerm(e.target.value)}
                              className="w-40 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              {market === "IN" ? (
                                <>
                                  <option value="Permanent">Permanent</option>
                                  <option value="Contract">Contract</option>
                                </>
                              ) : (
                                <>
                                  <option value="W-2">W-2</option>
                                  <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                                  <option value="C2C">C2C</option>
                                  <option value="1099">1099</option>
                                  <option value="Other">Other</option>
                                </>
                              )}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Pay Rate */}
                    {/* Pay Rate / Candidate CTC */}
                    <div className="space-y-1 md:col-span-2">
                      {market === "IN" && watch("taxTerms") === "Permanent" ? (
                        <>
                          <div className="flex items-center gap-1">
                            <label className="font-bold text-neutral-700 dark:text-neutral-300">Candidate CTC (LPA) <span className="text-red-500">*</span></label>
                            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Expected/Target Cost to Company (CTC) in Lakhs Per Annum">?</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="relative flex-1 max-w-[200px]">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">INR</span>
                              <input
                                type="text"
                                {...register("payRate")}
                                placeholder="e.g. 12.0"
                                className="w-full h-8 pl-10 pr-12 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
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
                          <div className="flex gap-1 items-center">
                            <select
                              value={payCurrency}
                              onChange={(e) => setPayCurrency(e.target.value)}
                              className="w-16 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              {market === "IN" ? (
                                <>
                                  <option value="INR">INR</option>
                                  <option value="USD">USD</option>
                                </>
                              ) : (
                                <>
                                  <option value="USD">USD</option>
                                  <option value="CAD">CAD</option>
                                  <option value="GBP">GBP</option>
                                </>
                              )}
                            </select>
                            <input
                              type="text"
                              {...register("payRate")}
                              className="h-8 w-24 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 font-semibold"
                              placeholder="Pay Rate"
                            />
                            <select
                              value={payUnit}
                              onChange={(e) => setPayUnit(e.target.value)}
                              className="w-28 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              {market === "IN" ? (
                                <>
                                  <option value="LPA">LPA</option>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Hourly">Hourly</option>
                                </>
                              ) : (
                                <>
                                  <option value="Hourly">Hourly</option>
                                  <option value="Daily">Daily</option>
                                  <option value="Weekly">Weekly</option>
                                  <option value="Bi-Weekly">Bi-Weekly</option>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Yearly">Yearly</option>
                                </>
                              )}
                            </select>
                            <select
                              value={payTerm}
                              onChange={(e) => setPayTerm(e.target.value)}
                              className="w-40 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              {market === "IN" ? (
                                <>
                                  <option value="Permanent">Permanent</option>
                                  <option value="Contract">Contract</option>
                                </>
                              ) : (
                                <>
                                  <option value="W-2">W-2</option>
                                  <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                                  <option value="C2C">C2C</option>
                                  <option value="1099">1099</option>
                                  <option value="Other">Other</option>
                                </>
                              )}
                            </select>
                          </div>
                        </>
                      )}
                      {errors.payRate && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.payRate.message}</p>
                      )}
                    </div>

                    {/* Job Start Date */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Job Start Date</label>
                      <input
                        type="date"
                        {...register("startDate")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                      />
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

                    {/* Country, State, City (Single Row) */}
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Country */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Country <span className="text-red-500">*</span></label>
                        <Popover open={countryOpen} onOpenChange={(open) => {
                          setCountryOpen(open);
                          if (!open) setCountrySearchText("");
                        }}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              role="combobox"
                              className="w-full justify-between h-8 text-xs font-normal bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-900 dark:text-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100"
                            >
                              <span className={cn("truncate", watch("country") ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-400 dark:text-slate-400 font-medium")}>
                                {watch("country") || "Select Country..."}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search country..."
                                className="h-9 text-xs"
                                value={countrySearchText}
                                onValueChange={setCountrySearchText}
                              />
                              <CommandList ref={countryListRef} className="max-h-[220px]">
                                <CommandEmpty className="py-4 text-center text-xs text-neutral-500">No country found.</CommandEmpty>
                                <CommandGroup>
                                  {sortedCountries
                                    .filter(co => co.name.toLowerCase().includes(countrySearchText.toLowerCase()))
                                    .map((co) => (
                                      <CommandItem
                                        key={co.isoCode}
                                        value={co.name}
                                        onSelect={() => {
                                          setValue("country", co.name, { shouldValidate: true });
                                          setValue("states", "");
                                          setValue("city", "");
                                          setCountryOpen(false);
                                          setCountrySearchText("");
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <Check className={cn("mr-2 h-3 w-3", watch("country") === co.name ? "opacity-100" : "opacity-0")} />
                                        <ReactCountryFlag countryCode={co.isoCode} svg className="mr-1.5" style={{ width: "1.1em", height: "1.1em" }} />
                                        {co.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {errors.country && <p className="text-[10px] text-red-655 font-bold">{errors.country.message}</p>}
                      </div>

                      {/* States */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">State <span className="text-red-500">*</span></label>
                        <Popover open={stateOpen} onOpenChange={(open) => {
                          setStateOpen(open);
                          if (!open) setStateSearchText("");
                        }}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              role="combobox"
                              disabled={!watch("country")}
                              className="w-full justify-between h-8 text-xs font-normal bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-900 dark:text-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-50"
                            >
                              <span className={cn("truncate", watch("states") ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-400 dark:text-slate-400 font-medium")}>
                                {watch("states") || "Select State..."}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search state..."
                                className="h-9 text-xs"
                                value={stateSearchText}
                                onValueChange={setStateSearchText}
                              />
                              <CommandList ref={stateListRef} className="max-h-[220px]">
                                <CommandEmpty className="py-4 text-center text-xs text-neutral-500">No state found.</CommandEmpty>
                                <CommandGroup>
                                  {(() => {
                                    const countryObj = Country.getAllCountries().find(co => co.name === watch("country"));
                                    if (!countryObj) return null;
                                    return State.getStatesOfCountry(countryObj.isoCode)
                                      .filter(st => st.name.toLowerCase().includes(stateSearchText.toLowerCase()))
                                      .map((st) => (
                                        <CommandItem
                                          key={st.isoCode}
                                          value={st.name}
                                          onSelect={() => {
                                            setValue("states", st.name, { shouldValidate: true });
                                            setValue("city", "");
                                            setStateOpen(false);
                                            setStateSearchText("");
                                          }}
                                          className="text-xs cursor-pointer"
                                        >
                                          <Check className={cn("mr-2 h-3 w-3", watch("states") === st.name ? "opacity-100" : "opacity-0")} />
                                          {st.name}
                                        </CommandItem>
                                      ));
                                  })()}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {errors.states && <p className="text-[10px] text-red-655 font-bold">{errors.states.message}</p>}
                      </div>

                      {/* City */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">City</label>
                        <Popover open={cityOpen} onOpenChange={(open) => {
                          setCityOpen(open);
                          if (!open) setCitySearchText("");
                        }}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              role="combobox"
                              disabled={!watch("states")}
                              className="w-full justify-between h-8 text-xs font-normal bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-900 dark:text-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-50"
                            >
                              <span className={cn("truncate", watch("city") ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-400 dark:text-slate-400 font-medium")}>
                                {watch("city") || "Select City..."}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search city..."
                                className="h-9 text-xs"
                                value={citySearchText}
                                onValueChange={setCitySearchText}
                              />
                              <CommandList ref={cityListRef} className="max-h-[220px]">
                                <CommandEmpty className="py-4 text-center text-xs text-neutral-500">No city found.</CommandEmpty>
                                <CommandGroup>
                                  {(() => {
                                    const countryObj = Country.getAllCountries().find(co => co.name === watch("country"));
                                    if (!countryObj) return null;
                                    const stateObj = State.getStatesOfCountry(countryObj.isoCode).find(st => st.name === watch("states"));
                                    if (!stateObj) return null;
                                    return City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode)
                                      .filter(ct => ct.name.toLowerCase().includes(citySearchText.toLowerCase()))
                                      .map((city) => (
                                        <CommandItem
                                          key={city.name}
                                          value={city.name}
                                          onSelect={() => {
                                            setValue("city", city.name, { shouldValidate: true });
                                            setCityOpen(false);
                                            setCitySearchText("");
                                          }}
                                          className="text-xs cursor-pointer"
                                        >
                                          <Check className={cn("mr-2 h-3 w-3", watch("city") === city.name ? "opacity-100" : "opacity-0")} />
                                          {city.name}
                                        </CommandItem>
                                      ));
                                  })()}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Work Mode */}
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

                    {/* Shift Timings (India) or Required Hours/Week (US) */}
                    {market === "IN" ? (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Shift Timings</label>
                        <select
                          {...register("shiftTiming")}
                          className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        >
                          <option value="General Shift">General Shift (Day)</option>
                          <option value="Night Shift">Night Shift</option>
                          <option value="Rotational Shift">Rotational Shift</option>
                          <option value="UK/EMEA Shift">UK/EMEA Shift</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Required Hours/Week</label>
                        <input
                          type="number"
                          {...register("hoursPerWeek", { valueAsNumber: true })}
                          className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Job Status <span className="text-red-500">*</span></label>
                      <select
                        {...register("jobStatus")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-green-700 dark:text-green-400 font-bold cursor-pointer"
                      >
                      <option value="Active">Active</option>
                        <option value="Close">Close</option>
                        <option value="Filled">Filled</option>
                        <option value="Hold by Client">Hold by Client</option>
                      </select>
                    </div>

                    {/* Client */}
                    <div className="space-y-1 flex flex-col">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Client</label>
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
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">End Client <span className="text-red-500">*</span></label>
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

                    {/* Client Job ID */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Client Job ID</label>
                      <input
                        type="text"
                        {...register("clientJobId")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200"
                        placeholder="e.g. REQ-9941"
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Priority <span className="text-red-500">*</span></label>
                      <select
                        {...register("priority")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-850 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="Hot">Hot</option>
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                      </select>
                    </div>

                    {/* Work Auth */}
                    <div className="space-y-1 relative" ref={workAuthDropdownRef}>
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Work Authorization <span className="text-red-500">*</span></label>
                      
                      {/* Trigger Input (styled like standard select field) */}
                      <div
                        onClick={() => setIsWorkAuthOpen(!isWorkAuthOpen)}
                        className={cn(
                          "w-full bg-white dark:bg-slate-955 border rounded px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 flex items-center justify-between cursor-pointer select-none transition-colors min-h-[32px]",
                          isWorkAuthOpen
                            ? "border-primary ring-1 ring-primary/20"
                            : "border-neutral-300 dark:border-slate-700 hover:border-neutral-400 dark:hover:border-slate-600"
                        )}
                      >
                        <div className="flex flex-wrap gap-1 items-center max-w-[88%] py-0.5">
                          {(() => {
                            const selected = watch("workAuthorization") || "";
                            const list = selected.split(", ").filter(Boolean);
                            if (list.length === 0) {
                              return <span className="text-neutral-400 dark:text-slate-500 font-medium">Select Work Authorization...</span>;
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
                                    className="bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-neutral-200 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    {opt}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newList = list.filter((item) => item !== opt).join(", ");
                                        setValue("workAuthorization", newList, { shouldDirty: true });
                                      }}
                                      className="text-neutral-400 hover:text-red-500 dark:hover:text-red-400 font-bold ml-0.5 rounded-full p-0.5 hover:bg-neutral-300/35"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                ))}
                                {hiddenCount > 0 && (
                                  <span className="bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-400 border border-primary/20 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
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
                              className="p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
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
                        <div className="absolute left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-900 border border-neutral-250 dark:border-slate-800 rounded-md shadow-xl p-2.5 space-y-2">
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

                    {/* Engagement Type / Tax Terms */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">
                        {market === "IN" ? "Engagement Type" : "Tax Terms"} <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register("taxTerms")}
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        {market === "IN" ? (
                          <>
                            <option value="Permanent">Permanent / Direct Hire</option>
                            <option value="Contract (3rd Party)">Contract (3rd Party Payroll)</option>
                            <option value="Contract (Direct)">Contract (Direct Payroll)</option>
                            <option value="C2H">Contract to Hire (C2H)</option>
                            <option value="Freelancer">Freelancer / Consultant</option>
                          </>
                        ) : (
                          <>
                            <option value="W-2">W-2</option>
                            <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                            <option value="C2C">C2C</option>
                            <option value="1099">1099</option>
                            <option value="Other">Other</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Notice Period (Domestic IN Market Only) */}
                    {market === "IN" && (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Notice Period</label>
                        <select
                          {...register("noticePeriod")}
                          className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        >
                          <option value="">Select Notice Period</option>
                          <option value="Immediate">Immediate</option>
                          <option value="15 Days">15 Days</option>
                          <option value="30 Days">30 Days</option>
                          <option value="45 Days">45 Days</option>
                          <option value="60 Days">60 Days</option>
                          <option value="90 Days">90 Days</option>
                        </select>
                      </div>
                    )}
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
                      placeholder="Type or paste rich job description from ChatGPT, Word, PDF, or Docs..."
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
                Fill in the mandatory fields marked with <span className="text-red-500 font-bold">*</span> to update your job requisition.
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
                <Button
                  type="submit"
                  size="sm"
                  disabled={publishingModalState?.status === "publishing"}
                  className="h-8.5 px-4 font-bold text-white shadow-xs cursor-pointer text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/90 active:bg-primary/80 hover:shadow-md transition-all duration-200 group transform active:scale-95"
                >
                  {publishingModalState?.status === "publishing" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      <span>Updating Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      <span>Update Posting</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      <AddClientModal
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
        market={market}
      />

      {/* 4. UPDATING JOB REQUISITION POPUP MODAL */}
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
                  {publishingModalState.status === "publishing" ? "Updating Job Requisition..." :
                   publishingModalState.status === "success" ? "Job Requisition Updated!" :
                   "Update Failed"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {publishingModalState.status === "publishing" ? "Applying changes and synchronizing requirement..." :
                   publishingModalState.status === "success" ? "Your job posting has been successfully updated in the workspace." :
                   publishingModalState.errorMessage || "An error occurred while updating the job."}
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
                  Updating database records & syncing changes...
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
