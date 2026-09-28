file_path = r"app\(dashboard)\dashboard\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

old_block = """            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {profile?.fullName || "Staff Member"}!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
              <Icon icon="heroicons:sparkles" className="h-3 w-3" />
              {profile?.tenantDomain || "Workspace"}
            </span>"""

new_block = """            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {profile?.fullName || "Staff Member"}!
            </h1>"""

code = code.replace(old_block, new_block)
with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated dashboard/page.tsx")
