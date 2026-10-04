import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

insertion = '''                  </div>
                )}
              </div>

              '''

code = re.sub(r'\{\/\* Job Status \(Hidden, Defaults to Active\) \*\/}[^<]*<input type="hidden"', insertion + '{\/* Job Status (Hidden, Defaults to Active) */}\\n                    <input type="hidden"', code)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Closed CLIENT INFORMATION SECTION')
