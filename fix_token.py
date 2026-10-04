with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'headers: { Authorization: `Bearer ` }',
    'headers: { Authorization: `Bearer ${(window as any).__ats_token || ""}` }'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed token")
