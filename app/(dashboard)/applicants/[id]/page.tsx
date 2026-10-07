"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Award,
  Trash2,
  Edit,
  ClipboardList,
  FileText,
  Download,
  UploadCloud,
  Calendar,
  MessageSquare,
  Clock,
  User,
  Plus,
  Send,
  Sparkles,
  DollarSign,
  Shield,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { atsApi } from "@/lib/ats-api";
import toast from "react-hot-toast";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const { data: session } = useSession();

  // State variables
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resume" | "submissions" | "notes">("resume");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");
  
  // Submit modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [submittedRate, setSubmittedRate] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    jobTitle: "",
    location: "",
    workAuthorization: "",
    experienceYears: 0,
    currentCTC: "",
    expectedCTC: "",
    noticePeriodDays: 0,
    servingNotice: false,
  });
  const [updatingCandidate, setUpdatingCandidate] = useState(false);

  // Role override check (matches sidebar behavior)
  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOverrideRole(localStorage.getItem("override_role"));
      const handleRoleChange = () => {
        setOverrideRole(localStorage.getItem("override_role"));
      };
      window.addEventListener("overrideRoleChanged", handleRoleChange);
      return () => window.removeEventListener("overrideRoleChanged", handleRoleChange);
    }
  }, []);

  const systemRole = useMemo(() => {
    return overrideRole || (session as any)?.user?.systemRole || "RECRUITER";
  }, [session, overrideRole]);

  const isRecruiter = systemRole === "RECRUITER";

  // Parse candidate integer ID
  let candidateId = NaN;
  if (rawId) {
    if (rawId.includes("-")) {
      const parts = rawId.split("-");
      candidateId = parseInt(parts[parts.length - 1], 10);
    } else {
      candidateId = parseInt(rawId, 10);
    }
  }

  // Initial Data Fetch
  const loadData = async () => {
    if (isNaN(candidateId)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // 1. Fetch Candidate Profile details
      const details = await atsApi.candidates.get(candidateId);
      setCandidate(details);

      // Initialize Edit Form values
      setEditForm({
        fullName: details.fullName || "",
        email: details.email || "",
        phone: details.phone || "",
        jobTitle: details.jobTitle || "",
        location: details.city ? `${details.city}, ${details.state}` : "",
        workAuthorization: details.workAuthorization || "",
        experienceYears: details.experienceYears || 0,
        currentCTC: details.currentCTC ? String(details.currentCTC) : "",
        expectedCTC: details.expectedCTC ? String(details.expectedCTC) : "",
        noticePeriodDays: details.noticePeriodDays || 0,
        servingNotice: !!details.servingNotice,
      });

      // Load local storage notes for this candidate
      const savedNotes = localStorage.getItem(`notes_candidate_${candidateId}`);
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      } else {
        setNotes(["Initial candidate profile imported successfully."]);
      }

      // 2. Fetch submissions for this candidate
      try {
        const subsList = await atsApi.submissions.list();
        const candidateSubs = subsList.filter((s: any) => s.candidateId === candidateId);
        setSubmissions(candidateSubs);
      } catch (subErr) {
        console.error("Failed to load submissions:", subErr);
      }

      // 3. Fetch Resume Blob
      try {
        setResumeLoading(true);
        const blob = await atsApi.candidates.fetchResumeBlob(candidateId);
        if (resumeUrl) {
          URL.revokeObjectURL(resumeUrl);
        }
        const url = URL.createObjectURL(blob);
        setResumeUrl(url);
      } catch (resErr) {
        console.log("No resume file found for candidate or failed to retrieve:", resErr);
      } finally {
        setResumeLoading(false);
      }
    } catch (err: any) {
      console.error("Failed to load candidate details:", err);
      toast.error("Failed to load candidate profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (resumeUrl) {
        URL.revokeObjectURL(resumeUrl);
      }
    };
  }, [candidateId]);

  // Handle Note Submission
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const updatedNotes = [...notes, newNote.trim()];
    setNotes(updatedNotes);
    localStorage.setItem(`notes_candidate_${candidateId}`, JSON.stringify(updatedNotes));
    setNewNote("");
    toast.success("Note added successfully!");
  };

  // Open submit to job modal
  const handleOpenSubmitModal = async () => {
    setSubmitModalOpen(true);
    setSubmittedRate("");
    setRecruiterComment("");
    try {
      const jobsList = await atsApi.jobs.list();
      const active = jobsList.filter((j: any) => j.status === "ACTIVE" || j.jobStatus === "Active");
      setActiveJobs(active);
      if (active.length > 0) {
        setSelectedJobId(active[0].id);
      }
    } catch (err) {
      console.error("Failed to load active jobs:", err);
      toast.error("Failed to load active jobs.");
    }
  };

  // Submit candidate to selected job
  const handleConfirmSubmit = async () => {
    if (!candidate || !selectedJobId) return;
    setSubmittingJob(true);
    try {
      const currentUser = atsApi.auth.getCurrentUser();
      if (!currentUser?.id) {
        toast.error("You must be logged in to submit a candidate to a job.");
        return;
      }
      await atsApi.submissions.create({
        candidateId: candidateId,
        jobId: selectedJobId,
        recruiterId: currentUser.id,
        finalStatus: "PENDING_APPROVAL",
        submittedRate: submittedRate.trim() || null,
        recruiterComment: recruiterComment.trim() || null
      });

      toast.success(`Successfully submitted ${candidate.fullName} to job!`);
      setSubmitModalOpen(false);

      // Refresh submissions
      const subsList = await atsApi.submissions.list();
      const candidateSubs = subsList.filter((s: any) => s.candidateId === candidateId);
      setSubmissions(candidateSubs);
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleUploadResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    const toastId = toast.loading("Uploading and parsing resume file...");
    try {
      await atsApi.candidates.uploadCv(file, "CV Upload", { email: candidate.email });
      toast.success("Resume updated successfully!", { id: toastId });
      await loadData();
    } catch (err: any) {
      toast.error("Failed to upload resume: " + err.message, { id: toastId });
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  // Handle Candidate Update
  const handleUpdateCandidate = async () => {
    if (!editForm.fullName.trim()) {
      toast.error("Full Name is required.");
      return;
    }
    setUpdatingCandidate(true);
    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        jobTitle: editForm.jobTitle.trim() || null,
        location: editForm.location.trim() || null,
        workAuthorization: editForm.workAuthorization.trim() || null,
        experienceYears: Number(editForm.experienceYears) || 0,
        currentCTC: editForm.currentCTC ? Number(editForm.currentCTC) : null,
        expectedCTC: editForm.expectedCTC ? Number(editForm.expectedCTC) : null,
        noticePeriodDays: Number(editForm.noticePeriodDays) || 0,
        servingNotice: editForm.servingNotice,
      };

      await atsApi.candidates.update(candidateId, payload);
      toast.success("Candidate details updated successfully.");
      setEditModalOpen(false);
      
      // Reload profile
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update candidate: " + err.message);
    } finally {
      setUpdatingCandidate(false);
    }
  };

  // Delete candidate profile
  const handleDeleteCandidate = async () => {
    if (!window.confirm("Are you sure you want to delete this candidate profile? All associated resumes and histories will be permanently removed.")) {
      return;
    }
    try {
      await atsApi.candidates.delete(candidateId);
      toast.success("Candidate profile deleted successfully.");
      router.push("/applicants/all");
    } catch (err: any) {
      toast.error("Failed to delete candidate: " + err.message);
    }
  };

  // Get Initials for Avatar
  const candidateInitials = useMemo(() => {
    if (!candidate?.fullName) return "CN";
    const parts = candidate.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }, [candidate]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <div className="h-10 w-10 border-4 border-t-primary border-neutral-200 dark:border-slate-800 rounded-full animate-spin"></div>
        <p className="text-xs text-neutral-500 mt-4 font-medium">Loading candidate profile...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
        <FileText className="h-12 w-12 text-neutral-300 dark:text-slate-700" />
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-4">Candidate Not Found</h3>
        <p className="text-xs text-neutral-500 mt-1">The candidate profile with the specified ID could not be loaded.</p>
        <Link href="/applicants/all">
          <Button variant="outline" size="sm" className="mt-6 text-xs gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to Candidates List
          </Button>
        </Link>
      </div>
    );
  }

  // Parse experience and education timeline details
  const parsedJson = candidate.parsedJson || {};
  
  const experienceDetailed = parsedJson.experience_detailed || parsedJson.work_history || [];

  const educationDetailed = parsedJson.education_detailed || parsedJson.education_history || [];

  const skills = candidate.skills && candidate.skills.length > 0 ? candidate.skills : (parsedJson.skills || []);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-neutral-50 dark:bg-slate-950 font-sans p-4 space-y-4">
      {/* ── HEADER NAVIGATION ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <Link href="/applicants/all">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 transition-all cursor-pointer bg-transparent border-0">
            <ChevronLeft className="h-4 w-4" /> Back to Candidates
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-neutral-200 text-xs gap-1.5 border border-neutral-200 dark:border-slate-750 font-semibold"
          >
            <Edit className="h-3.5 w-3.5" /> Edit Profile
          </Button>
          <Button
            size="sm"
            onClick={handleOpenSubmitModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-xs font-semibold"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Submit to Job
          </Button>
          {!isRecruiter && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCandidate}
              className="border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 hover:text-red-700 dark:text-red-400 text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* ── SPLIT-SCREEN WORKSPACE ─────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* LEFT COLUMN: Profile Structured Details (62%) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 space-y-4 overflow-auto pr-1">
          
          {/* Main Integrated Profile Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm p-5 shadow-xs space-y-5">
            {/* Header info with Initials Avatar */}
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm tracking-wide shrink-0">
                {candidateInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded border border-blue-200 text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    {candidate.candidateCode || `CAN-${String(candidate.dbId || candidateId).padStart(6, '0')}`}
                  </span>
                  <h2 className="text-base font-extrabold text-neutral-900 dark:text-white truncate">
                    {candidate.fullName}
                  </h2>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                    {candidate.status}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  {candidate.jobTitle}
                  <span className="text-neutral-350 dark:text-slate-705">{"\u2022"}</span>
                  <span className="text-neutral-500">{candidate.experienceYears} Years Experience</span>
                  <span className="text-neutral-350 dark:text-slate-705">{"\u2022"}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Uploaded By: {candidate.uploadedByName || "System Upload"}</span>
                </p>
              </div>
            </div>

            {/* Systematic Contacts & Profile Attributes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-neutral-100 dark:border-slate-850">
              
              {/* Left Column: Contact Numbers */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2 bg-neutral-50 dark:bg-slate-950/40 rounded border border-neutral-100 dark:border-slate-850">
                  <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">Email Address</span>
                    <a href={`mailto:${candidate.email}`} className="hover:text-primary hover:underline font-bold text-neutral-750 dark:text-neutral-300 truncate block">
                      {candidate.email}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 p-2 bg-neutral-50 dark:bg-slate-950/40 rounded border border-neutral-100 dark:border-slate-850">
                  <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">Mobile Phone</span>
                    <a href={`tel:${candidate.phone}`} className="hover:text-primary hover:underline font-bold text-neutral-750 dark:text-neutral-300 truncate block">
                      {candidate.phone || "No phone listed"}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-neutral-50 dark:bg-slate-950/40 rounded border border-neutral-100 dark:border-slate-850">
                  <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">Current Location</span>
                    <span className="font-bold text-neutral-750 dark:text-neutral-300 block">
                      {candidate.city ? `${candidate.city}, ${candidate.state}` : "Location not listed"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Work Visa & Compensation details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-neutral-50 dark:bg-slate-955/20 border border-neutral-100 dark:border-slate-850 rounded">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Visa Status</span>
                  <span className="font-bold text-neutral-750 dark:text-neutral-350">{candidate.workAuthorization || "US Citizen"}</span>
                </div>
                
                <div className="p-2 bg-neutral-50 dark:bg-slate-955/20 border border-neutral-100 dark:border-slate-850 rounded">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Source</span>
                  <span className="font-bold text-neutral-750 dark:text-neutral-350">{candidate.source}</span>
                </div>

                <div className="p-2 bg-neutral-50 dark:bg-slate-955/20 border border-neutral-100 dark:border-slate-850 rounded">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">CTC (Curr / Exp)</span>
                  <span className="font-bold text-neutral-750 dark:text-neutral-350">
                    {candidate.currentCTC ? `₹${candidate.currentCTC} LPA` : "—"} / {candidate.expectedCTC ? `₹${candidate.expectedCTC} LPA` : "—"}
                  </span>
                </div>

                <div className="p-2 bg-neutral-50 dark:bg-slate-955/20 border border-neutral-100 dark:border-slate-850 rounded">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Notice Period</span>
                  <span className="font-bold text-neutral-750 dark:text-neutral-350">
                    {candidate.servingNotice ? "Serving Notice" : candidate.noticePeriodDays ? `${candidate.noticePeriodDays} Days` : "Immediate"}
                  </span>
                </div>
              </div>

            </div>

            {/* Core Skills cloud prominently at bottom */}
            <div className="pt-4 border-t border-neutral-100 dark:border-slate-850">
              <h3 className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider mb-2 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> Parsed Skill Profile
              </h3>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-indigo-50/20 text-indigo-700 border-indigo-200/30 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/40 text-[10px] font-bold py-0.5 px-2">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">No skills extracted</p>
              )}
            </div>
          </div>

          {/* Timelines and Tabs Card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm flex flex-col min-h-0 overflow-hidden flex-1 shadow-none">
            {/* Tabs Header */}
            <div className="flex border-b border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900/40">
              <button
                onClick={() => setActiveTab("resume")}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "resume"
                    ? "border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Timeline & History
              </button>
              <button
                onClick={() => setActiveTab("submissions")}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "submissions"
                    ? "border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" /> Submissions ({submissions.length})
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "notes"
                    ? "border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Recruiter Comments ({notes.length})
              </button>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-auto p-4 min-h-0 bg-white dark:bg-slate-900">
              
              {/* TAB 1: Timeline & History */}
              {activeTab === "resume" && (
                <div className="space-y-6">
                  {/* Work Experience Timeline */}
                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider mb-4 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> Employment Timeline
                    </h3>
                    {experienceDetailed.length > 0 ? (
                      <div className="space-y-5 relative pl-4 border-l border-neutral-200 dark:border-slate-800">
                        {experienceDetailed.map((exp: any, idx: number) => (
                          <div key={idx} className="relative group">
                            {/* Circle dot on timeline */}
                            <div className="absolute -left-[20.5px] top-1.5 h-3 w-3 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 group-hover:bg-indigo-500 transition-colors" />
                            <div className="flex items-center justify-between text-xs">
                              <h4 className="font-bold text-neutral-800 dark:text-neutral-200">{exp.role || exp.title || "Role"}</h4>
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {exp.start_date || "—"} to {exp.end_date || "—"}
                              </span>
                            </div>
                            {exp.company && <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-450 mt-0.5">{exp.company}</p>}
                            {exp.description && (
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 bg-neutral-50 dark:bg-slate-950/40 p-2.5 rounded-sm border border-neutral-100 dark:border-slate-850/50 whitespace-pre-wrap leading-relaxed">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 px-4 bg-neutral-50/50 dark:bg-slate-900/50 border border-neutral-200/60 dark:border-slate-800 rounded-xs text-center">
                        <Briefcase className="h-5 w-5 text-neutral-350 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">No employment history detected</p>
                      </div>
                    )}
                  </div>

                  {/* Education Timeline */}
                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider mb-4 flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" /> Academic History
                    </h3>
                    {educationDetailed.length > 0 ? (
                      <div className="space-y-4 relative pl-4 border-l border-neutral-200 dark:border-slate-800">
                        {educationDetailed.map((edu: any, idx: number) => (
                          <div key={idx} className="relative group">
                            <div className="absolute -left-[20.5px] top-1.5 h-3 w-3 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 group-hover:bg-emerald-500 transition-colors" />
                            <div className="flex items-center justify-between text-xs">
                              <h4 className="font-bold text-neutral-800 dark:text-neutral-200">
                                {edu.degree || edu.degree_name || edu.school || "Degree"}{edu.major ? ` in ${edu.major}` : ""}
                              </h4>
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {edu.start_date || "—"}{edu.end_date ? ` to ${edu.end_date}` : ""}
                              </span>
                            </div>
                            {edu.school && edu.degree && <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-450 mt-0.5">{edu.school}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 px-4 bg-neutral-50/50 dark:bg-slate-900/50 border border-neutral-200/60 dark:border-slate-800 rounded-xs text-center">
                        <GraduationCap className="h-5 w-5 text-neutral-350 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">No academic history detected</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Submissions */}
              {activeTab === "submissions" && (
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 dark:text-neutral-500">
                      <ClipboardList className="h-10 w-10 mx-auto opacity-30 mb-2" />
                      <p className="text-xs">No active recruiter submissions found for this candidate.</p>
                      <Button size="sm" onClick={handleOpenSubmitModal} className="mt-4 text-xs gap-1">
                        <Plus className="h-3 w-3" /> Submit to Job
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-neutral-200 dark:border-slate-850 rounded-sm overflow-hidden text-xs">
                      <div className="grid grid-cols-5 font-bold bg-neutral-50 dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-850 p-2 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        <div className="col-span-2">Job Requisition</div>
                        <div>Submitted Rate</div>
                        <div>Status</div>
                        <div className="text-right">Actions</div>
                      </div>
                      <div className="divide-y divide-neutral-250 dark:divide-slate-850 bg-white dark:bg-slate-900">
                        {submissions.map((sub, idx) => (
                          <div key={idx} className="grid grid-cols-5 items-center p-2 text-neutral-700 dark:text-neutral-300">
                            <div className="col-span-2 space-y-0.5">
                              <p className="font-bold text-indigo-650 dark:text-indigo-400">{sub.jobCode || `REQ-${sub.jobId}`}</p>
                              <p className="text-[10px] text-neutral-500 truncate">{sub.jobTitle || "Job Requisition"}</p>
                            </div>
                            <div>{sub.submittedRate || "N/A"}</div>
                            <div>
                              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-[9px] uppercase tracking-wide">
                                {sub.finalStatus || "PENDING"}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <Link href={`/utility/submissions`}>
                                <Button size="sm" variant="ghost" className="text-primary hover:underline h-7 text-[10px] font-semibold cursor-pointer">
                                  Track Submission
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Comments & Notes */}
              {activeTab === "notes" && (
                <div className="space-y-4 flex flex-col h-full min-h-0">
                  <div className="flex-1 space-y-3 overflow-auto min-h-0 max-h-[300px] pr-1">
                    {notes.map((note, idx) => (
                      <div key={idx} className="bg-neutral-50 dark:bg-slate-900/60 p-3 rounded-sm border border-neutral-100 dark:border-slate-850 text-xs">
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                          <User className="h-3 w-3 text-neutral-400" />
                          <span>Recruiter</span>
                          <span>{"\u2022"}</span>
                          <Clock className="h-3 w-3 text-neutral-400" />
                          <span>Just now</span>
                        </div>
                        <p className="text-neutral-750 dark:text-neutral-300 leading-relaxed font-normal whitespace-pre-wrap">{note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Note Input */}
                  <div className="border-t border-neutral-100 dark:border-slate-850 pt-3 flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Type recruiter comment, interview notes, or update logs..."
                      className="flex-1 bg-white dark:bg-slate-950 border border-neutral-250 dark:border-slate-750 rounded p-2 text-xs outline-hidden focus:border-primary text-neutral-850 dark:text-neutral-200 min-h-16 resize-none"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white self-end text-xs gap-1 shrink-0 font-medium"
                    >
                      <Send className="h-3.5 w-3.5" /> Save Note
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CV PDF Document Viewer (38%) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-sm overflow-hidden shadow-none">
          
          {/* Viewer Toolbar */}
          <div className="bg-neutral-100 dark:bg-slate-800 px-4 py-2.5 border-b border-neutral-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-neutral-500" /> Original CV Preview
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="file"
                ref={resumeInputRef}
                onChange={handleUploadResumeFile}
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploadingResume}
                onClick={() => resumeInputRef.current?.click()}
                className="text-neutral-600 border-neutral-250 hover:bg-neutral-200 dark:border-slate-700 dark:hover:bg-slate-700 hover:text-neutral-800 text-[10px] gap-1 h-7 font-bold cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5" /> 
                {resumeUrl ? "Update CV" : "Upload CV"}
              </Button>
              {resumeUrl && (
                <a href={resumeUrl} download={`${candidate.fullName.replace(/\s+/g, "_")}_CV.pdf`}>
                  <Button size="sm" variant="outline" className="text-neutral-600 border-neutral-250 hover:bg-neutral-200 dark:border-slate-700 dark:hover:bg-slate-700 hover:text-neutral-800 text-[10px] gap-1 h-7 font-bold">
                    <Download className="h-3.5 w-3.5" /> Download CV
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* PDF Viewer / Raw Text Frame */}
          <div className="flex-1 bg-neutral-200 dark:bg-slate-950 flex flex-col items-center justify-center relative min-h-[300px]">
            {resumeLoading ? (
              <div className="text-center">
                <div className="h-6 w-6 border-2 border-t-primary border-neutral-300 dark:border-slate-800 rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] text-neutral-550 mt-2 font-medium">Fetching CV document...</p>
              </div>
            ) : resumeUrl ? (
              <iframe
                src={resumeUrl}
                className="w-full h-full border-none bg-white dark:bg-slate-900"
                title={`${candidate.fullName} Resume`}
              />
            ) : (
              /* Fallback to parsed raw text inside scrollable pre */
              <div className="w-full h-full flex flex-col p-4 bg-white dark:bg-slate-900 overflow-auto">
                <div className="text-center border-b border-neutral-100 dark:border-slate-850 pb-3 mb-3 shrink-0">
                  <FileSearch className="h-8 w-8 text-indigo-500/80 mx-auto" />
                  <p className="text-xs font-extrabold text-neutral-800 dark:text-white mt-2">Parsed CV Raw Text</p>
                  <p className="text-[10px] text-neutral-550 mt-1">No original CV file on record. Rendering parsed text representation below.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resumeInputRef.current?.click()}
                    className="mt-3 text-xs gap-1.5 font-bold mx-auto cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" /> Upload Resume PDF
                  </Button>
                </div>
                {candidate.rawText ? (
                  <pre className="text-[11px] leading-relaxed text-neutral-750 dark:text-neutral-300 font-mono whitespace-pre-wrap flex-1 select-text bg-neutral-50 dark:bg-slate-955 p-3 rounded border border-neutral-100 dark:border-slate-850/50 selection:bg-indigo-500/10">
                    {candidate.rawText}
                  </pre>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-450 dark:text-neutral-550 text-xs italic">
                    No raw text extracted for this profile.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT CANDIDATE MODAL DIALOG ───────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-bold">
              <Edit className="h-4 w-4 text-indigo-500" /> Edit Candidate Profile
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Modify candidate profile information. Click Save changes to apply.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Full Name *</label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Target Job Title</label>
              <Input
                value={editForm.jobTitle}
                onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Email Address</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Phone Number</label>
              <PhoneInput
                value={editForm.phone}
                onChange={(val) => setEditForm({ ...editForm, phone: val || "" })}
                market={(candidate as any)?.market || (session?.user as any)?.market || "IN"}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Location (City, State)</label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g. Bangalore, Karnataka"
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Visa / Work Auth</label>
              <Input
                value={editForm.workAuthorization}
                onChange={(e) => setEditForm({ ...editForm, workAuthorization: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Experience (Years)</label>
              <Input
                type="number"
                value={editForm.experienceYears}
                onChange={(e) => setEditForm({ ...editForm, experienceYears: Number(e.target.value) || 0 })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Notice Period (Days)</label>
              <Input
                type="number"
                value={editForm.noticePeriodDays}
                onChange={(e) => setEditForm({ ...editForm, noticePeriodDays: Number(e.target.value) || 0 })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Current CTC (LPA)</label>
              <Input
                type="number"
                value={editForm.currentCTC}
                onChange={(e) => setEditForm({ ...editForm, currentCTC: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300">Expected CTC (LPA)</label>
              <Input
                type="number"
                value={editForm.expectedCTC}
                onChange={(e) => setEditForm({ ...editForm, expectedCTC: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2 mt-1">
              <input
                id="edit-serving-notice"
                type="checkbox"
                checked={editForm.servingNotice}
                onChange={(e) => setEditForm({ ...editForm, servingNotice: e.target.checked })}
                className="h-4.5 w-4.5 rounded accent-indigo-650 cursor-pointer"
              />
              <label htmlFor="edit-serving-notice" className="font-semibold text-neutral-700 dark:text-neutral-350 cursor-pointer">
                Serving Notice Period
              </label>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)} className="text-xs cursor-pointer">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateCandidate}
              disabled={updatingCandidate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              {updatingCandidate ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SUBMIT TO JOB MODAL DIALOG ────────────────────── */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="sm:max-w-[425px] text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Submit Candidate to Job</DialogTitle>
            <DialogDescription className="text-[11px]">
              Select an active job requisition to submit <strong>{candidate.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="job-select" className="text-xs font-semibold text-default-700">Active Job Requisitions</label>
              {activeJobs.length === 0 ? (
                <div className="text-xs text-amber-605 italic">No active jobs found in the system.</div>
              ) : (
                <select
                  id="job-select"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full text-xs border border-default-250 dark:border-slate-700 rounded-md px-3 h-9 bg-transparent text-default-850 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                >
                  {activeJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobCode} - {j.jobTitle} ({j.clientName || j.client})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeJobs.length > 0 && (
              <>
                <div className="flex flex-col gap-2 mt-1">
                  <label htmlFor="modal-submitted-rate" className="text-xs font-semibold text-default-700">
                    Submitted Pay Rate ($/hr or $/yr)
                  </label>
                  <Input
                    id="modal-submitted-rate"
                    placeholder="e.g. $70/hr"
                    value={submittedRate}
                    onChange={(e) => setSubmittedRate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <label htmlFor="modal-recruiter-comment" className="text-xs font-semibold text-default-700">Comments</label>
                  <textarea
                    id="modal-recruiter-comment"
                    placeholder="Recruiter comments or notes..."
                    value={recruiterComment}
                    onChange={(e) => setRecruiterComment(e.target.value)}
                    className="min-h-16 text-xs bg-transparent border border-default-250 dark:border-slate-700 rounded-md p-2 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submittingJob || activeJobs.length === 0}
              className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-semibold cursor-pointer"
            >
              {submittingJob ? "Submitting..." : "Submit to Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
