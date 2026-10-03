"use client";

import React, { useEffect } from "react";
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
import { atsApi } from "@/lib/ats-api";

const addClientSchema = zod.object({
  clientName: zod.string().min(1, "Client Name is required"),
  emailId: zod.string().email("Invalid email").min(1, "Email is required"),
  website: zod.string().optional(),
  status: zod.string().min(1, "Status is required"),
  ownership: zod.string().min(1, "Ownership is required"),
  country: zod.string().min(1, "Country is required"),
  state: zod.string().optional(),
  city: zod.string().optional(),
  aboutCompany: zod.string().optional(),
  commissionPercentage: zod.union([zod.number().min(0).max(100), zod.nan().transform(() => undefined)]).optional(),
});

type AddClientFormValues = zod.infer<typeof addClientSchema>;

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: (clientName: string) => void;
  market?: "US" | "IN";
  initialClientName?: string;
}

export function AddClientModal({ open, onOpenChange, onClientAdded, market = "US", initialClientName = "" }: AddClientModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, reset } = useForm<AddClientFormValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      clientName: initialClientName || "",
      status: "Active",
      country: market === "IN" ? "IN" : "US",
      commissionPercentage: undefined,
    }
  });

  const countryIso = watch("country");
  const countries = Country.getAllCountries();
  const states = countryIso ? State.getStatesOfCountry(countryIso) : [];

  const [hasDirectAddClearance, setHasDirectAddClearance] = React.useState<boolean>(true);

  // Pre-fill ownership with current logged-in user details, initial client name and business unit
  useEffect(() => {
    if (open) {
      if (initialClientName) {
        setValue("clientName", initialClientName);
      }
      const fetchProfile = async () => {
        try {
          const prof = await atsApi.auth.me();
          if (prof) {
            const onboardingUser = prof.fullName || prof.full_name || prof.name || prof.email || "";
            setValue("ownership", onboardingUser);

            const userRoles = (prof.roles || []).map((r: string) => String(r).toUpperCase().replace(/[\s-_]+/g, ''));
            const userPermissions = prof.permissions || [];
            const isSuperOrAdmin = userRoles.includes('TENANT_ADMIN') || userRoles.includes('SUPERADMIN');
            const directAdd = 
              userPermissions.includes('client:direct_add') || 
              userPermissions.includes('client:approve') || 
              (userPermissions.length === 0 && isSuperOrAdmin);
            
            setHasDirectAddClearance(directAdd);
          }
        } catch (e) {
          console.error("Failed to load user profile in modal", e);
        }
      };
      fetchProfile();
      setValue("country", market === "IN" ? "IN" : "US");
    }
  }, [open, market, setValue]);

  const onSubmit = async (data: AddClientFormValues) => {
    try {
      const activeBranch = (typeof window !== "undefined" ? localStorage.getItem("active_branch_name") : null) || "bbsr-domestic";
      const payload = {
        client_name: data.clientName,
        email_id: data.emailId,
        website: data.website || "",
        status: data.status,
        category: "",
        ownership: data.ownership,
        primary_owner: data.ownership,
        business_unit: activeBranch,
        practice: "",
        country: Country.getCountryByCode(data.country)?.name || data.country,
        state: states.find((s: any) => s.isoCode === data.state)?.name || data.state,
        city: data.city || "",
        address: "",
        postal_code: "",
        client_lead: "",
        about_company: data.aboutCompany || "",
        stop_notifications: false,
      };

      const res = await atsApi.clients.create(payload);
      if (res?.approval_status === 'PENDING_APPROVAL' || res?.status === 'Pending Approval') {
        toast.success("Client submitted for Manager / Delivery Head approval.");
      } else {
        toast.success("Client added and approved directly!");
      }
      onClientAdded(data.clientName);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to add client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            
            {/* Client Name */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Client Name <span className="text-red-500">*</span></Label>
              <Input 
                className="h-8 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700" 
                placeholder="e.g. Acme Corp" 
                {...register("clientName")} 
              />
              {errors.clientName && <p className="text-[10px] text-red-500 font-bold">{errors.clientName.message}</p>}
            </div>

            {/* Email ID */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Email ID <span className="text-red-500">*</span></Label>
              <Input 
                type="email"
                className="h-8 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700" 
                placeholder="e.g. contact@acme.com" 
                {...register("emailId")} 
              />
              {errors.emailId && <p className="text-[10px] text-red-500 font-bold">{errors.emailId.message}</p>}
            </div>

            {/* Website */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Website</Label>
              <Input 
                className="h-8 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700" 
                placeholder="e.g. www.acme.com" 
                {...register("website")} 
              />
              {errors.website && <p className="text-[10px] text-red-500 font-bold">{errors.website.message}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Status <span className="text-red-500">*</span></Label>
              <select 
                className="w-full h-8 px-2 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded text-xs text-neutral-800 dark:text-neutral-200 focus:border-primary outline-hidden cursor-pointer"
                {...register("status")}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <p className="text-[10px] text-red-500 font-bold">{errors.status.message}</p>}
            </div>

            {/* Country */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Country <span className="text-red-500">*</span></Label>
              <select 
                className="w-full h-8 px-2 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded text-xs text-neutral-800 dark:text-neutral-200 focus:border-primary outline-hidden cursor-pointer"
                {...register("country")}
              >
                {countries.map((c: any) => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
              {errors.country && <p className="text-[10px] text-red-500 font-bold">{errors.country.message}</p>}
            </div>

            {/* State */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">State</Label>
              <select 
                className="w-full h-8 px-2 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded text-xs text-neutral-800 dark:text-neutral-200 focus:border-primary outline-hidden cursor-pointer"
                {...register("state")}
              >
                <option value="">Select State</option>
                {states.map((s: any) => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">City</Label>
              <Input 
                className="h-8 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700" 
                placeholder="City" 
                {...register("city")} 
              />
            </div>

            {/* Ownership */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Ownership <span className="text-red-500">*</span></Label>
              <Input 
                readOnly
                disabled
                className="h-8 text-xs bg-neutral-100 dark:bg-slate-900 border-neutral-300 dark:border-slate-700 cursor-not-allowed opacity-90 font-medium" 
                placeholder="Auto-detected" 
                {...register("ownership")} 
              />
              {errors.ownership && <p className="text-[10px] text-red-500 font-bold">{errors.ownership.message}</p>}
            </div>

            
            {/* Placement Commission */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                Placement Commission (%)
                <span className="h-3.5 w-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold cursor-help" title="Standard permanent placement fee % of Annual CTC (e.g. 8.33)">?</span>
              </Label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register("commissionPercentage", { valueAsNumber: true })}
                placeholder="e.g. 8.33"
                className="w-full h-8 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 font-semibold"
              />
            </div>

{/* About Company */}
            <div className="md:col-span-2 space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">About Company</Label>
              <Textarea 
                className="resize-none text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700 focus:border-primary" 
                rows={3} 
                placeholder="Company info..."
                {...register("aboutCompany")} 
              />
            </div>

          </div>

          {!hasDirectAddClearance && (
            <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
              <span className="font-bold">Approval Gate Notice:</span> You do not have direct client approval permission. This client account will be created under <strong>Pending Approval</strong> and must be reviewed by a Delivery Head or Admin before associated job requisitions can go live.
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4 mt-6">
            <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {hasDirectAddClearance ? "Add Client" : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
