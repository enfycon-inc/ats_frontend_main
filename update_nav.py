file_path = r"constants\navigation.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

old_nav = """    children: [
      { label: "All Jobs", href: "/job-posting" },
      { label: "Active Jobs", href: "/job-posting/active" },
      { label: "Draft Jobs", href: "/job-posting/drafts" },


      { label: "Job Boards", href: "/job-posting/boards" },
    ],"""

new_nav = """    children: [
      { label: "All Jobs", href: "/job-posting" },
      { label: "Active Jobs", href: "/job-posting/active" },
      { label: "My Jobs", href: "/job-posting?filter=direct" },
      { label: "Pod Jobs", href: "/job-posting?filter=pod" },
      { label: "Draft Jobs", href: "/job-posting/drafts" },
      { label: "Job Boards", href: "/job-posting/boards" },
    ],"""

code = code.replace(old_nav, new_nav)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated navigation.ts")
