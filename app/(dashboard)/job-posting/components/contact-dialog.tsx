"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { atsApi } from "@/lib/ats-api";
import { CheckCircle2 } from "lucide-react";

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
  const [addedContacts, setAddedContacts] = useState<any[]>([]);

  useEffect(() => {
    if (!open) {
      setAddedContacts([]);
      setFirstName(""); setLastName(""); setDesignation(""); setCustomDesignation(""); setEmail(""); setPhone("");
    }
  }, [open]);

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
      setAddedContacts(prev => [...prev, contact]);
      toast.success("Contact saved.");
      setFirstName(""); setLastName(""); setDesignation(""); setCustomDesignation(""); setEmail(""); setPhone("");
    } catch (error: any) {
      toast.error(error.message || "Could not save contact. Please try again.");
    } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader><DialogTitle>{endClient ? "Add End Client Contact" : "Add Point of Contact"}</DialogTitle></DialogHeader>
      
      {addedContacts.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-2 space-y-2">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">Recently Added</p>
          <div className="space-y-1">
            {addedContacts.map((c, i) => (
              <div key={i} className="flex items-center text-sm text-green-900 bg-green-100/50 px-2 py-1.5 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 shrink-0" />
                <span className="font-medium truncate">{c.name}</span>
                {c.email && <span className="text-green-700 ml-2 text-xs truncate">({c.email})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {addedContacts.length > 0 ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" disabled={saving || !firstName.trim() || !clientId}>
            {saving ? "Saving…" : "Save Contact"}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
