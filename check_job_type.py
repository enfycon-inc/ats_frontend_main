with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i, line in enumerate(lines):
    if 'jobType' in line and 'register' in line:
        for j in range(i-5, i+15):
            try:
                print(f'Line {j+1}: {lines[j]}')
            except:
                pass
        break
