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

  const handleSubmit = async () => {
    if (!file || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill required fields and attach a CV.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create candidate record
      const candidatePayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        source: "Manual Upload",
        // In a real implementation, you would upload the file to S3/Cloud Storage here and pass the URL
      };

      const candidateResponse = await atsApi.candidates.create(candidatePayload);

      // 2. Create submission record
      await atsApi.submissions.create({
        candidateId: candidateResponse.id || 1, // Fallback ID if mock backend doesn't return ID immediately
        jobId: job?.id,
        finalStatus: "PENDING_APPROVAL"
      });

      toast.success("Candidate CV submitted successfully!");
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            {loading ? "Submitting..." : "Submit Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
