file_path = r"app\(dashboard)\utility\pods\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

old_header = """                  <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-right">
                    Actions
                  </th>"""
new_header = """                  {canManage && (
                    <th className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 text-right">
                      Actions
                    </th>
                  )}"""

code = code.replace(old_header, new_header)

old_td = """                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEditModal(pod)}
                                className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 transition cursor-pointer"
                                title="Edit Pod Details & Members"
                              >
                                <Icon icon="heroicons:pencil-square" className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePod(pod.id, pod.name)}
                                className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-slate-800 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                                title="Delete Pod"
                              >
                                <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>"""

new_td = """                      {/* Actions */}
                      {canManage && (
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(pod)}
                              className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 transition cursor-pointer"
                              title="Edit Pod Details & Members"
                            >
                              <Icon icon="heroicons:pencil-square" className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePod(pod.id, pod.name)}
                              className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-slate-800 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                              title="Delete Pod"
                            >
                              <Icon icon="heroicons:trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}"""

code = code.replace(old_td, new_td)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated table columns completely")
