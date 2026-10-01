const fs = require('fs');

const files = [
  'app/(dashboard)/management/branch/new/page.tsx',
  'app/(dashboard)/management/branch/[id]/edit/page.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/Practice Divisions/g, 'Branch Units');
    content = content.replace(/Practice Division/g, 'Branch Unit');
    content = content.replace(/practice division/g, 'branch unit');
    content = content.replace(/practice divisions/g, 'branch units');
    content = content.replace(/Branch Units & Branch Units/g, 'Branch Units');
    fs.writeFileSync(file, content);
  }
}
console.log("Replaced in branch pages");
