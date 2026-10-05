"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { atsApi } from "@/lib/ats-api";

export function ContactDialog({ open, onOpenChange, clientId, onSaved, endClient = false, market = "IN" }: {
  open: boolean; onOpenChange: (open: boolean) => void; clientId: string | null;
  onSaved: (contact: any) => void; endClient?: boolean; market?: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState("");
  const [customDesignation, setCustomDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || saving) return;
    if (phone && !isValidPhoneNumber(phone)) return toast.error("Enter a valid international phone number.");
    setSaving(true);
    try {
      const response = await atsApi.clients.createContact(clientId, {
        name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
        designation: (designation === "Other" ? customDesignation.trim() : designation) || undefined,
        email: email.trim() || undefined, phone: phone || undefined,
      });
      const contact = await response.json();
      onSaved(contact);
      toast.success("Contact saved.");
      onOpenChange(false);
      setFirstName(""); setLastName(""); setDesignation(""); setCustomDesignation(""); setEmail(""); setPhone("");
    } catch (error: any) {
      toast.error(error.message || "Could not save contact. Please try again.");
    } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader><DialogTitle>{endClient ? "Add End Client Contact" : "Add Point of Contact"}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="contact-first">First Name *</Label><Input id="contact-first" required value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
          <div><Label htmlFor="contact-last">Last Name</Label><Input id="contact-last" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
        </div>
        <div><Label htmlFor="contact-designation">Designation</Label>
          <select id="contact-designation" className="w-full h-9 rounded border px-2 text-sm" value={designation} onChange={e => setDesignation(e.target.value)}>
            <option value="">Select Designation</option>{["HR Manager", "Talent Acquisition", "Recruiter", "CEO", "CTO", "Director", "Other"].map(value => <option key={value}>{value}</option>)}
          </select>
          {designation === "Other" && <Input aria-label="Other designation" required placeholder="Enter designation" value={customDesignation} onChange={e => setCustomDesignation(e.target.value)} />}
        </div>
        <div><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="contact-phone">Mobile Number</Label><PhoneInput id="contact-phone" market={market} value={phone} onChange={value => setPhone(value || "")} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !firstName.trim() || !clientId}>{saving ? "Saving…" : "Save Contact"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
