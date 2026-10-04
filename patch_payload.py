with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's find endClientName in payload and add pocs
s = code.find('endClientName: data.endClientName || undefined,')
if s != -1:
    e = code.find('\\n', s)
    code = code[:e] + '\\n        pocId: selectedPocId || undefined,\\n        endClientPocId: selectedEndPocId || undefined,' + code[e:]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched payload')
