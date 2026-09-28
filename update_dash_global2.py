file_path = r"app\(dashboard)\dashboard\components\global-admin-dashboard-view.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Header
old_header2 = '<th className="py-2.5 px-4">Market</th>'
code = code.replace(old_header2, '')

# Body
old_body2 = """                          <td className="py-2.5 px-4 font-semibold">
                            {t.default_market === "IN" ? "???? India" : "???? US IT"}
                          </td>"""
code = code.replace(old_body2, '')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated Global Admin Dashboard View Active Tenants Table")
