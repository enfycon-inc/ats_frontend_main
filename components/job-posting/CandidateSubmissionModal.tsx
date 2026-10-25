"use client";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, UploadCloud, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { candidateAmountSchema, candidatePhoneSchema, normalizeCandidateLocation } from "@/lib/candidate-submission-input";
import { ContractCandidateSubmissionForm } from '@/components/candidates/contract-candidate-submission-form';
import { CandidateForm } from "@/components/candidates/candidate-form";
import { ResumePages } from '@/components/candidates/resume-pages';
import { existingCandidateForm } from '@/lib/existing-candidate-submission';

function MatchScoreCard({ assessment, state }: { assessment: Awaited<ReturnType<typeof atsApi.submissions.previewAssessment>> | null; state: 'idle' | 'updating' | 'ready' | 'unavailable' }) {
  const scoreVisible = state === 'ready' && assessment?.score != null;
  return <section aria-label="Job match evidence score" className="shrink-0 rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900 dark:bg-blue-950/30">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2"><h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Job match</h3><span className="text-[10px] text-slate-500">Evidence score</span></div>
      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-slate-900 dark:text-blue-300">{state === 'updating' ? 'Updating…' : scoreVisible ? 'Provisional' : state === 'unavailable' ? 'Unavailable' : 'No score yet'}</span>
    </div>
    <div className="mt-1 flex items-center gap-3"><strong className="text-2xl leading-none text-slate-900 dark:text-white">{scoreVisible ? `${assessment.score}%` : '—'}</strong><span className="text-[11px] text-slate-600 dark:text-slate-300">{scoreVisible ? `Evidence coverage ${assessment.coverage}%` : state === 'updating' ? 'Rechecking current form details' : 'Upload or select a candidate to begin'}</span></div>
    {scoreVisible && <details className="mt-2 text-[11px]"><summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">View evidence breakdown</summary><div className="mt-2 space-y-1.5">{assessment.criteria.map((criterion, index) => <div key={`${criterion.key}:${index}`} className="rounded border border-blue-100 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-900/70"><div className="font-semibold">{criterion.requirement}: {criterion.finding.replaceAll('_', ' ').toLowerCase()}</div><div className="mt-0.5 text-slate-600 dark:text-slate-300">{criterion.evidence}</div></div>)}</div></details>}
    <p className="mt-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">Calculated using rules and a skill dictionary, not an LLM. Results may be incomplete or incorrect. Review candidate details and evidence before submitting. This score is not a hiring recommendation.</p>
  </section>;
}

export function CandidateSubmissionModal({ open: isOpen, onOpenChange: onClose, job, onSuccess, existingCandidateId }: { open: boolean; onOpenChange: (open: boolean) => void; job: any; onSuccess?: () => void; existingCandidateId?: string | number }) {
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [updateProfile, setUpdateProfile] = useState(false);
  const canUpdateProfile = atsApi.auth.getCurrentUser()?.permissions?.includes('candidate:edit') === true;
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Awaited<ReturnType<typeof atsApi.submissions.previewAssessment>> | null>(null);
  const [assessmentState, setAssessmentState] = useState<'idle' | 'updating' | 'ready' | 'unavailable'>('idle');
  const assessmentRequest = useRef(0);
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
    preferredLocationMode: "SPECIFIC_LOCATIONS",
    source: "Market", sourceChannel: "", sourceDetail: "",
    skills: "",
    relevantExperienceYears: "",
    currentCtc: "",
    expectedCtc: "",
    currentCompany: "",
    noticePeriodDays: "",
    availabilityToStart: ""
  });
  
  const [recruiterComment, setRecruiterComment] = useState("");

  const savedJobType = job?.type?.trim() || job?.jobType?.trim() || job?.job_type?.trim() || '';
  const isContractual = /^(contract|contractual|contract to hire|contract-to-hire|c2h|freelance)$/i.test(savedJobType.trim());
  const isIndia = !job?.market || /^(IN|IND|INDIA|DOMESTIC)$/i.test(job.market);
  const SubmissionForm = isContractual ? ContractCandidateSubmissionForm : CandidateForm;
  useEffect(() => {
    if (!isOpen || !existingCandidateId) return;
    let cancelled = false;
    assessmentRequest.current++;
    setAssessment(null); setAssessmentState('idle');
    setCandidateLoading(true); setCandidateError(''); setUpdateProfile(false);
    atsApi.candidates.get(existingCandidateId).then(candidate => {
      if (!cancelled) {
        const prefilled = existingCandidateForm(candidate);
        // Existing annual CTC must never be presented as monthly contract pay.
        if (isContractual && !/^(MONTH|MONTHLY)$/i.test(candidate.ctcTerm || candidate.compensationPeriod || '')) {
          prefilled.currentCtc = ''; prefilled.expectedCtc = '';
        }
        setFormData(prefilled);
      }
    }).catch(error => { if (!cancelled) setCandidateError(error.message || 'Could not load candidate.'); })
      .finally(() => { if (!cancelled) setCandidateLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, existingCandidateId, isContractual]);

  useEffect(() => {
    if (!isOpen || (!file && !existingCandidateId) || parsing || candidateLoading || candidateError || !job?.id) return;
    const skills = formData.skills.split(',').map(value => value.trim()).filter(Boolean);
    if (!skills.length && !formData.totalExperienceYears && !formData.currentLocation) return;
    const requestId = ++assessmentRequest.current;
    setAssessmentState('updating');
    const timer = window.setTimeout(() => {
      atsApi.submissions.previewAssessment({
        jobId: String(job.id),
        ...(existingCandidateId ? { candidateId: String(existingCandidateId) } : {}),
        skills,
        ...(formData.totalExperienceYears ? { totalExperienceYears: Number(formData.totalExperienceYears) } : {}),
        ...(formData.currentLocation ? { currentLocation: formData.currentLocation } : {}),
        preferredLocationMode: formData.preferredLocationMode as 'SPECIFIC_LOCATIONS' | 'REMOTE_ONLY' | 'REMOTE_OR_LOCATIONS',
        preferredLocations: formData.preferredLocationMode === 'REMOTE_ONLY' ? [] : formData.preferredLocations.split(',').map(value => value.trim()).filter(Boolean),
        ...(formData.noticePeriodDays !== '' ? { noticePeriodDays: Number(formData.noticePeriodDays) } : {}),
      }).then(result => {
        if (requestId === assessmentRequest.current) { setAssessment(result); setAssessmentState(result.score == null ? 'unavailable' : 'ready'); }
      }).catch(() => { if (requestId === assessmentRequest.current) setAssessmentState('unavailable'); });
    }, 500);
    return () => { window.clearTimeout(timer); };
  }, [isOpen, file, existingCandidateId, parsing, candidateLoading, candidateError, job?.id, formData.skills, formData.totalExperienceYears, formData.currentLocation, formData.preferredLocations, formData.preferredLocationMode, formData.noticePeriodDays]);

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    assessmentRequest.current++;
    setAssessment(null); setAssessmentState('idle');
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
      parsedLocation = await normalizeCandidateLocation(parsed?.location || parsedLocation || "", job?.market?.toUpperCase() === "US" ? "US" : "IN");

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
      
      // Ensure phone number has no spaces to satisfy E.164
      if (phone) {
        phone = phone.replace(/\s+/g, '');
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
      totalExperienceYears: "", currentLocation: "", preferredLocations: "", preferredLocationMode: "SPECIFIC_LOCATIONS",
      source: "Market", sourceChannel: "", sourceDetail: "", skills: "", relevantExperienceYears: "",
      currentCtc: "", expectedCtc: "", currentCompany: "", noticePeriodDays: "",
      availabilityToStart: ""
    });
    setFile(null);
    assessmentRequest.current++;
    setAssessment(null);
    setAssessmentState('idle');
    setAutoFilled(false);
    setParsing(false);
    setRecruiterComment("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!savedJobType) { toast.error('Job type is unavailable. Reload the job before submitting.'); return; }
    if (candidateLoading || candidateError) return;
    if (!file && !existingCandidateId) {
      toast.error("Please upload candidate resume (CV).");
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill in first name, last name, and email address.");
      return;
    }
    if (!formData.skills.trim() || !/^\d+(?:\.\d+)?$/.test(formData.relevantExperienceYears) || !formData.currentCompany.trim()) { toast.error('Complete primary skills, relevant experience and current company.'); return; }

    const phoneCheck = candidatePhoneSchema.safeParse(formData.phone);
    if (!phoneCheck.success) { toast.error(phoneCheck.error.issues[0].message); return; }
    if (!isContractual && (!candidateAmountSchema.safeParse(formData.currentCtc).success || !candidateAmountSchema.safeParse(formData.expectedCtc).success)) { toast.error('Enter valid current and expected CTC amounts.'); return; }
    if (!/^\d+$/.test(formData.noticePeriodDays) || !Number.isSafeInteger(Number(formData.noticePeriodDays))) { toast.error("Select Immediate or enter notice period days."); return; }
    if (formData.source === 'Market' && (!formData.sourceChannel || (['Job Portal', 'Other'].includes(formData.sourceChannel) && !formData.sourceDetail.trim()))) { toast.error('Select a source channel and enter any required source details.'); return; }
    if (!candidateAmountSchema.safeParse(formData.expectedCtc).success || Number(formData.expectedCtc) <= 0 || (formData.currentCtc && !candidateAmountSchema.safeParse(formData.currentCtc).success)) { toast.error('Enter valid current and expected compensation amounts.'); return; }
    if (!/^\d+(?:\.\d+)?$/.test(formData.totalExperienceYears) || !formData.currentLocation.trim() || (formData.preferredLocationMode !== 'REMOTE_ONLY' && !formData.preferredLocations.trim())) { toast.error('Complete experience, locations and availability.'); return; }
    const availabilityToStart = isContractual ? (formData.noticePeriodDays === "0" ? "Immediate" : `${Number(formData.noticePeriodDays)} days`) : formData.availabilityToStart;
    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const uploadResponse = existingCandidateId ? { candidate: { id: existingCandidateId } } : await atsApi.candidates.uploadCv(file!, formData.source, {
        fullName,
        jobId: job.id,
        totalExperienceYears: formData.totalExperienceYears,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email,
        phone: formData.phone || "",
        relevantExperienceYears: formData.relevantExperienceYears,
        currentCompany: formData.currentCompany,
        availabilityToStart,
        noticePeriodDays: formData.noticePeriodDays,
        skills: formData.skills,
        currentLocation: formData.currentLocation,
        preferredLocations: formData.preferredLocationMode === 'REMOTE_ONLY' ? '' : formData.preferredLocations,
        preferredLocationMode: formData.preferredLocationMode as 'SPECIFIC_LOCATIONS' | 'REMOTE_ONLY' | 'REMOTE_OR_LOCATIONS',
      });

      const candidate = uploadResponse.candidate as { id: string | number; dbId?: string };

      const currentUser = atsApi.auth.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("You must be logged in to submit a candidate.");
      }
      
      await atsApi.submissions.create({
        candidateId: candidate.dbId || candidate.id,
        jobId: job?.id,
        recruiterId: currentUser.id,
        finalStatus: "PENDING_APPROVAL",
        recruiterComment: recruiterComment.trim() || null,
        currentCompensation: formData.currentCtc,
        expectedCompensation: formData.expectedCtc,
        compensationCurrency: isIndia ? 'INR' : 'USD',
        compensationInputUnit: isContractual ? 'MONTH' : isIndia ? 'LPA' : 'YEAR',
        sourceCategory: formData.source,
        sourceChannel: formData.source === 'Market' ? formData.sourceChannel : undefined,
        sourceDetail: formData.source === 'Market' ? formData.sourceDetail : undefined,
        availabilityToStart,
        candidateRelevantExperience: formData.relevantExperienceYears ? Number(formData.relevantExperienceYears) : undefined,
        candidateNoticePeriod: Number(formData.noticePeriodDays),
        preferredLocationMode: formData.preferredLocationMode,
        ...(existingCandidateId ? { verifiedCandidate: { ...formData, preferredLocations: formData.preferredLocationMode === 'REMOTE_ONLY' ? '' : formData.preferredLocations, skills: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean) }, updateCandidateSkills: updateProfile } : {})
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
        </div>

        {/* Body Container */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          
          {/* LEFT: Preview Pane (50%) */}
          {existingCandidateId ? (
            <div className="w-full lg:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 flex flex-col gap-3 min-h-48 overflow-hidden">
              <MatchScoreCard assessment={assessment} state={assessmentState} />
              <h3 className="text-sm font-semibold">Existing resume</h3>
              <p className="text-xs text-slate-500">Review the stored resume and verify the candidate details. No new upload required.</p>
              <div className="min-h-0 flex-1"><ResumePages candidateId={existingCandidateId} /></div>
            </div>
          ) : file ? (
            <div className="w-full lg:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/50 p-4 shrink-0 overflow-hidden flex flex-col">
              <MatchScoreCard assessment={assessment} state={assessmentState} />
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col relative">
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

          {/* RIGHT: Componentized Form Pane (50%) */}
          <div className="w-full lg:w-1/2 p-0 bg-white dark:bg-slate-900 relative">
            {candidateLoading && <PageLoadingSkeleton variant="detail" compact />}
            {candidateError && <p role="alert" className="p-4 text-red-700">{candidateError}. Close and reopen to retry.</p>}
            <SubmissionForm
              formData={formData} 
              setFormData={setFormData} 
              recruiterComment={recruiterComment} 
              setRecruiterComment={setRecruiterComment}
              job={job}
              isContractual={isContractual}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {existingCandidateId && <label className="block text-xs mb-2"><input type="checkbox" checked={updateProfile} disabled={!canUpdateProfile || loading} onChange={event => setUpdateProfile(event.target.checked)} className="mr-2" />Also update candidate profile skills{!canUpdateProfile && ' (requires candidate edit permission)'}</label>}
            Please ensure all <span className="text-red-500 font-bold">*</span> required fields are filled.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose} className="h-10 px-6 font-semibold text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || parsing || candidateLoading || !!candidateError || (!file && !existingCandidateId)} className="h-10 px-8 bg-[#1a4fa0] hover:bg-[#163f80] text-white font-bold text-sm shadow-md disabled:opacity-50 transition-all">
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
