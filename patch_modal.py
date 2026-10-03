with open('app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

commission_field = '''
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

'''

code = code.replace('{/* About Company */', commission_field + '{/* About Company */')

with open('app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Commission field added to modal.')
