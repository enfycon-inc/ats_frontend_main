file_path = r"app\(dashboard)\utility\approvals\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

old_body2 = """                            <td className="py-3.5 px-6">
                              <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-amber-500/20 w-fit">
                                <button
                                  onClick={() => handleTenantMarketToggle(tenant.id, tenant.defaultMarket)}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold ${tenant.defaultMarket === "US" ? "bg-indigo-600 text-white" : "text-default-500"}`}
                                >
                                  US
                                </button>
                                <button
                                  onClick={() => handleTenantMarketToggle(tenant.id, tenant.defaultMarket)}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold ${tenant.defaultMarket === "IN" ? "bg-emerald-600 text-white" : "text-default-500"}`}
                                >
                                  IN
                                </button>
                              </div>
                            </td>"""

code = code.replace(old_body2, '')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated second body column")
