file_path = r"app\(dashboard)\utility\approvals\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Header
old_header = '<th className="py-3.5 px-6 text-xs font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider">Market Layout</th>'
code = code.replace(old_header, '')

# Body 1 (Pending Users)
old_body1 = """                            <td className="py-3.5 px-6">
                              <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-amber-500/20 w-fit">
                                <button
                                  onClick={() => handleMarketChange(user.id, "US")}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold ${selectedMarket === "US" ? "bg-indigo-600 text-white" : "text-default-500"}`}
                                >
                                  US
                                </button>
                                <button
                                  onClick={() => handleMarketChange(user.id, "IN")}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold ${selectedMarket === "IN" ? "bg-emerald-600 text-white" : "text-default-500"}`}
                                >
                                  IN
                                </button>
                              </div>
                            </td>"""
code = code.replace(old_body1, '')

# We also need to see if there's a body 2 (Unlinked Tenants)
with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated header and first body column")
