const fs = require('fs');

const file1 = 'app/(dashboard)/management/units/new/page.tsx';
let c1 = fs.readFileSync(file1, 'utf8');

c1 = c1.replace(
  /<input\s+type="text"\s+value=\{formData\.code\}/,
  `<input
                  type="text"
                  value={formData.code}
                  disabled={true}`
);
c1 = c1.replace(
  /placeholder="E\.G\. US-IT, DOM-HC, BFSI"/,
  `placeholder="Auto-populated"`
);

fs.writeFileSync(file1, c1);


const file2 = 'app/(dashboard)/management/units/[id]/edit/page.tsx';
let c2 = fs.readFileSync(file2, 'utf8');

c2 = c2.replace(
  /<input\s+type="text"\s+value=\{formData\.code\}/,
  `<input
                  type="text"
                  value={formData.code}
                  disabled={true}`
);

fs.writeFileSync(file2, c2);

console.log("Made Unit Code fields disabled/read-only");
