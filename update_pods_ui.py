file_path = r"app\(dashboard)\utility\pods\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Fix 1: Add canManage definition
old_activeView = '  const [activeView, setActiveView] = useState<"all" | "cycle">("all");'
new_activeView = """  const [activeView, setActiveView] = useState<"all" | "cycle">("all");

  const userPerms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const canManage = isTenantAdmin || isUnitScoped || userPerms.includes("pod:manage") || userPerms.includes("pod:create") || userPerms.includes("pod:edit") || currentUser?.systemRole === "BRANCH_ADMIN";"""

code = code.replace(old_activeView, new_activeView)

# Fix 2: Hide dropdowns for non-tenant admins
old_dropdown_logic = """          {isUnitScoped ? (
            <div className="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
              <Icon icon="heroicons:rectangle-group" className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Unit: <strong className="text-indigo-700 dark:text-indigo-400 font-bold">{assignedUnitName}</strong>
              </span>
            </div>
          ) : (
            /* Dropdowns for Tenant Admins: Filter by Operating Unit & Branch */
            <div className="flex items-center gap-2">"""

new_dropdown_logic = """          {!isTenantAdmin ? (
            <div className="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs">
              <Icon icon="heroicons:rectangle-group" className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Unit: <strong className="text-indigo-700 dark:text-indigo-400 font-bold">{assignedUnitName || "My Unit"}</strong>
              </span>
            </div>
          ) : (
            /* Dropdowns for Tenant Admins: Filter by Operating Unit & Branch */
            <div className="flex items-center gap-2">"""

code = code.replace(old_dropdown_logic, new_dropdown_logic)

# Fix 3: Hide Buttons
old_buttons = """          <Button
            onClick={handleResetRR}
            disabled={submitting}
            variant="outline"
            className="flex items-center gap-1.5 border-neutral-300 dark:border-slate-700 font-semibold text-xs h-8.5 px-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
          >
            <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" />
            Reset Cycle
          </Button>

          <Button
            onClick={openCreateModal}
            disabled={submitting}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs text-xs h-8.5 px-3.5 cursor-pointer"
          >
            <Icon icon="heroicons:plus" className="h-3.5 w-3.5" />
            Create Pod
          </Button>"""

new_buttons = """          {canManage && (
            <>
              <Button
                onClick={handleResetRR}
                disabled={submitting}
                variant="outline"
                className="flex items-center gap-1.5 border-neutral-300 dark:border-slate-700 font-semibold text-xs h-8.5 px-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
              >
                <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" />
                Reset Cycle
              </Button>

              <Button
                onClick={openCreateModal}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs text-xs h-8.5 px-3.5 cursor-pointer"
              >
                <Icon icon="heroicons:plus" className="h-3.5 w-3.5" />
                Create Pod
              </Button>
            </</>
          )}"""

code = code.replace(old_buttons, new_buttons)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated pods page")
