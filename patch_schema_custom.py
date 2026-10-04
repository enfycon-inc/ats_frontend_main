with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'pocPhoneCode: zod.string().optional(),',
    'pocPhoneCode: zod.string().optional(),\n  pocDesignationCustom: zod.string().optional(),'
)

code = code.replace(
    'designation: data.pocDesignation || null,',
    'designation: data.pocDesignation === "Other" ? data.pocDesignationCustom || null : data.pocDesignation || null,'
)

with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched schema custom")
