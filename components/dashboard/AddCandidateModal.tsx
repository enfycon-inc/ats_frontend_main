"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { UserPlus, Loader2, FileText, CheckCircle2, UploadCloud, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

export default function AddCandidateModal({ isOpen, onClose, job }: { isOpen: boolean; onClose: () => void; job: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [submittedRate, setSubmittedRate] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");

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

      // Fallback extraction if raw structure returned
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

      // Format phone for international phone input if missing country code
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
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        email: email || prev.email,
        phone: phone || prev.phone,
      }));

      if (firstName || email || phone) {
        setAutoFilled(true);
        toast.success("Resume parsed successfully.");
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
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
    setFile(null);
    setAutoFilled(false);
    setParsing(false);
    setSubmittedRate("");
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
      // 1. Upload external CV with verified form fields as overrides
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const uploadResponse = await atsApi.candidates.uploadCv(file, "Manual Upload", {
        fullName,
        email: formData.email,
        phone: formData.phone || "",
      });

      const candidate = uploadResponse.candidate;

      // Extract candidate database integer ID
      let parsedCandidateId = candidate.id;
      if (typeof parsedCandidateId === "string") {
        const parts = parsedCandidateId.split("-");
        const rawNum = parts[parts.length - 1];
        parsedCandidateId = parseInt(rawNum, 10);
      } else if (candidate.applicantId && typeof candidate.applicantId === "string") {
        const parts = candidate.applicantId.split("-");
        const rawNum = parts[parts.length - 1];
        parsedCandidateId = parseInt(rawNum, 10);
      }

      // 2. Create submission record
      const currentUser = atsApi.auth.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("You must be logged in to submit a candidate.");
      }
      await atsApi.submissions.create({
        candidateId: parsedCandidateId || candidate.id || 1,
        jobId: job?.id,
        recruiterId: currentUser.id,
        finalStatus: "PENDING_APPROVAL",
        submittedRate: submittedRate.trim() || null,
        recruiterComment: recruiterComment.trim() || null
      });

      resetForm();
      toast.success("Candidate CV submitted successfully!");
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
    if (typeof document !== "undefined") {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }, 50);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl bg-white dark:bg-slate-900 font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              Submit Candidate
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Submitting profile for <span className="font-semibold text-slate-800 dark:text-slate-200">{job?.jobCode} - {job?.jobTitle}</span>
            </DialogDescription>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Step 1: CV Upload Dropzone at the Top */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cv" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Resume Document (CV)</span>
                <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                Auto-extracts contact details
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              id="cv"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20"
                    : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-400 hover:bg-slate-100/50"
                }`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Click to upload or drag & drop candidate CV
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      PDF, DOC, DOCX (Max 10MB)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {Math.round(file.size / 1024)} KB
                      </span>
                      {parsing ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> Extracting details...
                        </span>
                      ) : autoFilled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-500" /> Details extracted
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Attached
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsing || loading}
                    className="h-7 px-2.5 text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer shadow-none transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 mr-1 text-slate-500" /> Change CV
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Candidate Information */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidate Information
              </span>
              {autoFilled && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  Extracted from resume. Edit if needed.
                </span>
              )}
            </div>

            {/* 2-Column Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="e.g. John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-9 text-xs font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            {/* 2-Column Contact */}
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 text-xs font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </Label>
                <PhoneInput
                  id="phone"
                  value={formData.phone}
                  onChange={(val) => setFormData({ ...formData, phone: val || "" })}
                  market={job?.market}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Submission Rate & Notes */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2.5">
              Submission Details
            </span>

            {/* Pay Rate / Salary */}
            <div className="space-y-1.5">
              <Label htmlFor="submittedRate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {job?.market === "IN" ? "Salary / CTC (Lakhs per annum)" : "Submitted Pay Rate ($/hr or $/yr)"}
              </Label>
              <Input
                id="submittedRate"
                placeholder={job?.market === "IN" ? "e.g. 12.5 LPA" : "e.g. $70/hr"}
                value={submittedRate}
                onChange={(e) => setSubmittedRate(e.target.value)}
                className="h-9 text-xs font-medium"
              />
            </div>

            {/* Comments */}
            <div className="space-y-1.5 mt-3">
              <Label htmlFor="recruiterComment" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recruiter Comments / Notes
              </Label>
              <textarea
                id="recruiterComment"
                placeholder="Add any relevant notes or candidate highlights..."
                value={recruiterComment}
                onChange={(e) => setRecruiterComment(e.target.value)}
                className="w-full min-h-[64px] text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 focus:border-slate-400 font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading || parsing}
            className="h-9 px-4 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 dark:hover:bg-slate-700 dark:hover:text-white font-medium cursor-pointer transition-colors"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || parsing}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? "Submitting..." : parsing ? "Extracting..." : "Submit Candidate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
