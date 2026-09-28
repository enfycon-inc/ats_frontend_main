file_path = r"app\(dashboard)\dashboard\components\global-admin-dashboard-view.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Header
old_header = '<th className="py-3 px-4">Market Mode</th>'
code = code.replace(old_header, '')

# Body
old_body = """                      <td className="py-3 px-4">
                        <select
                          value={selectedMarket[u.id] || u.defaultMarket || "US"}
                          onChange={(e) =>
                            setSelectedMarket({ ...selectedMarket, [u.id]: e.target.value })
                          }
                          className="h-7 text-xs rounded border border-default-200 bg-white dark:bg-slate-800 px-2 text-default-700 outline-none"
                        >
                          <option value="US">???? US IT Staffing</option>
                          <option value="IN">???? India IT Staffing</option>
                        </select>
                      </td>"""
code = code.replace(old_body, '')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated Global Admin Dashboard View")
