import sys
import re

c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()
lines = c.split('\n')

# 1. Insert Tabs State
hook_line = next(i for i, l in enumerate(lines) if 'const [isAddModalOpen, setIsAddModalOpen] = useState(false);')
lines.insert(hook_line + 1, '  const [addModalTab, setAddModalTab] = useState("STAFF");')
lines.insert(hook_line + 2, '  const [editModalTab, setEditModalTab] = useState("STAFF");')

c = '\n'.join(lines)

# 2. Fix the roles column (find "Assign Role" in the table)
# Currently it looks like:
#                             return groups.map((group, idx) => {
# ...
#                                 </span>
#                               );
#                             });
#                           })()}
#                         </div>

roles_col_search = """                            return groups.map((group, idx) => {
                              const roleLabels = dedupeCaseInsensitiveRoles(group.roles, group.branchId);
                              return (
                                <span
                                  key={`${group.branchId || idx}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 shadow-2xs"
                                >
                                  <span>{roleLabels.join(", ")}</span>
                                  {hasMultipleBranches && group.branchName && branchFilter === "ALL" && (
                                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-indigo-200/80 dark:border-slate-700">
                                      ?? {group.branchName}
                                    </span>
                                  )}
                                </span>
                              );
                            });"""

roles_col_replace = """                            const groupEls = groups.map((group, idx) => {
                              const roleLabels = dedupeCaseInsensitiveRoles(group.roles, group.branchId);
                              return (
                                <span
                                  key={`${group.branchId || idx}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 shadow-2xs"
                                >
                                  <span>{roleLabels.join(", ")}</span>
                                  {hasMultipleBranches && group.branchName && branchFilter === "ALL" && (
                                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-indigo-200/80 dark:border-slate-700">
                                      ?? {group.branchName}
                                    </span>
                                  )}
                                </span>
                              );
                            });
                            
                            return (
                              <>
                                {groupEls}
                                {canManageUser(user) && (
                                  <button
                                    type="button"
                                    onClick={() => { setEditModalTab("STAFF"); openEditModal(user); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer shrink-0"
                                    title="Assign Staff Role"
                                  >
                                    + Assign
                                  </button>
                                )}
                              </>
                            );"""

if roles_col_search in c:
    c = c.replace(roles_col_search, roles_col_replace)
else:
    print("WARNING: Could not find roles_col_search to replace")

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write(c)
