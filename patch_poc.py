with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """<div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">First Name *</Label>
                          <Input {...register("pocFirstName")} className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="First Name" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Last Name *</Label>
                          <Input {...register("pocLastName")} className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="Last Name" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Designation</Label>
                          <div className="flex gap-1">
                            <select
                              {...register("pocDesignation")}
                              className="h-7 px-1 flex-1 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded text-[10px] text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary"
                            >
                              <option value="">Select</option>
                              <option value="HR Manager">HR Manager</option>
                              <option value="Talent Acquisition">Talent Acquisition</option>
                              <option value="Recruiter">Recruiter</option>
                              <option value="CEO">CEO</option>
                              <option value="CTO">CTO</option>
                              <option value="Director">Director</option>
                              <option value="Other">Other</option>
                            </select>
                            {watch("pocDesignation") === "Other" && (
                              <Input
                                {...register("pocDesignationCustom")}
                                className="h-7 text-xs flex-1 bg-white dark:bg-slate-950"
                                placeholder="Custom"
                              />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Email</Label>
                          <Input {...register("pocEmail")} type="email" className="h-7 text-xs bg-white dark:bg-slate-950" placeholder="email@company.com" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Phone</Label>
                          <div className="flex gap-1">
                            <select
                              {...register("pocPhoneCode")}
                              className="h-7 px-1 w-16 bg-white dark:bg-slate-950 border border-neutral-300 dark:border-slate-700 rounded text-[10px] text-neutral-800 dark:text-neutral-200 outline-hidden focus:border-primary shrink-0"
                            >
                              <option value="+91">+91 (IN)</option>
                              <option value="+1">+1 (US)</option>
                              <option value="+44">+44 (UK)</option>
                              <option value="+61">+61 (AU)</option>
                              <option value="+971">+971 (AE)</option>
                            </select>
                            <Input {...register("pocPhone")} className="h-7 text-xs flex-1 bg-white dark:bg-slate-950" placeholder="9876543210" />
                          </div>
                        </div>"""

start = code.find('<div className="space-y-1">\n                      <Label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">POC Name *</Label>')
end = code.find('</div>\n                  )}', start)

if start != -1 and end != -1:
    code = code[:start] + replacement + '\n                  ' + code[end:]

with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched POC UI")
