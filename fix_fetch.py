with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'const res = await fetch(`/api/ats/clients//contacts`, {',
    'const res = await fetch(`/api/ats/clients/${selectedEndClientId}/contacts`, {'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed fetch")
