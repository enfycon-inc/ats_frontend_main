with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

s = code.find('const [selectedPocId, setSelectedPocId] = useState<string | null>(null);')
if s != -1:
    e = code.find('\\n', s)
    code = code[:e] + '\\n  const [endPocOpen, setEndPocOpen] = useState(false);\\n  const [endPocSearch, setEndPocSearch] = useState("");\\n  const [selectedEndPocId, setSelectedEndPocId] = useState<string | null>(null);' + code[e:]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched state')
