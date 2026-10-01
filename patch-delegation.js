const fs = require('fs');
const file = 'app/(dashboard)/job-posting/components/pending-delegation-requests.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  'import { Badge } from \'@/components/ui/badge\';',
  'import { Badge } from \'@/components/ui/badge\';\nimport Link from \'next/link\';'
);

c = c.replace(
  '<div className="font-semibold text-sm text-default-900">{req.job?.jobCode} - {req.job?.jobTitle}</div>',
  '<Link href={`/job-posting/${req.job?.id}`} className="font-semibold text-sm text-indigo-600 hover:underline">{req.job?.jobCode} - {req.job?.jobTitle}</Link>'
);

c = c.replace(
  'className="text-rose-600 hover:bg-rose-50 border-rose-200"',
  'className="bg-red-600 hover:bg-red-700 text-white"'
);

c = c.replace(
  'className="bg-amber-600 hover:bg-amber-700 text-white"',
  'className="bg-green-600 hover:bg-green-700 text-white"'
);

fs.writeFileSync(file, c);
