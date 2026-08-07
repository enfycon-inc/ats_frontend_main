"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
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
      // 1. Upload external CV and automatically save to candidate pool
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const uploadResponse = await atsApi.candidates.uploadCv(file, "Manual Upload", {
        fullName,
        email: formData.email,
        phone: formData.phone,
      });

      const candidate = uploadResponse.candidate;

      // Extract candidate database integer ID (e.g. from INT-MANUAL-12 or APP-12 formats)
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
        recruiterId: currentUser?.id || "d2ec2da8-816c-410a-8c0c-4737b5ae21cf", // Fallback if currentUser is missing
        finalStatus: "PENDING_APPROVAL",
        submittedRate: submittedRate.trim() || null,
        recruiterComment: recruiterComment.trim() || null
      });

      // Clear states
      setFormData({ firstName: "", lastName: "", email: "", phone: "" });
      setFile(null);
      setSubmittedRate("");
      setRecruiterComment("");
      toast.success("Candidate CV sourced and submitted successfully!");
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Source Candidate (Upload CV)</DialogTitle>
          <DialogDescription>
            Submit a candidate profile for <strong>{job?.jobCode} - {job?.jobTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right text-xs font-semibold">First Name</Label>
            <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="col-span-3 h-8 text-xs" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right text-xs font-semibold">Last Name</Label>
            <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="col-span-3 h-8 text-xs" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right text-xs font-semibold">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="col-span-3 h-8 text-xs" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right text-xs font-semibold">Phone</Label>
            <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="col-span-3 h-8 text-xs" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="submittedRate" className="text-right text-xs font-semibold">
              {job?.market === "IN" ? "Salary (Lakhs)" : "Pay Rate"}
            </Label>
            <Input 
              id="submittedRate" 
              placeholder={job?.market === "IN" ? "e.g. 12.5" : "e.g. $70/hr"} 
              value={submittedRate} 
              onChange={(e) => setSubmittedRate(e.target.value)} 
              className="col-span-3 h-8 text-xs" 
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="recruiterComment" className="text-right text-xs font-semibold pt-1.5">Comments</Label>
            <textarea
              id="recruiterComment"
              placeholder="Recruiter comments..."
              value={recruiterComment}
              onChange={(e) => setRecruiterComment(e.target.value)}
              className="col-span-3 min-h-16 text-xs bg-transparent border border-default-250 dark:border-slate-700 rounded-md p-2 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4 mt-2">
            <Label htmlFor="cv" className="text-right mt-2 text-xs font-semibold">Resume</Label>
            <div className="col-span-3">
              <div className="border-2 border-dashed border-default-300 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-default-50 dark:hover:bg-slate-800 transition-colors">
                <input 
                  type="file" 
                  id="cv" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="cv" className="cursor-pointer flex flex-col items-center">
                  <Icon icon="heroicons:document-arrow-up" className="h-8 w-8 text-indigo-500 mb-2" />
                  <span className="text-xs font-medium text-default-700 dark:text-slate-300">
                    {file ? file.name : "Click to upload CV (PDF/Doc)"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            {loading ? "Submitting..." : "Submit Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
