with open('app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add commissionPercentage to zod schema
code = code.replace(
    'aboutCompany: zod.string().optional(),\n});',
    'aboutCompany: zod.string().optional(),\n  commissionPercentage: zod.union([zod.number().min(0).max(100), zod.nan().transform(() => undefined)]).optional(),\n});'
)

# 2. Add to defaultValues
code = code.replace(
    "country: market === \"IN\" ? \"IN\" : \"US\",\n    }",
    "country: market === \"IN\" ? \"IN\" : \"US\",\n      commissionPercentage: undefined,\n    }"
)

with open('app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Modal schema updated.')
