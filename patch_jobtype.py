with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'setValue("taxTerms", "Permanent");',
    'setValue("taxTerms", "Permanent");\n                                    setBillUnit("LPA");\n                                    setPayUnit("LPA");'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched jobType full time")
