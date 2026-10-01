const fs = require('fs');
const file = 'app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /<label className="font-bold text-neutral-700 dark:text-neutral-300">Client<\/label>/g,
  '<label className="font-bold text-neutral-700 dark:text-neutral-300">Client <span className="text-red-500">*</span></label>'
);

c = c.replace(
  /<label className="font-bold text-neutral-700 dark:text-neutral-300">End Client <span className="text-red-500">\*<\/span><\/label>/g,
  '<label className="font-bold text-neutral-700 dark:text-neutral-300">End Client</label>'
);

fs.writeFileSync(file, c);
console.log('Labels patched.');
