import re
file_path = 'app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

if 'country-state-city' in code:
    print('country-state-city already imported!')
else:
    print('Need to add country-state-city import.')
