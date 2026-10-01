const fs = require('fs');
const file = 'app/(dashboard)/job-posting/[id]/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /<span className="text-neutral-500 font-medium">Assigned To:<\/span>\s*<span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job\?\.podName \|\| job\?\.recruiter \|\| "Unassigned"}<\/span>/g,
  '{!isDelegatedView && (<><span className="text-neutral-500 font-medium">Assigned To:</span>\n<span className="text-neutral-800 dark:text-neutral-200 font-semibold">{job?.podName || job?.recruiter || "Unassigned"}</span></>)}'
);

c = c.replace(
  /<span className="text-\[9px\] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Client Bill Rate<\/span>\s*<span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job\.clientBillRate}<\/span>/g,
  '{!isDelegatedView && (<><span className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider mb-0.5">Client Bill Rate</span>\n<span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{job.clientBillRate}</span></>)}'
);

fs.writeFileSync(file, c);
