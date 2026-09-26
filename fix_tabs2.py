import sys
import re

c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()

pattern = re.compile(r'(return groups\.map\(\(group, idx\) => \{.*?\}\);\s*\n\s*\}\)\(\)\}\s*\n\s*</div>)', re.DOTALL)
match = pattern.search(c)
if match:
    original = match.group(1)
    # Extract the map part
    map_part = re.search(r'return groups\.map\(\(group, idx\) => \{.*?\}\);', original, re.DOTALL).group(0)
    
    new_code = map_part.replace('return groups.map', 'const groupEls = groups.map') + """
                            return (
                              <>
                                {groupEls}
                                {canManageUser(user) && (
                                  <button
                                    type="button"
                                    onClick={() => { setEditModalTab("STAFF"); openEditModal(user); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors cursor-pointer shrink-0 mt-0.5"
                                    title="Assign Staff Role"
                                  >
                                    + Assign
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>"""
    c = c.replace(original, new_code)
else:
    print("WARNING: Could not find pattern")

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write(c)
