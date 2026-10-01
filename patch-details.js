const fs = require('fs');
const file = 'app/(dashboard)/job-posting/[id]/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const hookInsertStr = `  const isDelegatedView = useMemo(() => {\n    if (!currentUser || !job) return false;\n    const permissions = currentUser.permissions || [];\n    const isTenantAdmin = permissions.some((p: string) => ["tenant:manage", "tenant:settings"].includes(p));\n    if (isTenantAdmin) return false;\n    return Boolean(currentUser.branchId && job.branchId && currentUser.branchId !== job.branchId);\n  }, [currentUser, job]);\n\n  const isAM = activeSystemRole === "ACCOUNT_MANAGER";`;

c = c.replace('const isAM = activeSystemRole === "ACCOUNT_MANAGER";', hookInsertStr);

// 1. Hide recruiter / assigned pod if isDelegatedView
const assignedToBlock = `              <div className="flex justify-between">\n                <span className="text-neutral-500 font-medium">Assigned To:</span>\n                <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.podName || job?.recruiter || "Unassigned"}</span>\n              </div>`;
const assignedToBlockReplacement = `              {!isDelegatedView && (\n                <div className="flex justify-between">\n                  <span className="text-neutral-500 font-medium">Assigned To:</span>\n                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.podName || job?.recruiter || "Unassigned"}</span>\n                </div>\n              )}`;
c = c.replace(assignedToBlock, assignedToBlockReplacement);

// 2. Hide clientBillRate if isDelegatedView
const clientBillRateBlock = `                  <div>\n                    <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Client Bill Rate</span>\n                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.clientBillRate}</span>\n                  </div>`;
const clientBillRateBlockReplacement = `                  {!isDelegatedView && (\n                    <div>\n                      <span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Client Bill Rate</span>\n                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.clientBillRate}</span>\n                    </div>\n                  )}`;
c = c.replace(clientBillRateBlock, clientBillRateBlockReplacement);

fs.writeFileSync(file, c);
