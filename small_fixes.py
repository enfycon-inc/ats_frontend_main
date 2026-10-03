import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State changes
code = code.replace('businessInfo: false, location: false', 'businessInfo: false, clientInfo: false, location: false')
code = code.replace('title="Geographic Location"', 'title="JOB LOCATION"')
code = code.replace('title="GEOGRAPHIC LOCATION"', 'title="JOB LOCATION"')
code = code.replace('GEOGRAPHIC LOCATION SECTION', 'JOB LOCATION SECTION')

# 2. Make skills col-span-full
code = re.sub(
    r'(<div className="space-y-1[^>]*>)\s*<Label className="font-bold text-neutral-700 dark:text-neutral-300">\s*Primary Skills',
    r'<div className="space-y-1 md:col-span-full">\n                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">\n                        Primary Skills',
    code
)
code = re.sub(
    r'(<div className="space-y-1[^>]*>)\s*<Label className="font-bold text-neutral-700 dark:text-neutral-300">Secondary Skills',
    r'<div className="space-y-1 md:col-span-full">\n                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Secondary Skills',
    code
)

# 3. Remove the OLD LOCATION BLOCK which was hidden
s_old = code.find('{/* OLD LOCATION BLOCK')
if s_old != -1:
    e_old = code.find('</div>\n\n                    {/* Client */}', s_old)
    if e_old != -1:
        code = code[:s_old] + code[e_old+6:]
    else:
        # Client was moved, so it might not be followed by {/* Client */} anymore!
        # It's now followed by {/* CLIENT INFORMATION SECTION
        e_old = code.find('</div>\n\n              {/* -------------------- CLIENT', s_old)
        if e_old != -1:
            code = code[:s_old] + code[e_old+6:]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Small fixes done')
