import re
import os

files = [
    "app/(dashboard)/job-posting/new/GlobalStandardForm.tsx",
    "app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx",
    "app/(dashboard)/job-posting/new/UsStaffingForm.tsx"
]

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # assignedTo in object literals
    content = re.sub(r'(?m)^(\s*)assignedTo:(.*)$', r'\1// assignedTo:\2', content)

    # res.location issues
    content = re.sub(r'\(\(res\.location \|\| ""\)\)\.state', '((res.location || "") as any).state', content)
    content = re.sub(r'\(\(res\.location \|\| ""\)\)\.country', '((res.location || "") as any).country', content)
    content = re.sub(r'\(\(res\.location \|\| ""\)\)\.city', '((res.location || "") as any).city', content)

    # If it was originally `(res.location || "").state` 
    content = re.sub(r'\(res\.location \|\| ""\)\.state', '((res.location || "") as any).state', content)
    content = re.sub(r'\(res\.location \|\| ""\)\.country', '((res.location || "") as any).country', content)
    content = re.sub(r'\(res\.location \|\| ""\)\.city', '((res.location || "") as any).city', content)

    # duplicate market in GlobalStandardForm
    content = re.sub(r'(?m)^(\s*)market: market,$', r'\1// market: market,', content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for f in files:
    fix_file(f)
