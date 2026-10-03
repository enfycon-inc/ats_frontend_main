import os

for form in ['IndiaStaffingForm.tsx', 'UsStaffingForm.tsx', 'GlobalStandardForm.tsx']:
    path = f'app/(dashboard)/job-posting/new/{form}'
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    code = code.replace("countries.find", "Country.getAllCountries().find")
    code = code.replace("countries.filter", "Country.getAllCountries().filter")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

