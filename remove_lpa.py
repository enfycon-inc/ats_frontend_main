with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# I need to find the billUnit select
s = code.find('<option value="LPA">LPA</option>')
if s != -1:
    code = code[:s] + code[s + len('<option value="LPA">LPA</option>'):]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Removed LPA")
