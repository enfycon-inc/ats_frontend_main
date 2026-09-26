import sys

c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()
lines = c.split('\n')

add_start = next(i for i, l in enumerate(lines) if '{/* TABS FOR ADD MODAL */}' in l)
add_end = next(i for i in range(add_start, len(lines)) if '{/* PASSWORD + CONFIRM PASSWORD GRID */}' in lines[i])

new_add = """              {/* TABS FOR ADD MODAL */}
              <div className="flex border-b border-neutral-200 dark:border-slate-800 mb-4 pt-4">
                <button type="button" onClick={() => setAddModalTab("STAFF")} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${addModalTab === "STAFF" ? "border-indigo-600 text-indigo-600" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"}`}>Staff & Business Roles</button>
                <button type="button" onClick={() => setAddModalTab("ADMIN")} className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${addModalTab === "ADMIN" ? "border-indigo-600 text-indigo-600" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"}`}>Administrative Access</button>
              </div>

              {/* ADMINISTRATIVE ACCESS & STAFF ROLES LOGIC */}
              {(() => {
                const getAdminSysKey = (rolesArray: string[]) => {
                  for (const r of rolesArray) {
                    const sr = rolesList.find(rl => rl.id === r || rl.name === r || (r === "Tenant Admin" && (rl.systemRole === "ADMIN" || rl.system_role === "ADMIN")) || (r === "Super Admin" && (rl.systemRole === "SUPER_ADMIN" || rl.system_role === "SUPER_ADMIN")));
                    if (sr && sr.isSystem) {
                      const sys = (sr.systemRole || sr.system_role || "").toUpperCase();
                      if (["ADMIN", "TENANT_ADMIN", "SUPER_ADMIN", "TENANTADMIN", "SUPERADMIN"].includes(sys)) return "ADMIN";
                      if (["BRANCH_ADMIN", "BRANCHADMIN"].includes(sys)) return "BRANCH_ADMIN";
                      if (["UNIT_ADMIN", "UNITADMIN"].includes(sys)) return "UNIT_ADMIN";
                    }
                  }
                  return "NONE";
                };

                const addFormAdminRole = getAdminSysKey(addForm.roles);

                const handleAddAdminRoleChange = (targetSysKey: string) => {
                  let nextRoles = addForm.roles.filter(r => {
                    const sr = rolesList.find(rl => rl.id === r || rl.name === r || (r === "Tenant Admin" && (rl.systemRole === "ADMIN" || rl.system_role === "ADMIN")) || (r === "Super Admin" && (rl.systemRole === "SUPER_ADMIN" || rl.system_role === "SUPER_ADMIN")));
                    return !(sr && sr.isSystem);
                  });

                  if (targetSysKey !== "NONE") {
                    const newAdminRole = rolesList.find(rl => {
                      if (!rl.isSystem) return false;
                      const sys = (rl.systemRole || rl.system_role || "").toUpperCase();
                      if (targetSysKey === "ADMIN") return ["ADMIN", "TENANT_ADMIN", "SUPER_ADMIN", "TENANTADMIN", "SUPERADMIN"].includes(sys);
                      if (targetSysKey === "BRANCH_ADMIN") return ["BRANCH_ADMIN", "BRANCHADMIN"].includes(sys);
                      if (targetSysKey === "UNIT_ADMIN") return ["UNIT_ADMIN", "UNITADMIN"].includes(sys);
                      return false;
                    });
                    if (newAdminRole) nextRoles.push(newAdminRole.id);
                  }
                  
                  // Retain business unit for Branch Admin so they can also have custom roles (like Recruiter)
                  setAddForm(prev => ({
                    ...prev, 
                    roles: nextRoles,
                    branchId: targetSysKey === "ADMIN" ? "" : prev.branchId,
                    businessUnitId: targetSysKey === "ADMIN" ? "" : prev.businessUnitId
                  }));
                };

                const branchRolesForAdd = (rolesList || []).filter((r) => {
                  if (r.isSystem) return false;
                  if (!addForm.businessUnitId) return false;
                  const rBUId = r.businessUnitId || (r as any).business_unit_id;
                  if (!rBUId) return false;
                  return String(rBUId).toLowerCase() === String(addForm.businessUnitId).toLowerCase();
                });

                return (
                  <div>
                    {addModalTab === "ADMIN" && (
                      <div className="space-y-4 mb-4">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">Select Administrative Level</label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { key: "ADMIN", label: "Tenant Admin", show: isTenantAdmin },
                            { key: "BRANCH_ADMIN", label: "Branch Admin", show: isTenantAdmin || isBranchAdmin },
                            { key: "UNIT_ADMIN", label: "Branch Unit Admin", show: true }
                          ].filter(r => r.show).map((role) => {
                            const isChecked = addFormAdminRole === role.key;
                            return (
                              <label key={role.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={() => {
                                    if (isChecked) handleAddAdminRoleChange("NONE");
                                    else handleAddAdminRoleChange(role.key);
                                  }} 
                                  className="h-4 w-4 accent-indigo-600 cursor-pointer rounded" 
                                />
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">{role.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">Administrative roles grant system-wide permissions across the entire scope (Tenant, Branch, or Unit).</p>
                      </div>
                    )}

                    {addModalTab === "STAFF" && (
                      <div className="space-y-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {addFormAdminRole === "ADMIN" ? (
                            <div className="space-y-1 opacity-50">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch</label>
                              <div className="text-[10px] py-2">Not Applicable (Tenant Scope)</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Office Branch *</label>
                              {isBranchAdmin ? (
                                <div className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                  <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <span>{assignedBranches.find((b) => b.id === addForm.branchId)?.name || branches.find((b) => b.id === addForm.branchId)?.name || "Assigned Branch"}</span>
                                </div>
                              ) : (
                                <select value={addForm.branchId} onChange={(e) => setAddForm((prev) => ({ ...prev, branchId: e.target.value, businessUnitId: "" }))} className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500" required>
                                  <option value="">Select Primary Branch...</option>
                                  {assignedBranches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                </select>
                              )}
                            </div>
                          )}

                          {addFormAdminRole === "ADMIN" ? (
                            <div className="space-y-1 opacity-50">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">Branch Unit</label>
                              <div className="text-[10px] py-2">Not Applicable (Tenant Scope)</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                Branch Unit {addFormAdminRole !== "BRANCH_ADMIN" && "*"}
                              </label>
                              {!addForm.branchId ? (
                                <select disabled className="w-full h-8.5 text-xs rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/40 px-2.5 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"><option>-- Select a Branch Office First --</option></select>
                              ) : (
                                <select value={addForm.businessUnitId} onChange={(e) => setAddForm((prev) => ({ ...prev, businessUnitId: e.target.value }))} className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-semibold text-neutral-900 dark:text-white outline-none hover:border-indigo-500 cursor-pointer" required={addFormAdminRole !== "BRANCH_ADMIN"}>
                                  <option value="">-- Select a Unit{addFormAdminRole === "BRANCH_ADMIN" ? " (Optional for Custom Roles)" : ""} --</option>
                                  {assignedBusinessUnits.filter((bu) => bu.branchId === addForm.branchId || bu.branch_id === addForm.branchId).map((bu) => (<option key={bu.id} value={bu.id}>{bu.name}</option>))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>

                        {addFormAdminRole !== "ADMIN" && (
                          <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-indigo-600" /><label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Custom / Business Roles</label></div>
                              {addForm.businessUnitId && (<a href={`/utility/roles-permissions?branch=${addForm.branchId}`} className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">+ Manage Custom Roles</a>)}
                            </div>
                            {!addForm.branchId || !addForm.businessUnitId ? (
                              <div className="p-3 bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs text-neutral-500 text-center">Please select a Branch Unit above to view and assign custom staffing roles.</div>
                            ) : branchRolesForAdd.length === 0 ? (
                              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div><span className="font-bold block">No custom roles configured for this unit yet.</span><span className="text-[10.5px] text-amber-700/80 dark:text-amber-400">Custom roles are isolated per Branch Unit.</span></div>
                                <a href={`/utility/roles-permissions?branch=${addForm.branchId}`} className="font-bold underline text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800/80 px-2.5 py-1 rounded text-xs shrink-0 self-start sm:self-auto hover:bg-amber-100/50 transition-colors shadow-2xs">+ Create Role for Branch &rarr;</a>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-neutral-50 dark:bg-slate-850 p-3 rounded-lg border border-neutral-200 dark:border-slate-800">
                                {branchRolesForAdd.map((r) => {
                                  const isChecked = addForm.roles.includes(r.id) || addForm.roles.includes(r.name);
                                  return (
                                    <label key={r.id || r.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors select-none ${isChecked ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"}`}>
                                      <input type="checkbox" checked={isChecked} onChange={(e) => { const checked = e.target.checked; let nextRoles = addForm.roles.filter((x) => x !== r.id && x !== r.name); if (checked) nextRoles.push(r.id || r.name); setAddForm({ ...addForm, roles: nextRoles }); }} className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer" />
                                      <span className="truncate">{r.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}"""

lines = lines[:add_start] + new_add.split('\n') + lines[add_end:]

edit_start = next(i for i, l in enumerate(lines) if '{/* TABS FOR EDIT MODAL */}' in l and i > add_start + 10)
edit_end = next(i for i in range(edit_start, len(lines)) if '{/* DESIGNATED MANAGER */}' in lines[i])

new_edit = new_add.replace('addForm', 'editForm').replace('branchRolesForAdd', 'branchRolesForEdit').replace('addModalTab', 'editModalTab').replace('setAddModalTab', 'setEditModalTab').replace('ADD MODAL', 'EDIT MODAL').replace('setAddForm', 'setEditForm').replace('handleAddAdminRoleChange', 'handleEditAdminRoleChange')

lines = lines[:edit_start] + new_edit.split('\n') + lines[edit_end:]

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write('\n'.join(lines))
