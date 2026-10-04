with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'pocName: zod.string().optional(),',
    'pocFirstName: zod.string().optional(),\n  pocLastName: zod.string().optional(),\n  pocPhoneCode: zod.string().optional(),'
)

with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched schema")
