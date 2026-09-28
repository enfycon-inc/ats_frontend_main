file_path = r"lib\role-permissions.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

old_filter = """      if (child.href === "/job-posting/boards") return has("job:publish_direct");"""

new_filter = """      if (child.href === "/job-posting/drafts") return has("job:create");
      if (child.href === "/job-posting/boards") return has("job:publish_direct");"""

code = code.replace(old_filter, new_filter)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated role-permissions.ts")
