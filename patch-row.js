const fs = require('fs');
const file = 'app/(dashboard)/job-posting/components/data-table/job-table-row.tsx';
let c = fs.readFileSync(file, 'utf8');

const hookInsertStr = `  const isTenantAdmin = Boolean(currentUser?.permissions?.some((p: string) => ["tenant:manage", "tenant:settings"].includes(p)));\n  const isDelegatedView = Boolean(!isTenantAdmin && currentUserBranchId && job.branchId && currentUserBranchId !== job.branchId);\n\n  // Computed values`;
c = c.replace('  // Computed values', hookInsertStr);

// 1. Hide podName if isDelegatedView
const podNameBlock = `) : colId === "podName" ? (
              job.podName ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40 rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Users className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                    {job.podName}
                  </span>
                </div>
              ) : (`;

const podNameBlockReplacement = `) : colId === "podName" ? (
              isDelegatedView ? (
                 <span className="text-neutral-400 italic text-[11px]">Hidden</span>
              ) : job.podName ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40 rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Users className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                    {job.podName}
                  </span>
                </div>
              ) : (`;

c = c.replace(podNameBlock, podNameBlockReplacement);

// 2. Hide clientBillRate if isDelegatedView
const clientBillRateBlock = `) : colId === "payRate" || colId === "clientBillRate" ? (
              (() => {
                const rateStr = String(job[colId as keyof Job] || "N/A");`;

const clientBillRateBlockReplacement = `) : colId === "payRate" || colId === "clientBillRate" ? (
              (() => {
                if (colId === "clientBillRate" && isDelegatedView) return <span className="text-neutral-400 italic text-[11px]">Hidden</span>;
                const rateStr = String(job[colId as keyof Job] || "N/A");`;

c = c.replace(clientBillRateBlock, clientBillRateBlockReplacement);

fs.writeFileSync(file, c);
