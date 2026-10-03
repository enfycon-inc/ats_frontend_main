with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# The HTML comment broke JSX - remove the entire old location block instead
# Find and remove the broken injection
import re

# Replace the bad injection with a proper JSX comment
code = code.replace(
    '<!-- location moved --><div style={{display:\'none\'}} className="hidden">',
    '{/* OLD LOCATION BLOCK - moved to Geographic Location section */}\n                    <div style={{display:\'none\'}}>'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('JSX comment fixed.')
