with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Dynamic budget label based on job type
old_label = 'Budget Range (LPA)'
new_label = '{[\"Contract\", \"C2H\", \"Freelance\"].includes(watch(\"jobType\")) ? \"Budget Range (Per Month)\" : \"Budget Range (LPA)\"}'
# Replace first occurrence (the section header label)
code = code.replace(f'>{old_label}<', f'>{new_label}<', 1)

# Also remove the old embedded location block from inside business info (we moved it to its own section)
code = code.replace('''
                    {/* Location Block */}
                    <div className="space-y-1 col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">''', '<!-- location moved --><div style={{display:\'none\'}} className="hidden">', 1)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Budget label patched.')
