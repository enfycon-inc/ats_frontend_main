"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as zod from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Country, State } from "country-state-city";
import { toast } from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { atsApi } from "@/lib/ats-api";

const addClientSchema = zod.object({
  clientName: zod.string().min(1, "Client Name is required"),
  emailId: zod.string().optional(),
  website: zod.string().min(1, "Website is required"),
  status: zod.string().min(1, "Status is required"),
  category: zod.string().optional(),
  ownership: zod.string().min(1, "Ownership is required"),
  allowAllAccess: zod.boolean().optional(),
  practice: zod.string().optional(),
  country: zod.string().min(1, "Country is required"),
  state: zod.string().optional(),
  city: zod.string().optional(),
  address: zod.string().optional(),
  zipCode: zod.string().optional(),
  clientLead: zod.string().optional(),
  aboutCompany: zod.string().optional(),
  stopNotifications: zod.boolean().optional(),
});

type AddClientFormValues = zod.infer<typeof addClientSchema>;

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: (clientName: string) => void;
}

export function AddClientModal({ open, onOpenChange, onClientAdded }: AddClientModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, reset } = useForm<AddClientFormValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      status: "Active",
      country: "US",
      allowAllAccess: false,
      stopNotifications: false,
    }
  });

  const countryIso = watch("country");
  const countries = Country.getAllCountries();
  const states = countryIso ? State.getStatesOfCountry(countryIso) : [];

  const onSubmit = async (data: AddClientFormValues) => {
    try {
      const payload = {
        client_name: data.clientName,
        email_id: data.emailId,
        website: data.website,
        status: data.status,
        category: data.category,
        ownership: data.ownership, // For now, passing as string
        practice: data.practice,
        country: Country.getCountryByCode(data.country)?.name || data.country,
        state: states.find(s => s.isoCode === data.state)?.name || data.state,
        city: data.city,
        address: data.address,
        postal_code: data.zipCode,
        client_lead: data.clientLead,
        about_company: data.aboutCompany,
        stop_notifications: data.stopNotifications,
        // Optional logic: map allowAllAccess if needed in ownership JSON
      };

      await atsApi.clients.create(payload);
      toast.success("Client added successfully!");
      onClientAdded(data.clientName);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Client Name <span className="text-red-500">*</span></Label>
                <Input placeholder="Required" {...register("clientName")} />
                {errors.clientName && <p className="text-xs text-red-500">{errors.clientName.message}</p>}
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Website <span className="text-red-500">*</span></Label>
                <Input placeholder="Required" {...register("website")} />
                {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Category</Label>
                <select 
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background border-input"
                  {...register("category")}
                >
                  <option value="">Select</option>
                  <option value="IT">IT</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Practice</Label>
                <select 
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background border-input"
                  {...register("practice")}
                >
                  <option value="">Select</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Direct Hire">Direct Hire</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>State</Label>
                <select 
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background border-input"
                  {...register("state")}
                >
                  <option value="">Select State</option>
                  {states.map(s => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Address</Label>
                <Input placeholder="Address" {...register("address")} />
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Client Lead</Label>
                <Input placeholder="Search user..." {...register("clientLead")} />
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>About Company</Label>
                <Textarea className="resize-none" rows={4} {...register("aboutCompany")} />
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Email ID</Label>
                <Input placeholder="Required" {...register("emailId")} />
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Status <span className="text-red-500">*</span></Label>
                <select 
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background border-input"
                  {...register("status")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Ownership <span className="text-red-500">*</span></Label>
                <Input placeholder="Current user" {...register("ownership")} />
                {errors.ownership && <p className="text-xs text-red-500">{errors.ownership.message}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox 
                    id="allowAllAccess" 
                    checked={watch("allowAllAccess")}
                    onCheckedChange={(c) => setValue("allowAllAccess", !!c)} 
                  />
                  <label htmlFor="allowAllAccess" className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                    Allow Access to All users
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Country <span className="text-red-500">*</span></Label>
                <select 
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background border-input"
                  {...register("country")}
                >
                  {countries.map(c => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
                {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>City</Label>
                <Input placeholder="City" {...register("city")} />
              </div>

              <div className="grid grid-cols-[130px_1fr] items-center gap-4">
                <Label>Zip Code</Label>
                <Input placeholder="Zip Code" {...register("zipCode")} />
              </div>

              <div className="mt-8 space-y-2">
                <div className="flex items-start gap-2 pt-16">
                  <Checkbox 
                    id="stopNotifications" 
                    checked={watch("stopNotifications")}
                    onCheckedChange={(c) => setValue("stopNotifications", !!c)} 
                  />
                  <label htmlFor="stopNotifications" className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer leading-tight">
                    You want to stop sending email notification to client contact while doing Submit to Client?
                  </label>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
