c = open('app/(dashboard)/utility/users/page.tsx', 'r', encoding='utf-8').read()
import re
lines = c.split('\n')
start = next(i for i, l in enumerate(lines) if '{/* EDIT MEMBER MODAL (FIX EMAIL TYPOS / BRANCH) */}' in l)

edit_block = '\n'.join(lines[start:])
edit_block = edit_block.replace('setAddForm', 'setEditForm')
c = '\n'.join(lines[:start]) + '\n' + edit_block
open('app/(dashboard)/utility/users/page.tsx', 'w', encoding='utf-8').write(c)
