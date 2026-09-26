c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()
lines = c.split('\n')
# Remove lines 1 and 2 (0-indexed, wait, lines[1] and lines[2])
lines.pop(2)
lines.pop(1)

# Find the right place
start = next(i for i, l in enumerate(lines) if 'export default function UserManagementPage() {' in l)
lines.insert(start + 1, '  const [addModalTab, setAddModalTab] = useState("STAFF");')
lines.insert(start + 2, '  const [editModalTab, setEditModalTab] = useState("STAFF");')

open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write('\n'.join(lines))
