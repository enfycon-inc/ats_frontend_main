import re

with open('app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Update Schema
code = code.replace(
    'commissionPercentage: zod.union([zod.number().min(0).max(100), zod.nan().transform(() => undefined)]).optional(),\n});',
    '''commissionPercentage: zod.union([zod.number().min(0).max(100), zod.nan().transform(() => undefined)]).optional(),
  msaSigned: zod.boolean().default(false),
  sowExecuted: zod.boolean().default(false),
  paymentTerms: zod.string().optional(),
  addPoc: zod.boolean().default(false),
  pocName: zod.string().optional(),
  pocDesignation: zod.string().optional(),
  pocEmail: zod.string().email("Invalid email").optional().or(zod.literal("")),
  pocPhone: zod.string().optional(),
});'''
)

# Insert Checkboxes and Payment Terms UI
UI_BLOCK = '''
            {/* Payment Terms */}
            <div className="space-y-1">
              <Label className="font-bold text-neutral-700 dark:text-neutral-300">Payment Terms</Label>
              <select
                {...register("paymentTerms")}
                className="w-full h-8 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded px-2.5 py-1 outline-hidden focus:border-primary text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-semibold"
              >
                <option value="">Select Terms</option>
                <option value="Immediate">Immediate</option>
                <option value="Net-30">Net-30</option>
                <option value="Net-45">Net-45</option>
                <option value="Net-60">Net-60</option>
                <option value="Net-90">Net-90</option>
              </select>
            </div>

            {/* Compliance Flags */}
            <div className="md:col-span-2 flex items-center gap-6 py-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" {...register("msaSigned")} className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4" />
                MSA Signed
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" {...register("sowExecuted")} className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4" />
                SOW Executed
              </label>
            </div>

            {/* Add POC Toggle */}
            <div className="md:col-span-2 pt-2 border-t mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" {...register("addPoc")} className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4" />
                + Add a Point of Contact (Optional)
              </label>
            </div>

            {watch("addPoc") && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-slate-900 p-3 rounded-md border border-neutral-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">POC Name *</Label>
                  <Input {...register("pocName")} className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="e.g. Suresh Kumar" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Designation</Label>
                  <Input {...register("pocDesignation")} className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="e.g. HR Head" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Email</Label>
                  <Input {...register("pocEmail")} type="email" className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="suresh@company.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Phone</Label>
                  <Input {...register("pocPhone")} className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="+91-9876543210" />
                </div>
              </div>
            )}
'''

code = code.replace('{/* About Company */}', UI_BLOCK + '\n            {/* About Company */}')

# Update Submit Handler
SUBMIT_MOD = '''
      const payload = {
        clientName: data.clientName,
        email: data.emailId,
        website: data.website || null,
        status: data.status,
        country: data.country,
        state: data.state || null,
        city: data.city || null,
        ownership: data.ownership,
        aboutCompany: data.aboutCompany || null,
        commissionPercentage: data.commissionPercentage || null,
        msaSigned: data.msaSigned,
        sowExecuted: data.sowExecuted,
        paymentTerms: data.paymentTerms || null
      };

      const res = await atsApi.clients.create(payload);
      const newClientId = res?.id || res?.data?.id;
      
      // If POC was added and we have the new client ID, create the contact
      if (newClientId && data.addPoc && data.pocName) {
        try {
          const pocPayload = {
            name: data.pocName,
            designation: data.pocDesignation || null,
            email: data.pocEmail || null,
            phone: data.pocPhone || null,
            isPrimary: true
          };
          await fetch(/api/ats/clients//contacts, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: Bearer  },
            body: JSON.stringify(pocPayload)
          });
        } catch (e) {
          console.error("Failed to add POC", e);
        }
      }
'''

code = re.sub(r'const payload = \{[\s\S]*?atsApi\.clients\.create\(payload\);', SUBMIT_MOD, code, count=1)

with open('app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Modal fields updated.')
