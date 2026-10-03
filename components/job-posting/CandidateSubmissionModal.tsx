"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { UserPlus, Loader2, FileText, UploadCloud, RefreshCw, Briefcase, MapPin, DollarSign, User } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

export function CandidateSubmissionModal({ open: isOpen, onOpenChange: onClose, job, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; job: any; onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    totalExperienceYears: "",
    currentLocation: "",
    preferredLocations: "",
    source: "Market",
    skills: "",
    relevantExperienceYears: "",
    currentCtc: "",
    expectedCtc: "",
    currentCompany: "",
    noticePeriodDays: "",
    availabilityToStart: ""
  });
  
  const [recruiterComment, setRecruiterComment] = useState("");

  const isContractual = job?.type?.toLowerCase().includes("contract") || job?.jobType?.toLowerCase().includes("contract");

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setAutoFilled(false);

    try {
      const parsed = await atsApi.candidates.parseResume(selectedFile);

      const cleanNameStr = (str: string) =>
        str
          .replace(/\(\d+\)/g, '')
          .replace(/\[\d+\]/g, '')
          .replace(/\b(resume|cv|curriculum\s+vitae|vitae|profile|biodata)\b/gi, '')
          .replace(/[_\-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      let firstName = cleanNameStr(parsed.firstName || "");
      let lastName = cleanNameStr(parsed.lastName || "");
      let email = parsed.email || "";
      let phone = parsed.phone || "";
      
      const parsedLocationObj = parsed?.ats_normalized?.location;
      let parsedLocation = typeof parsedLocationObj === 'object' && parsedLocationObj !== null && !Array.isArray(parsedLocationObj)
        ? (parsedLocationObj.raw || parsedLocationObj.canonical)
        : (Array.isArray(parsedLocationObj) && parsedLocationObj.length > 0 ? (parsedLocationObj[0]?.raw || parsedLocationObj[0]?.canonical) : '');
      parsedLocation = parsed?.location || parsedLocation || "";

      let parsedSkills = parsed.skills ? parsed.skills.join(", ") : "";
      
      let expYears = typeof parsed?.experience_years === 'number'
        ? String(parsed.experience_years)
        : (parsed?.experience_detailed?.length ? String(parsed.experience_detailed.length) : "");

      let parsedCompany = parsed.experience_detailed?.[0]?.company || "";

      if (!firstName && parsed.candidate_name && parsed.candidate_name !== "Unknown") {
        const cleaned = cleanNameStr(parsed.candidate_name);
        const parts = cleaned.split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      } else if (!firstName && parsed.candidateName && parsed.candidateName !== "Unknown") {
        const cleaned = cleanNameStr(parsed.candidateName);
        const parts = cleaned.split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }

      if (!email && parsed.contact?.emails?.length > 0) {
        email = parsed.contact.emails[0];
      }
      if (!phone && parsed.contact?.phones?.length > 0) {
        phone = parsed.contact.phones[0];
      }

      if (phone && !phone.startsWith("+")) {
        const digits = phone.replace(/\D/g, "");
        if (digits.length === 10) {
          if (job?.market === "US") {
            phone = `+1${digits}`;
          } else {
            phone = `+91${digits}`;
          }
        }
      }

      setFormData((prev) => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        email: email || prev.email,
        phone: phone || prev.phone,
        currentLocation: parsedLocation || prev.currentLocation,
        skills: parsedSkills || prev.skills,
        totalExperienceYears: expYears || prev.totalExperienceYears,
        currentCompany: parsedCompany || prev.currentCompany,
      }));

      if (firstName || email || phone || parsedLocation || parsedSkills) {
        setAutoFilled(true);
        toast.success("Resume parsed and fields auto-filled successfully.");
      } else {
        toast("Resume attached. Please verify or fill details below.");
      }
    } catch (err: any) {
      console.warn("CV parsing error:", err);
      toast("Resume attached. Please verify or enter details manually.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const resetForm = () => {
    setFormData({ 
      firstName: "", lastName: "", email: "", phone: "",
      totalExperienceYears: "", currentLocation: "", preferredLocations: "",
      source: "Market", skills: "", relevantExperienceYears: "",
      currentCtc: "", expectedCtc: "", currentCompany: "", noticePeriodDays: "",
      availabilityToStart: ""
    });
    setFile(null);
    setAutoFilled(false);
    setParsing(false);
    setRecruiterComment("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload candidate resume (CV).");
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill in first name, last name, and email address.");
      return;
    }

    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const uploadResponse = await atsApi.candidates.uploadCv(file, formData.source, {
        fullName,
        email: formData.email,
        phone: formData.phone || "",
        relevantExperienceYears: formData.relevantExperienceYears,
        currentCompany: formData.currentCompany,
        availabilityToStart: formData.availabilityToStart,
        currentCtc: formData.currentCtc,
        expectedCtc: formData.expectedCtc,
        noticePeriodDays: formData.noticePeriodDays,
        skills: formData.skills,
        currentLocation: formData.currentLocation,
        preferredLocations: formData.preferredLocations,
      });

      const candidate = uploadResponse.candidate;

      let parsedCandidateId = candidate.id;
      if (typeof parsedCandidateId === "string") {
        const parts = parsedCandidateId.split("-");
        const rawNum = parts[parts.length - 1];
        parsedCandidateId = rawNum;
      } else if (candidate.applicantId && typeof candidate.applicantId === "string") {
        const parts = candidate.applicantId.split("-");
        const rawNum = parts[parts.length - 1];
        parsedCandidateId = rawNum;
      }

      const currentUser = atsApi.auth.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("You must be logged in to submit a candidate.");
      }
      
      await atsApi.submissions.create({
        candidateId: parsedCandidateId || candidate.id || 1,
        jobId: job?.id,
        recruiterId: currentUser.id,
        finalStatus: "PENDING_APPROVAL",
        recruiterComment: recruiterComment.trim() || null
      });

      resetForm();
      toast.success("Candidate CV submitted successfully!");
      onClose(false); if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose(false);
    if (typeof document !== "undefined") {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }, 50);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-[98vw] lg:max-w-[1400px] h-[95vh] w-full p-0 overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl bg-white dark:bg-slate-900 font-sans flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Submit Candidate ({isContractual ? "Contractual" : "Full-Time"})
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Submitting profile for <span className="font-semibold text-slate-800 dark:text-slate-200">{job?.jobCode} - {job?.jobTitle}</span>
            </DialogDescription>
          </div>
          {autoFilled && (
            <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-Extracted Data Active
            </div>
          )}
        </div>

        {/* Body Container */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          
          {/* LEFT: Preview Pane (50%) */}
          {file ? (
            <div className="w-full lg:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/50 p-4 shrink-0 overflow-hidden flex flex-col">
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col relative">
                {/* Append #toolbar=0 to hide native PDF viewer UI if possible */}
                <iframe src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full border-0 absolute inset-0" title="Resume Preview" />
              </div>
              <div className="mt-4 flex justify-end shrink-0">
                 <Button variant="outline" size="sm" onClick={() => setFile(null)} className="h-9 px-4 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/30 dark:hover:bg-red-900/20">
                   Remove Resume
                 </Button>
              </div>
            </div>
          ) : (
            <div className="w-full lg:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shrink-0 flex flex-col justify-center items-center">
                <div 
                  className={`w-full max-w-md aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-all duration-200 ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    id="resume-upload"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                  <Label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center justify-center gap-5 w-full h-full">
                    {parsing ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                        <RefreshCw className="h-14 w-14 text-blue-600 dark:text-blue-400 animate-spin relative z-10" />
                      </div>
                    ) : (
                      <div className="h-20 w-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shadow-sm">
                        <UploadCloud className="h-10 w-10" />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        {parsing ? "Analyzing Resume..." : "Upload Candidate Resume"}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                        Drag and drop your file here, or click to browse. We will automatically extract the details.
                      </p>
                      <div className="pt-4 flex items-center justify-center gap-2">
                        <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500">PDF</span>
                        <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500">DOCX</span>
                        <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500">Max 10MB</span>
                      </div>
                    </div>
                  </Label>
                </div>
            </div>
          )}

          {/* RIGHT: Form Pane (50%) */}
          <div className="w-full lg:w-1/2 p-0 overflow-y-auto bg-white dark:bg-slate-900 relative">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              
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
                    <PhoneInput placeholder="Enter phone" defaultCountry={job?.market === "US" ? "US" : "IN"} value={formData.phone} onChange={(v) => setFormData({...formData, phone: v?.toString() || ""})} className="h-10 bg-slate-50 dark:bg-slate-950 [&>div]:bg-transparent" />
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
                    <Input placeholder="e.g. React, Node.js, Python, AWS" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
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
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Location <span className="text-red-500">*</span></Label>
                    <Input placeholder="e.g. New York, NY" value={formData.currentLocation} onChange={(e) => setFormData({...formData, currentLocation: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Preferred Location <span className="text-red-500">*</span></Label>
                    <Input placeholder="e.g. Remote, Boston" value={formData.preferredLocations} onChange={(e) => setFormData({...formData, preferredLocations: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
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
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current CTC <span className="text-red-500">*</span></Label>
                      <Input type="number" placeholder="e.g. 120000" value={formData.currentCtc} onChange={(e) => setFormData({...formData, currentCtc: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expected CTC <span className="text-red-500">*</span></Label>
                      <Input type="number" placeholder="e.g. 150000" value={formData.expectedCtc} onChange={(e) => setFormData({...formData, expectedCtc: e.target.value})} className="h-10 bg-slate-50 dark:bg-slate-950 focus:bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Group 5: Submission Notes */}
              <div className="space-y-4 pb-8">
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
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Please ensure all <span className="text-red-500 font-bold">*</span> required fields are filled.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose} className="h-10 px-6 font-semibold text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || parsing || !file} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md disabled:opacity-50 transition-all">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : parsing ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Extracting...</>
              ) : (
                "Submit Candidate"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
