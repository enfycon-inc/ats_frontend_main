"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";

export function CandidateSubmissionModal({
  open,
  onOpenChange,
  job,
  currentUser,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  job: any;
  currentUser: any;
  onSuccess: () => void;
}) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  // Common Fields
  const [source, setSource] = useState("Dice Sourcing");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [totalExperienceYears, setTotalExperienceYears] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  
  // Full Time Fields
  const [skills, setSkills] = useState("");
  const [relevantExperienceYears, setRelevantExperienceYears] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("");

  // Contractual Fields
  const [availabilityToStart, setAvailabilityToStart] = useState("");
  const [submittedRate, setSubmittedRate] = useState(""); // Bill Rate

  const [recruiterComment, setRecruiterComment] = useState("");

  const isContractual = job?.type?.toLowerCase().includes("contract") || job?.jobType?.toLowerCase().includes("contract");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a CV file to upload.");
      return;
    }

    setUploadingCv(true);
    try {
      const overrides: any = {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        relevantExperienceYears: relevantExperienceYears.trim() || undefined,
        currentCompany: currentCompany.trim() || undefined,
        availabilityToStart: availabilityToStart.trim() || undefined,
        currentCtc: currentCtc.trim() || undefined,
        expectedCtc: expectedCtc.trim() || undefined,
        noticePeriodDays: noticePeriodDays.trim() || undefined,
        skills: skills.trim() || undefined,
        currentLocation: currentLocation.trim() || undefined,
        preferredLocations: preferredLocations.trim() || undefined,
      };

      const res = await atsApi.candidates.uploadCv(uploadFile, source, overrides);
      const candidate = res.candidate;

      await atsApi.submissions.create({
        candidateId: candidate.id,
        jobId: job.id,
        recruiterId: currentUser?.dbId || currentUser?.keycloakId || "system",
        finalStatus: "PENDING_APPROVAL",
        submittedRate: submittedRate.trim() || null,
        recruiterComment: recruiterComment.trim() || null,
      });

      toast.success(`Candidate submitted successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setUploadingCv(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-0 overflow-hidden font-sans">
        <div className="p-5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850/40">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase border-0 px-2 py-0.5">
              {isContractual ? "Contractual Submission" : "Full-Time Submission"}
            </Badge>
            <span className="text-[10px] font-mono text-neutral-500 font-bold">{job?.jobCode}</span>
          </div>
          <DialogTitle className="text-lg font-black text-neutral-900 dark:text-white mt-1.5">
            Submit Candidate to Pipeline
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500 mt-0.5">
            Please fill in the required fields for {isContractual ? "Contractual" : "Full-time"} roles and attach the CV.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          {/* File Dropzone */}
          <div className="border-2 border-dashed border-neutral-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center bg-neutral-50/50 transition-all">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              id="cv-upload-input"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <label htmlFor="cv-upload-input" className="cursor-pointer flex flex-col items-center gap-1.5">
              <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-neutral-700 dark:text-neutral-200">
                {uploadFile ? uploadFile.name : "Click to select CV file (Required)"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-450">Candidate Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-450">Email Id</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-450">Contact No</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-450">Total Exp (Years)</label>
              <Input value={totalExperienceYears} onChange={e => setTotalExperienceYears(e.target.value)} type="number" step="0.1" required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-450">Current Location</label>
              <Input value={currentLocation} onChange={e => setCurrentLocation(e.target.value)} required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-450">Preferred Location</label>
              <Input value={preferredLocations} onChange={e => setPreferredLocations(e.target.value)} required className="h-8 text-xs" />
            </div>

            {isContractual ? (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Source (Bench/Market)</label>
                  <select value={source} onChange={e => setSource(e.target.value)} className="w-full h-8 border border-neutral-300 rounded-lg px-2 text-xs">
                    <option value="Bench">Bench</option>
                    <option value="Market">Market</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Availability to Start</label>
                  <Input value={availabilityToStart} onChange={e => setAvailabilityToStart(e.target.value)} placeholder="e.g. Immediate, 2 Weeks" required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Bill Rate</label>
                  <Input value={submittedRate} onChange={e => setSubmittedRate(e.target.value)} placeholder="$70/hr" required className="h-8 text-xs" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Skills</label>
                  <Input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Java, React..." required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Relevant Exp (Years)</label>
                  <Input value={relevantExperienceYears} onChange={e => setRelevantExperienceYears(e.target.value)} type="number" step="0.1" required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Current CTC</label>
                  <Input value={currentCtc} onChange={e => setCurrentCtc(e.target.value)} type="number" required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Expected CTC</label>
                  <Input value={expectedCtc} onChange={e => setExpectedCtc(e.target.value)} type="number" required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Current Company</label>
                  <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-neutral-450">Notice Period (Days)</label>
                  <Input value={noticePeriodDays} onChange={e => setNoticePeriodDays(e.target.value)} type="number" required className="h-8 text-xs" />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-neutral-100 gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={uploadingCv || !uploadFile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9">
              {uploadingCv ? "Submitting..." : "Submit Candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
