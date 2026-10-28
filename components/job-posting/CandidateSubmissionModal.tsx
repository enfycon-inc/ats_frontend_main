"use client";

import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RequirementsComparison } from "@/components/submissions/requirements-comparison";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, UploadCloud, RefreshCw, FileText, Maximize2, Minimize2 } from "lucide-react";
import toast from "react-hot-toast";
import { atsApi } from "@/lib/ats-api";
import { candidateAmountSchema, candidatePhoneSchema, normalizeCandidateLocation } from "@/lib/candidate-submission-input";
import { ContractCandidateSubmissionForm } from '@/components/candidates/contract-candidate-submission-form';
import { CandidateForm } from "@/components/candidates/candidate-form";
import { ResumePages } from '@/components/candidates/resume-pages';
import { existingCandidateForm } from '@/lib/existing-candidate-submission';

function UploadedResumePreview({ file }: { file: File }) {
  const [pages, setPages] = useState(0);
  const [error, setError] = useState(false);
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  useEffect(() => {
    let disposed = false;
    atsApi.candidates.uploadedResumePreview(file).then(result => { if (!disposed) setPages(result.pages); }).catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; };
  }, [file]);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const urls: string[] = [];
    if (pages) Promise.all(Array.from({ length: pages }, (_, index) => atsApi.candidates.uploadedResumePage(file, index + 1, controller.signal).then(blob => { urls[index] = URL.createObjectURL(blob); })))
      .then(() => { if (!disposed) setPageUrls([...urls]); }).catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [file, pages]);
  return <div aria-label="Resume preview" className="h-full w-full overflow-auto bg-slate-100 p-3">
    {error ? <p role="alert" className="p-4 text-center text-xs text-slate-600">Unable to display this resume. You can still submit it or choose another file.</p>
      : !pages ? <div className="flex h-full items-center justify-center text-xs text-slate-500">Preparing resume preview…</div>
      : pageUrls.length !== pages ? <div className="flex h-full items-center justify-center text-xs text-slate-500">Rendering {file.name}…</div>
      : pageUrls.map((url, index) => <img key={`${file.name}:${index}`} src={url} alt={`Resume page ${index + 1}`} className="mx-auto mb-3 h-auto w-full rounded border border-slate-200 bg-white shadow-sm" />)}
  </div>;
}

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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [resumeExpanded, setResumeExpanded] = useState(false);
  useEffect(() => { if (!isOpen) { setResumeExpanded(false); setBreakdownOpen(false); } }, [isOpen]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [updateProfile, setUpdateProfile] = useState(false);
  const canUpdateProfile = atsApi.auth.getCurrentUser()?.permissions?.includes('candidate:edit') === true;
  const [file, setFile] = useState<File | null>(null);
  const [unsupportedFileName, setUnsupportedFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Awaited<ReturnType<typeof atsApi.submissions.previewAssessment>> | null>(null);
  const [assessmentState, setAssessmentState] = useState<'idle' | 'updating' | 'ready' | 'unavailable'>('idle');
  const assessmentRequest = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = parsing || loading;
  const expectedClose = useRef(false);
  // filePickerOpen: true while the OS file-picker dialog is open.
  // The browser fires window.focus when the picker closes — BEFORE the
  // file input's onChange fires and before setParsing(true) runs.
  // We dispatch custom suppression events so DashboardContext and
  // data-table focus handlers can skip their side-effects during this window.
  const filePickerOpen = useRef(false);
  const lifecycle = useRef({ open: isOpen, busy: isBusy, phase: parsing ? 'parsing' : loading ? 'submitting' : 'idle' });
  lifecycle.current = { open: isOpen, busy: isBusy, phase: parsing ? 'parsing' : loading ? 'submitting' : 'idle' };

  useEffect(() => {
    if (isOpen) expectedClose.current = false;
  }, [isOpen]);

  useEffect(() => () => {
    if (lifecycle.current.open && !expectedClose.current) {
      console.warn('[candidate-submission] unexpected modal unmount', {
        busy: lifecycle.current.busy,
        phase: lifecycle.current.phase,
      });
    }
  }, []);

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

  const resumeToolbar = <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 lg:max-w-[55%]">
    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
    <span title={file?.name || 'Stored resume'} className="min-w-0 max-w-48 truncate text-xs font-semibold">{file?.name || 'Stored resume'}</span>
    <Button onClick={() => setBreakdownOpen(true)} variant="ghost" size="sm" className="h-8 shrink-0 bg-blue-50 px-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      {assessmentState === 'updating' ? 'Updating…' : assessmentState === 'ready' && assessment?.score != null ? `Match ${assessment.score}% · Provisional` : assessmentState === 'unavailable' ? 'Match unavailable' : 'No score yet'} · Details
    </Button>
    <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" aria-label={resumeExpanded ? 'Exit full screen' : 'Open full screen'} aria-pressed={resumeExpanded} onClick={() => setResumeExpanded(value => !value)}>{resumeExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}{resumeExpanded && 'Exit full screen'}</Button>
    {!existingCandidateId && <Button variant="ghost" size="sm" disabled={isBusy} className="h-8 shrink-0 px-2 text-xs text-red-600" onClick={() => { setFile(null); setResumeExpanded(false); }}>Remove</Button>}
  </div>;

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    const extension = selectedFile.name.toLowerCase().match(/\.([^.]+)$/)?.[1];
    if (!extension || !['pdf', 'doc', 'docx'].includes(extension)) {
      setUnsupportedFileName(selectedFile.name || 'Selected file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    assessmentRequest.current++;
    setAssessment(null); setAssessmentState('idle');
    setFile(selectedFile);
    setParsing(true);
    setAutoFilled(false);
    console.info('[candidate-submission] resume parsing started');

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
      console.info('[candidate-submission] resume parsing finished');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      void handleFileSelect(droppedFile);
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
      expectedClose.current = true;
      onClose(false); if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isBusy) return;
    expectedClose.current = true;
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
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && isBusy) {
        console.warn('[candidate-submission] blocked dialog close request', { phase: lifecycle.current.phase });
        return;
      }
      if (!open) handleClose();
    }}>
      <DialogContent
        aria-busy={isBusy}
        onEscapeKeyDown={(event) => {
          if (breakdownOpen) { event.preventDefault(); return; }
          if (resumeExpanded) { event.preventDefault(); setResumeExpanded(false); return; }
          if (isBusy) {
            console.warn('[candidate-submission] blocked Escape dismissal', { phase: lifecycle.current.phase });
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (breakdownOpen) { event.preventDefault(); return; }
          if (isBusy) {
            console.warn('[candidate-submission] blocked outside dismissal', {
              phase: lifecycle.current.phase,
              interaction: event.detail.originalEvent.type,
            });
            event.preventDefault();
          }
        }}
        className={`${resumeExpanded ? "!inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !h-dvh !w-screen !rounded-none" : "max-w-[98vw] lg:max-w-[1400px] h-[95vh] w-full rounded-xl"} p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 font-sans flex flex-col`}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between shrink-0 pr-12">
          <div className={resumeExpanded ? "sr-only" : "min-w-0"}>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Submit Candidate ({isContractual ? "Contractual" : "Full-Time"})
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Submitting profile for <span className="font-semibold text-slate-800 dark:text-slate-200">{job?.jobCode} - {job?.jobTitle}</span>
            </DialogDescription>
          </div>
          {(file || existingCandidateId) && resumeToolbar}
        </div>

        {/* Body Container */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          
          {/* LEFT: Preview Pane (50%) */}
          {existingCandidateId ? (
            <div className={`flex min-h-0 flex-1 flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 ${resumeExpanded ? 'w-full' : 'w-full lg:w-1/2'}`}>
              <div className="flex min-h-0 flex-1 flex-col"><ResumePages candidateId={existingCandidateId} /></div>
            </div>
          ) : file ? (
            <div className={`flex min-h-0 flex-1 flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 ${resumeExpanded ? 'w-full' : 'w-full lg:w-1/2'}`}>
              <div className="relative min-h-0 flex-1 overflow-hidden bg-white dark:bg-slate-900">
                {file.name.toLowerCase().endsWith('.pdf')
                  ? <iframe src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="absolute inset-0 h-full w-full border-0" title="Resume Preview" />
                  : <div className="absolute inset-0"><UploadedResumePreview file={file} /></div>}
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
                    onClick={() => {
                      // Signal that the OS file-picker is opening.
                      // DashboardContext + data-table focus handlers check
                      // for the filePicker:open event and skip side-effects.
                      filePickerOpen.current = true;
                      window.dispatchEvent(new CustomEvent('filePicker:open'));
                    }}
                    onChange={(e) => {
                      // Picker closed, file selected — clear suppression BEFORE
                      // handleFileSelect so setParsing(true) takes effect cleanly.
                      filePickerOpen.current = false;
                      window.dispatchEvent(new CustomEvent('filePicker:close'));
                      handleFileSelect(e.target.files?.[0] || null);
                    }}
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
          <div className={`${resumeExpanded ? 'hidden' : 'block'} min-h-0 w-full overflow-y-auto lg:w-1/2 p-0 bg-white dark:bg-slate-900 relative`}>
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
        <div className={`${resumeExpanded ? "hidden" : "flex"} px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 items-center justify-between shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10`}>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {existingCandidateId && <label className="block text-xs mb-2"><input type="checkbox" checked={updateProfile} disabled={!canUpdateProfile || loading} onChange={event => setUpdateProfile(event.target.checked)} className="mr-2" />Also update candidate profile skills{!canUpdateProfile && ' (requires candidate edit permission)'}</label>}
            Please ensure all <span className="text-red-500 font-bold">*</span> required fields are filled.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={isBusy} onClick={handleClose} className="h-10 px-6 font-semibold text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
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
        <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}><DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[1000px]">
          <header className="flex shrink-0 items-center justify-between border-b px-6 py-4 pr-12"><div><DialogTitle className="text-sm font-bold">Match breakdown</DialogTitle><DialogDescription className="text-xs">Job requirements compared with the current candidate profile.</DialogDescription></div><Button autoFocus variant="outline" size="sm" onClick={() => setBreakdownOpen(false)}>Close</Button></header>
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 lg:p-6">
            <MatchScoreCard assessment={assessment} state={assessmentState} />
            <RequirementsComparison assessment={assessment} submission={{
              candidateSkills: formData.skills.split(',').map(value => value.trim()).filter(Boolean),
              candidateCurrentLocation: formData.currentLocation || undefined,
              candidateExperience: formData.totalExperienceYears === '' ? null : Number(formData.totalExperienceYears),
              candidateNoticePeriod: formData.noticePeriodDays === '' ? null : Number(formData.noticePeriodDays),
              jobSkillsRequired: job?.skillsRequired || job?.primarySkills,
              jobSecondarySkills: job?.secondarySkills, jobDegree: job?.degree,
              jobNoticePeriod: job?.noticePeriod, jobExperienceMin: job?.expMin,
              jobExperienceMax: job?.expMax, jobLocation: job?.city || job?.location,
              jobWorkMode: job?.workMode,
            }} />
          </div>
        </DialogContent></Dialog>
    <Dialog open={Boolean(unsupportedFileName)} onOpenChange={open => { if (!open) setUnsupportedFileName(''); }}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-50 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-400"><FileText className="h-5 w-5" /></div>
          <div className="space-y-1"><DialogTitle className="text-sm font-bold">Unsupported file type</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">“{unsupportedFileName}” can’t be uploaded here. Choose a PDF, DOC, or DOCX resume.</DialogDescription>
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={() => setUnsupportedFileName('')} className="h-9 bg-indigo-600 text-xs text-white hover:bg-indigo-700">Choose supported file</Button></div>
      </DialogContent>
    </Dialog>
    </>
  );
}
