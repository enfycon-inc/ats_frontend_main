with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i, line in enumerate(lines):
    if 'selectedPocId' in line and '=' in line and 'payload' in line:
        print(f'Line {i+1}: {line}')
