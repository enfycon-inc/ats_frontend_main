c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()

old_btn = """                                {canManageUser(user) && (
                                  <button
                                    type="button"
                                    onClick={() => { setEditModalTab("STAFF"); openEditModal(user); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer shrink-0 mt-0.5"
                                    title="Assign Staff Role"
                                  >
                                    + Assign
                                  </button>
                                )}"""

new_btn = """                                {canManageUser(user) && (
                                  <button
                                    type="button"
                                    onClick={() => { setEditModalTab("STAFF"); openEditModal(user); }}
                                    className="inline-flex items-center justify-center h-5 w-5 rounded text-sm font-medium text-neutral-500 bg-neutral-100/80 border border-neutral-200/80 hover:bg-neutral-200 hover:text-neutral-700 dark:bg-slate-800 dark:border-slate-700 dark:text-neutral-400 dark:hover:bg-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer shrink-0 mt-0.5"
                                    title="Assign Staff Role"
                                  >
                                    +
                                  </button>
                                )}"""

if old_btn in c:
    c = c.replace(old_btn, new_btn)
else:
    print("WARNING: Could not find old_btn to replace")

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write(c)
