import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix placeholders for Per Month (min/max)
# It's currently placeholder="e.g. 10.0" and placeholder="e.g. 15.0"
code = code.replace(
    'placeholder="e.g. 10.0"',
    'placeholder={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "e.g. 50000" : "e.g. 10.0"}'
)
code = code.replace(
    'placeholder="e.g. 15.0"',
    'placeholder={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "e.g. 80000" : "e.g. 15.0"}'
)

# 2. Clear clientBillRate when taxTerms changes from Permanent
# Let's find the useEffect for watchTaxTerms or jobType
# We will inject a useEffect.
injection = '''  // Clear clientBillRate if it switches from Permanent to something else and contains %
  useEffect(() => {
    const currentRate = watch("clientBillRate");
    if (watch("taxTerms") !== "Permanent" && currentRate && currentRate.includes("Placement")) {
      setValue("clientBillRate", "");
    } else if (watch("taxTerms") === "Permanent" && !currentRate) {
      setValue("clientBillRate", "8.33% Placement Commission");
    }
  }, [watch("taxTerms")]);
'''

# Find a good place to inject. After const watchTaxTerms = watch("taxTerms");
s_watch = code.find('const watchTaxTerms = watch("taxTerms");')
if s_watch != -1:
    e_line = code.find('\\n', s_watch)
    code = code[:e_line] + '\\n' + injection + code[e_line:]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Fixed 1 and 2')
