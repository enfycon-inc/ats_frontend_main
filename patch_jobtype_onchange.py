with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'setValue("taxTerms", true ? "Contract (3rd Party)" : "C2C");',
    'setValue("taxTerms", true ? "Contract (3rd Party)" : "C2C");\n                                    setBillUnit("Monthly");\n                                    setPayUnit("Monthly");'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched jobType onChange")
