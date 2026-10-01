const fs = require('fs');
const file = 'app/(dashboard)/job-posting/components/data-table/job-table-row.tsx';
let c = fs.readFileSync(file, 'utf8');

const hookInsertStr = `  const isTenantAdmin = Boolean(currentUser?.permissions?.some((p: string) => ["tenant:manage", "tenant:settings"].includes(p)));\n  const isDelegatedView = Boolean(!isTenantAdmin && currentUserBranchId && job.branchId && currentUserBranchId !== job.branchId);\n\n  const router = useRouter();`;

c = c.replace('  const router = useRouter();', hookInsertStr);

fs.writeFileSync(file, c);
