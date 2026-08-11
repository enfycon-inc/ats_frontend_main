"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atsApi } from "@/lib/ats-api";

interface SmtpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function SmtpConfigModal({ isOpen, onClose, onSave }: SmtpConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    profileName: '',
    email: '',
    password: '',
    smtpHost: '',
    smtpPort: '',
    imapHost: '',
    imapPort: '',
    requireSsl: false,
    requireTls: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.smtpHost) {
      alert("Please fill in the required fields (Email, Password, SMTP Host)");
      return;
    }

    setLoading(true);
    try {
      await atsApi.email.addCustomAccount(formData);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configure Email Provider</DialogTitle>
            <DialogDescription>
              Enter your SMTP and IMAP details below to connect a custom email account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profileName" className="text-right">Profile Name</Label>
              <Input id="profileName" name="profileName" value={formData.profileName} onChange={handleChange} className="col-span-3" placeholder="e.g. Sales Outreach" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email Address <span className="text-red-500">*</span></Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password <span className="text-red-500">*</span></Label>
              <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="col-span-3" required />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4 mt-2">
              <Label htmlFor="smtpHost" className="text-right">Outgoing SMTP Server</Label>
              <Input id="smtpHost" name="smtpHost" value={formData.smtpHost} onChange={handleChange} className="col-span-2" placeholder="smtp.example.com" />
              <div className="flex items-center gap-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input id="smtpPort" name="smtpPort" type="number" value={formData.smtpPort} onChange={handleChange} className="w-20" placeholder="587" />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imapHost" className="text-right">Incoming IMAP Server</Label>
              <Input id="imapHost" name="imapHost" value={formData.imapHost} onChange={handleChange} className="col-span-2" placeholder="imap.example.com" />
              <div className="flex items-center gap-2">
                <Label htmlFor="imapPort">Port</Label>
                <Input id="imapPort" name="imapPort" type="number" value={formData.imapPort} onChange={handleChange} className="w-20" placeholder="993" />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1"></div>
              <div className="col-span-3 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="requireSsl" checked={formData.requireSsl} onChange={handleChange} className="rounded border-neutral-300" />
                  Require SSL
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="requireTls" checked={formData.requireTls} onChange={handleChange} className="rounded border-neutral-300" />
                  Require TLS
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Submit'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
