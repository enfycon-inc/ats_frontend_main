with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i in range(2230, 2250):
    print(f'Line {i+1}: {lines[i]}')
