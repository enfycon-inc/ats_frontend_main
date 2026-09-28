file_path = r"app\(dashboard)\utility\approvals\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Header 3 (Active Tenants)
old_header3 = '<th className="py-4 px-6 text-xs font-bold text-default-700 uppercase tracking-wider">Staffing Market Layout Configuration</th>'
code = code.replace(old_header3, '')

# Body 3 (Active Tenants)
old_body3 = """                            <td className="py-4 px-6">
                              <div className="flex bg-default-100 dark:bg-slate-800 p-0.5 rounded-lg border border-default-200/50 w-fit">
                                <button
                                  onClick={() => handleTenantMarketToggle(tenant.id, tenant.defaultMarket)}
                                  disabled={submittingId === tenant.id}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                    tenant.defaultMarket === "US"
                                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                      : "text-default-500 hover:text-default-800"
                                  }`}
                                >
                                  ???? US IT
                                </button>
                                <button
                                  onClick={() => handleTenantMarketToggle(tenant.id, tenant.defaultMarket)}
                                  disabled={submittingId === tenant.id}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                                    tenant.defaultMarket === "IN"
                                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                                      : "text-default-500 hover:text-default-800"
                                  }`}
                                >
                                  ???? Domestic
                                </button>
                              </div>
                            </td>"""

code = code.replace(old_body3, '')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated Active Tenants column")
