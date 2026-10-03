with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
s = code.find('title="CLIENT INFORMATION"')
print(code[s:s+1500])
