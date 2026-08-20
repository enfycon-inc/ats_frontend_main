"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { PhoneInput } from "@/components/ui/phone-input";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

export default function AddCandidateModal({ isOpen, onClose, job }: { isOpen: boolean; onClose: () => void; job: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [submittedRate, setSubmittedRate] = useState("");
  const [recruiterComment, setRecruiterComment] = useState("");

  const handleSubmit = async () => {
    if (!file || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill required fields and attach a CV.");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload external CV — phone is already in E.164 format from PhoneInput
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
      await atsApi.submissions.create({
        candidateId: parsedCandidateId || candidate.id || 1,
        jobId: job?.id,
        recruiterId: currentUser?.id || "d2ec2da8-816c-410a-8c0c-4737b5ae21cf",
        finalStatus: "PENDING_APPROVAL",
        submittedRate: submittedRate.trim() || null,
        recruiterComment: recruiterComment.trim() || null
      });

      // Clear states
      setFormData({ firstName: "", lastName: "", email: "", phone: "" });
      setFile(null);
      setSubmittedRate("");
      setRecruiterComment("");
      toast.success("Candidate CV submitted successfully!");
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Submit Candidate
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Submitting profile for <span className="font-semibold text-slate-800 dark:text-slate-200">{job?.jobCode} - {job?.jobTitle}</span>
            </DialogDescription>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
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
                className="h-9 text-xs"
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
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* 2-Column Contact */}
          <div className="grid grid-cols-2 gap-4">
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
                className="h-9 text-xs"
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
              className="h-9 text-xs"
            />
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <Label htmlFor="recruiterComment" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Recruiter Comments / Notes
            </Label>
            <textarea
              id="recruiterComment"
              placeholder="Add any relevant notes or candidate highlights..."
              value={recruiterComment}
              onChange={(e) => setRecruiterComment(e.target.value)}
              className="w-full min-h-[64px] text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Resume Upload Dropzone */}
          <div className="space-y-1.5">
            <Label htmlFor="cv" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Resume Document (CV) <span className="text-red-500">*</span>
            </Label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-950/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer">
              <input
                type="file"
                id="cv"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="cv" className="cursor-pointer flex flex-col items-center gap-1.5">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Icon icon="heroicons:document-arrow-up" className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {file ? file.name : "Click to select or drag & drop CV (PDF, DOC, DOCX)"}
                </span>
                {file && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    ✓ Attached ({Math.round(file.size / 1024)} KB)
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={handleClose} className="h-9 px-4 border-slate-300 font-semibold cursor-pointer">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading} className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs">
            {loading ? "Submitting..." : "Submit Candidate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
