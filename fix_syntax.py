file_path = r"app\(dashboard)\utility\pods\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("</</>", "</>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Fixed syntax error")
