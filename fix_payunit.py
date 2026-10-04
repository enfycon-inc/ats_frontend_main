with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '<option value="Yearly">Yearly</option>',
    '<option value="Yearly">Yearly</option>\n                                  <option value="LPA">LPA</option>'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Added LPA to payUnit")
