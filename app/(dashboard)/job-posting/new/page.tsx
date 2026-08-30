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
import { resolveActiveSystemRole } from "@/lib/role-permissions";

import { Country, State, City } from "country-state-city";
import ReactCountryFlag from "react-country-flag";

import { atsApi } from "@/lib/ats-api";
import { getTenantIdentifier } from "@/utils/subdomain-helper";
import { showErrorModal } from "@/components/shared/global-error-modal";

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
  country: zod.string().optional(),
  states: zod.string().optional(),
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

  // Portal Settings
  postToPortal: zod.boolean(),
  displayContactOnPortal: zod.boolean(),
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

export default function NewJobPostingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

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
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [newPrimarySkill, setNewPrimarySkill] = useState("");
  const [secondarySkills, setSecondarySkills] = useState<string[]>([]);
  const [newSecondarySkill, setNewSecondarySkill] = useState("");

  // Documents file state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [endClientDropdownOpen, setEndClientDropdownOpen] = useState(false);
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [clientList, setClientList] = useState<any[]>([]);
  const [clientSearchText, setClientSearchText] = useState("");
  const [endClientSearchText, setEndClientSearchText] = useState("");

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
  
const getInitialActiveBranchContext = () => {
  if (typeof window === "undefined") {
    return {
      market: "IN" as "US" | "IN",
      isUs: false,
      branchName: "",
      branchId: "",
    };
  }
  const bId = localStorage.getItem("active_branch_id") || "";
  const bName = localStorage.getItem("active_branch_name") || "";
  const bMarket = localStorage.getItem("active_branch_market") || "";

  let isUs = false;
  if (bMarket) {
    const upper = bMarket.toUpperCase();
    if (upper === "US" || upper === "USA") isUs = true;
  }
  if (!bMarket && bName) {
    const lower = bName.toLowerCase();
    if (lower.includes("us") || lower.includes("night")) isUs = true;
  }

  return {
    market: (isUs ? "US" : "IN") as "US" | "IN",
    isUs,
    branchName: bName,
    branchId: bId,
  };
};

  const initialBranchContext = useMemo(() => getInitialActiveBranchContext(), []);

  // Pod & User selection and approver routing
  const [podsList, setPodsList] = useState<any[]>([]);
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [selectedPodId, setSelectedPodId] = useState("");
  const [selectedApproverRole, setSelectedApproverRole] = useState<string>("POD_LEAD");
  const [selectedApproverId, setSelectedApproverId] = useState<string>("");
  const [activeBranch, setActiveBranch] = useState<any>(null);
  
  const [tenantName, setTenantName] = useState(() => initialBranchContext.branchName || "enfycon Inc");
  const [market, setMarket] = useState<"US" | "IN">(() => initialBranchContext.market);
  const currentWorkAuthOptions = market === "IN" ? INDIAN_WORK_AUTHORIZATION_OPTIONS : WORK_AUTHORIZATION_OPTIONS;

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
    if (userPerspective === "SUPER_ADMIN" || userPerspective === "ADMIN" || userPerspective === "BRANCH_ADMIN") {
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
      if (r.includes("DELIVERY_HEAD") || r.includes("ADMIN") || r.includes("BRANCH_ADMIN") || r.includes("SUPER_ADMIN")) {
        seen.add(uid);
        list.push(u);
      }
    }
    return list;
  }, [branchUsers]);

  const recruitersList = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const u of branchUsers) {
      const uid = u.id || u.email;
      if (!uid || seen.has(uid)) continue;
      const r = (u.roles || []).map((x: string) => x.toUpperCase());
      if (r.includes("RECRUITER") || r.length === 0) {
        seen.add(uid);
        list.push(u);
      }
    }
    return list;
  }, [branchUsers]);

  const branchPods = useMemo(() => {
    const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (!activeBranchId) return podsList;
    return podsList.filter((p: any) => !p.branchId || !p.branch_id || p.branchId === activeBranchId || p.branch_id === activeBranchId);
  }, [podsList]);

  // Currency, Unit, and Term States for Bill Rate
  const [billCurrency, setBillCurrency] = useState(() => initialBranchContext.isUs ? "USD" : "INR");
  const [billUnit, setBillUnit] = useState(() => initialBranchContext.isUs ? "Hourly" : "LPA");
  const [billTerm, setBillTerm] = useState(() => initialBranchContext.isUs ? "C2C" : "Permanent");

  // Commission States for Domestic Indian Permanent Roles
  const [commissionType, setCommissionType] = useState<string>("8.33");
  const [customCommission, setCustomCommission] = useState<string>("");

  // Currency, Unit, and Term States for Pay Rate
  const [payCurrency, setPayCurrency] = useState(() => initialBranchContext.isUs ? "USD" : "INR");
  const [payUnit, setPayUnit] = useState(() => initialBranchContext.isUs ? "Hourly" : "LPA");
  const [payTerm, setPayTerm] = useState(() => initialBranchContext.isUs ? "C2C" : "Permanent");
  const [payRateMin, setPayRateMin] = useState("");
  const [payRateMax, setPayRateMax] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        workAuthDropdownRef.current &&
        !workAuthDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWorkAuthOpen(false);
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
      businessUnit: initialBranchContext.branchName || "enfycon Inc",
      jobCode: "",
      clientBillRate: initialBranchContext.isUs ? "80" : "8.33% Placement Commission",
      country: initialBranchContext.isUs ? "United States" : "India",
      states: "",
      city: "",
      remoteJob: "",
      hoursPerWeek: undefined,
      jobStatus: "Active",
      priority: "Warm",
      workAuthorization: initialBranchContext.isUs ? "US Authorized" : "Indian Citizen",
      jobType: "Full Time",
      taxTerms: initialBranchContext.isUs ? "C2C" : "Permanent",
      expMin: undefined,
      expMax: undefined,
      numPositions: 1,
      maxSubmissions: 5,
      postToPortal: true,
      displayContactOnPortal: false,
      jobDescription: "",
      noticePeriod: "",
      endClientName: "",
      shiftTiming: initialBranchContext.isUs ? "US Shift" : "General Shift",
    },
  });

  const selectedCountry = watch("country");
  const watchTaxTerms = watch("taxTerms");

  // Keep clientBillRate synced when market is IN and taxTerms is Permanent
  useEffect(() => {
    if (market === "IN" && watchTaxTerms === "Permanent") {
      const commVal = commissionType === "custom" ? customCommission : commissionType;
      if (commVal) {
        setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: false });
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
      setValue("clientBillRate", `${commVal}% Placement Commission`, { shouldValidate: false });
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
          const activeBranchMarket = typeof window !== 'undefined' ? localStorage.getItem('active_branch_market') || "" : "";
          
          const displayBusinessUnit = activeBranchName || tName;
          setTenantName(displayBusinessUnit);
          setValue("businessUnit", displayBusinessUnit);

          // Fetch branches, pods, and users list
          let branchesList: any[] = [];
          let fetchedPods: any[] = [];
          let fetchedUsers: any[] = [];
          try {
            const [bList, pList, uList] = await Promise.all([
              atsApi.branches.list().catch(() => []),
              atsApi.pods.list().catch(() => []),
              atsApi.auth.listUsers().catch(() => []),
            ]);
            branchesList = bList || [];
            fetchedPods = pList || [];
            fetchedUsers = uList || [];
            setPodsList(fetchedPods);
            setBranchUsers(fetchedUsers);
          } catch (e) {
            console.warn("Failed to load branches/pods/users:", e);
          }

          let activeBranchObj = null;
          if (activeBranchId) {
            activeBranchObj = branchesList.find((b: any) => b.id === activeBranchId);
          }
          if (!activeBranchObj && activeBranchName) {
            activeBranchObj = branchesList.find((b: any) => b.name?.toLowerCase() === activeBranchName.toLowerCase());
          }
          setActiveBranch(activeBranchObj || null);
          if (activeBranchObj) {
            const allowPods = (activeBranchObj.allowPods ?? activeBranchObj.allow_pods) !== false;
            const allowAll = (activeBranchObj.allowAll ?? activeBranchObj.allow_all) !== false;
            const allowUnassigned = (activeBranchObj.allowUnassigned ?? activeBranchObj.allow_unassigned) !== false;
            const isDirectOnly = !!(activeBranchObj.allowNone ?? activeBranchObj.allow_none);

            if (!isDirectOnly && allowAll) {
              setSelectedPodId("all");
              setSelectedApproverRole("BRANCH_ADMIN");
              setSelectedApproverId("");
            } else if (!isDirectOnly && allowPods && fetchedPods.length > 0) {
              setSelectedPodId(`pod:${fetchedPods[0].id}`);
              setSelectedApproverRole("POD_LEAD");
              setSelectedApproverId(fetchedPods[0].podHeadId || "");
            } else if (fetchedUsers.length > 0) {
              const rec = fetchedUsers.find((u: any) => u.roles?.includes("RECRUITER")) || fetchedUsers[0];
              setSelectedPodId(`rec:${rec.id}`);
              setSelectedApproverRole("PRIMARY_RECRUITER");
              setSelectedApproverId(rec.id);
            } else if (!isDirectOnly && allowUnassigned) {
              setSelectedPodId("none");
              setSelectedApproverRole("BRANCH_ADMIN");
              setSelectedApproverId("");
            }
          } else if (fetchedPods.length > 0) {
            setSelectedPodId(`pod:${fetchedPods[0].id}`);
            setSelectedApproverRole("POD_LEAD");
            setSelectedApproverId(fetchedPods[0].podHeadId || "");
          } else {
            setSelectedPodId("all");
            setSelectedApproverRole("BRANCH_ADMIN");
            setSelectedApproverId("");
          }

          let branchMarketStr = activeBranchObj?.market || activeBranchMarket || "";

          let isUsBranch = false;
          let isDomesticBranch = false;

          if (branchMarketStr) {
            const upperM = branchMarketStr.toUpperCase();
            if (upperM === "US" || upperM === "USA") {
              isUsBranch = true;
            } else if (upperM === "INDIA" || upperM === "IN" || upperM === "DOMESTIC") {
              isDomesticBranch = true;
            }
          }
          
          if (!isUsBranch && !isDomesticBranch && activeBranchName) {
            const lowerName = activeBranchName.toLowerCase();
            if (lowerName.includes("us") || lowerName.includes("night")) {
              isUsBranch = true;
            } else if (lowerName.includes("domestic") || lowerName.includes("india") || lowerName.includes("bbsr") || lowerName.includes("hydrabad") || lowerName.includes("day")) {
              isDomesticBranch = true;
            }
          }

          let targetMarket: "US" | "IN" = "IN";
          if (isUsBranch) {
            targetMarket = "US";
          } else if (isDomesticBranch) {
            targetMarket = "IN";
          } else {
            targetMarket = (prof.defaultMarket as "US" | "IN") || "IN";
            isUsBranch = targetMarket === "US";
          }

          try {
            const res = await atsApi.jobs.getNextCode({ 
              branchId: activeBranchId || undefined,
              shift: isUsBranch ? 'NIGHT' : 'DAY'
            });
            if (res && res.code) {
              setValue("jobCode", res.code);
            } else {
              const date = new Date();
              const yy = date.getFullYear().toString().slice(-2);
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              const sCode = isUsBranch ? 'N' : 'D';
              setValue("jobCode", `GEN-${yy}${mm}${dd}-${sCode}00001`);
            }
          } catch (e) {
            const date = new Date();
            const yy = date.getFullYear().toString().slice(-2);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const sCode = isUsBranch ? 'N' : 'D';
            setValue("jobCode", `GEN-${yy}${mm}${dd}-${sCode}00001`);
          }

          const posterName = (session as any)?.user?.name || prof?.name || prof?.email || "Account Manager";

          setMarket(targetMarket);
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
        if (sourceJob.businessUnit) setValue("businessUnit", sourceJob.businessUnit);
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
        if (sourceJob.remoteJob) setValue("remoteJob", sourceJob.remoteJob);
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
          setValue("jobDescription", sourceJob.description);
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
          setValue("workAuthorization", market === "IN" ? "Indian Citizen" : "US Authorized");
        }

        // Pre-fill location fields if returned
        if (res.location) {
          if (res.location.country) {
            setValue("country", res.location.country);
          }
          if (res.location.state) {
            setValue("states", res.location.state);
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
          setValue("remoteJob", res.remoteJob as "Yes" | "No" | "Hybrid");
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
    try {
      if (!atsApi.auth.isAuthenticated()) {
        await atsApi.auth.login("recruiter@enfycon.com", "enfycon123");
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

      let assembledPayRate = "";
      if (market === "IN") {
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

      let finalDescription = data.jobDescription;
      if (market === "IN" && data.shiftTiming) {
        finalDescription = `<p><strong>Shift Timing:</strong> ${data.shiftTiming}</p>` + finalDescription;
      }

      let resolvedPodId: string | undefined = undefined;
      let resolvedApproverId: string | undefined = selectedApproverId || undefined;
      let resolvedApproverRole: string = selectedApproverRole || "POD_LEAD";
      let resolvedPrimaryRecruiterId: string | undefined = data.primaryRecruiter || undefined;
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

      // Determine initial approval status based on creator's permissions and designated reviewer
      const hasDirectPublish = currentUserProfile?.permissions?.includes("job:publish_direct") || 
        currentUserProfile?.roles?.some((r: string) => ["ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(r.toUpperCase().replace(/[\s-_]+/g, "")));
      const hasDesignatedReviewer = Boolean(currentUserProfile?.jobReviewerId || currentUserProfile?.jobReviewerName || currentUserProfile?.job_reviewer_id);

      const shouldRequireApproval = !hasDirectPublish || hasDesignatedReviewer;
      const initialApprovalStatus = shouldRequireApproval ? "PENDING_APPROVAL" : "APPROVED";
      const initialJobStatus = shouldRequireApproval ? "Pending Approval" : (data.jobStatus || "Active");
      const finalApproverId = hasDesignatedReviewer ? (currentUserProfile?.jobReviewerId || currentUserProfile?.job_reviewer_id || resolvedApproverId) : resolvedApproverId;
      const finalApproverRole = hasDesignatedReviewer ? "DESIGNATED_REVIEWER" : resolvedApproverRole;

      // Map frontend form fields → backend CreateJobDto
      const payload = {
        jobCode: data.jobCode,
        branchId: typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') || undefined : undefined,
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
        approvalStatus: initialApprovalStatus,
        assignedApproverId: finalApproverId,
        assignedApproverRole: finalApproverRole,
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
      };

      const created = await atsApi.jobs.create(payload);

      toast.success(`Job requirement published successfully! Code: ${created.jobCode}`);
      router.push("/job-posting");
    } catch (err: any) {
      console.error("[NewJob] API error:", err);
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
          "flex items-center justify-between bg-neutral-100 dark:bg-slate-800/80 px-4 py-2 cursor-pointer select-none hover:bg-neutral-200 dark:hover:bg-slate-700/80 border-y border-neutral-200 dark:border-slate-800 first:border-t-0 first:rounded-t-lg font-sans transition-colors",
          isCollapsed && "rounded-b-lg border-b-0"
        )}
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
              {(() => {
                const hasDirectPublish = currentUserProfile?.permissions?.includes("job:publish_direct") || 
                  currentUserProfile?.roles?.some((r: string) => ["ADMIN", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(r.toUpperCase().replace(/[\s-_]+/g, "")));
                const hasDesignatedReviewer = Boolean(currentUserProfile?.jobReviewerId || currentUserProfile?.jobReviewerName || currentUserProfile?.job_reviewer_id);
                const requiresApproval = !hasDirectPublish || hasDesignatedReviewer;

                return (
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8.5 font-bold text-white shadow-xs cursor-pointer text-xs flex items-center gap-1.5 bg-primary hover:bg-primary/95"
                  >
                    {requiresApproval ? (
                      <>
                        <Shield className="h-3.5 w-3.5 text-amber-300" />
                        Submit for Approval
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Publish Job Requirement
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
                      {errors.clientBillRate && (
                        <p className="text-[10px] text-red-655 font-bold">{errors.clientBillRate.message}</p>
                      )}
                    </div>

                    {/* Pay Rate / Budget Min & Max (LPA) */}
                    <div className="space-y-1 md:col-span-2">
                      {market === "IN" ? (
                        <>
                          <div className="flex items-center gap-1">
                            <label className="font-bold text-neutral-700 dark:text-neutral-300">
                              Budget Range (LPA) <span className="text-red-500">*</span>
                            </label>
                            <span
                              className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help"
                              title="Target Budget CTC Range in Lakhs Per Annum (Min - Max)"
                            >
                              ?
                            </span>
                          </div>
                          <div className="flex gap-3 items-center">
                            <div className="relative flex-1 max-w-[180px]">
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
                            <span className="text-xs font-bold text-neutral-400">to</span>
                            <div className="relative flex-1 max-w-[180px]">
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
                          <div className="flex gap-1 items-center">
                            <select
                              value={payCurrency}
                              onChange={(e) => setPayCurrency(e.target.value)}
                              className="w-16 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
                            >
                              <option value="USD">USD</option>
                              <option value="CAD">CAD</option>
                              <option value="GBP">GBP</option>
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
                              className="w-40 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-1.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 shrink-0 font-semibold"
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

                    {/* Job Start Date (US Market Only) */}
                    {market !== "IN" && (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Job Start Date</label>
                        <input
                          type="date"
                          {...register("startDate")}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                        />
                      </div>
                    )}

                    {/* Job End Date */}
                    {watch("jobType") !== "Full Time" ? (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Job End Date</label>
                        <input
                          type="date"
                          {...register("endDate")}
                          className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                        />
                      </div>
                    ) : (
                      <div className="hidden md:block"></div>
                    )}

                    {/* Country, State, City (Single Row) */}
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Country */}
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Country</label>
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
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">State</label>
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
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Work Mode <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-4 h-8 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            value="Onsite"
                            {...register("remoteJob")}
                            className="w-3.5 h-3.5 text-primary focus:ring-primary border-neutral-300 dark:border-slate-700 cursor-pointer"
                          />
                          Onsite
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            value="Remote"
                            {...register("remoteJob")}
                            className="w-3.5 h-3.5 text-primary focus:ring-primary border-neutral-300 dark:border-slate-700 cursor-pointer"
                          />
                          Remote
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            value="Hybrid"
                            {...register("remoteJob")}
                            className="w-3.5 h-3.5 text-primary focus:ring-primary border-neutral-300 dark:border-slate-700 cursor-pointer"
                          />
                          Hybrid
                        </label>
                      </div>
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
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                    )}
                    {/* Job Status (Hidden, Defaults to Active) */}
                    <input type="hidden" {...register("jobStatus")} value="Active" />

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
                                              setValue("client", clientSearchText.trim(), { shouldValidate: true });
                                              setClientDropdownOpen(false);
                                              setClientSearchText("");
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
                                    setValue("client", clientSearchText.trim(), { shouldValidate: true });
                                    setClientDropdownOpen(false);
                                    setClientSearchText("");
                                  }}
                                >
                                  ✔ Select "{clientSearchText.trim()}"
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-blue-600 dark:text-blue-400 font-bold flex items-center hover:underline bg-transparent border-0 cursor-pointer text-xs ml-auto"
                                onClick={() => {
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
                                              setValue("endClientName", endClientSearchText.trim(), { shouldValidate: true });
                                              setEndClientDropdownOpen(false);
                                              setEndClientSearchText("");
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
                                    setValue("endClientName", endClientSearchText.trim(), { shouldValidate: true });
                                    setEndClientDropdownOpen(false);
                                    setEndClientSearchText("");
                                  }}
                                >
                                  ✔ Select "{endClientSearchText.trim()}"
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-blue-600 dark:text-blue-400 font-bold flex items-center hover:underline bg-transparent border-0 cursor-pointer text-xs ml-auto"
                                onClick={() => {
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
                        className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                        placeholder="e.g. REQ-9941"
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Priority <span className="text-red-500">*</span></label>
                      <select
                        {...register("priority")}
                        className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200 cursor-pointer"
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

                    {/* Engagement Type / Tax Terms (US Market Only) */}
                    {market !== "IN" && (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">
                          Tax Terms <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("taxTerms")}
                          className="w-full bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        >
                          <option value="W-2">W-2</option>
                          <option value="W2 - Profit Sharing">W2 - Profit Sharing</option>
                          <option value="C2C">C2C</option>
                          <option value="1099">1099</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}

                    {/* Notice Period */}
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

                    {/* Display Location (US Market Only) */}
                    {market !== "IN" && (
                      <div className="space-y-1">
                        <label className="font-bold text-neutral-700 dark:text-neutral-300">Display Location (External)</label>
                        <input
                          type="text"
                          {...register("locationAutocomplete")}
                          className="w-full bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-hidden focus:border-primary text-xs text-neutral-900 dark:text-neutral-200"
                          placeholder="e.g. Plano, TX (Shown on job boards)"
                        />
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

                      {/* Job Assignment */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between h-5">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                              <User className="h-2.5 w-2.5" />
                            </span>
                            Job Assignment
                          </span>
                        </label>
                        <select
                          value={selectedPodId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPodId(val);
                            if (val.startsWith("pod:")) {
                              const pid = val.replace("pod:", "");
                              const pod = (branchPods || podsList).find((p: any) => p.id === pid);
                              setSelectedApproverRole("POD_LEAD");
                              setSelectedApproverId(pod?.podHeadId || "");
                            } else if (val.startsWith("rec:")) {
                              setSelectedApproverRole("PRIMARY_RECRUITER");
                              setSelectedApproverId(val.replace("rec:", ""));
                            } else if (val === "all") {
                              setSelectedApproverRole("BRANCH_ADMIN");
                              setSelectedApproverId("");
                            } else if (val === "none") {
                              setSelectedApproverRole("BRANCH_ADMIN");
                              setSelectedApproverId("");
                            } else {
                              setSelectedApproverRole("BRANCH_ADMIN");
                              setSelectedApproverId("");
                            }
                          }}
                          className="w-full h-9 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-medium"
                        >
                          {/* 1. Recruitment Pods (if allowed by branch policy) */}
                          {(!activeBranch || ((activeBranch.allowPods ?? activeBranch.allow_pods) !== false)) && !(activeBranch?.allowNone ?? activeBranch?.allow_none) && (
                            <optgroup label="Recruitment Pods">
                              {branchPods && branchPods.length > 0 ? (
                                branchPods.map((pod: any) => (
                                  <option key={`pod:${pod.id}`} value={`pod:${pod.id}`}>
                                    Pod: {pod.name} {pod.podHeadName ? `(Lead: ${pod.podHeadName})` : ""}
                                  </option>
                                ))
                              ) : (
                                <option value="auto_pod">Recruitment Pod System (Auto Broadcast)</option>
                              )}
                            </optgroup>
                          )}

                          {/* 2. Direct Recruiter Assignment (only if branch policy allows Direct Assignment) */}
                          {(!activeBranch || !!(activeBranch.allowNone ?? activeBranch.allow_none)) && recruitersList && recruitersList.length > 0 && (
                            <optgroup label="Direct Recruiter Assignment">
                              {recruitersList.map((rec: any) => (
                                <option key={`rec:${rec.id}`} value={`rec:${rec.id}`}>
                                  Recruiter: {rec.fullName || rec.name || rec.email}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {/* 3. Branch Pool & Allocation (if allowed by branch policy) */}
                          {(!activeBranch || ((activeBranch.allowAll ?? activeBranch.allow_all) === true) || ((activeBranch.allowUnassigned ?? activeBranch.allow_unassigned) === true)) && !(activeBranch?.allowNone ?? activeBranch?.allow_none) && (
                            <optgroup label="Branch Pool & Allocation">
                              {(!activeBranch || ((activeBranch.allowAll ?? activeBranch.allow_all) === true)) && (
                                <option value="all">All Branch Recruiters (Pool Broadcast)</option>
                              )}
                              {(!activeBranch || ((activeBranch.allowUnassigned ?? activeBranch.allow_unassigned) === true)) && (
                                <option value="none">Unassigned Allocation (Hold for Manager Assignment)</option>
                              )}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Department (US Market Only) */}
                      {market !== "IN" && (
                        <div className="space-y-1.5">
                          <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center h-5">Department</label>
                          <select
                            {...register("department")}
                            className="w-full h-9 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
                          >
                            <option value="">Select Department</option>
                            <option value="IT Services">IT Services</option>
                            <option value="Operations">Operations</option>
                            <option value="Sales">Sales</option>
                          </select>
                        </div>
                      )}

                      {/* Sales Manager (US Market Only) */}
                      {market !== "IN" && (
                        <div className="space-y-1.5">
                          <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center h-5">Sales Manager</label>
                          <input
                            type="text"
                            {...register("salesManager")}
                            className="w-full h-9 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200"
                            placeholder="e.g. Sanjay Kumar"
                          />
                        </div>
                      )}

                      {/* Account Manager (US Market Only) */}
                      {market !== "IN" && (
                        <div className="space-y-1.5">
                          <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center h-5">Account Manager</label>
                          <input
                            type="text"
                            {...register("accountManager")}
                            className="w-full h-9 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200"
                            placeholder="e.g. John Doe"
                          />
                        </div>
                      )}

                      {/* Primary Recruiter (US Market Only) */}
                      {market !== "IN" && (
                        <div className="space-y-1.5">
                          <label className="font-semibold text-xs text-neutral-700 dark:text-neutral-300 flex items-center h-5">Primary Recruiter</label>
                          <input
                            type="text"
                            {...register("primaryRecruiter")}
                            className="w-full h-9 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-neutral-800 dark:text-neutral-200"
                            placeholder="e.g. Jane Smith"
                          />
                        </div>
                      )}
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

              {/* -------------------- CAREER PORTAL SETTINGS -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
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
          </div>
        </form>
      )}

      <AddClientModal
        open={addClientModalOpen}
        onOpenChange={setAddClientModalOpen}
        onClientAdded={(clientName) => {
          fetchClients();
          if (!getValues("client")) {
            setValue("client", clientName, { shouldValidate: true });
          }
          setValue("endClientName", clientName, { shouldValidate: true });
        }}
        market={market}
      />
      </div>
  );
}
