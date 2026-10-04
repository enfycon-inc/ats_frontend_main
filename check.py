with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i, line in enumerate(lines):
    if 'value={payUnit}' in line:
        for j in range(i-2, i+15):
            print(f'Line {j+1}: {lines[j].strip()}')
        break
