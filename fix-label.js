const fs = require('fs');

const files = [
  'app/(dashboard)/management/units/new/page.tsx',
  'app/(dashboard)/management/units/[id]/edit/page.tsx'
];

for(const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/Unit Code \(Unique Identifier\)/g, "Unit Code (Market Segment)");
  fs.writeFileSync(file, c);
}
console.log("Updated label");
