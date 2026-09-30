const fs = require('fs');

function fixGlobal() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/GlobalStandardForm.tsx', 'utf8');
  content = content.replace(/market === "IN"/g, 'false');
  content = content.replace(/market !== "IN"/g, 'true');
  content = content.replace(/market === "US"/g, 'false');
  content = content.replace(/market !== "US"/g, 'true');
  fs.writeFileSync('app/(dashboard)/job-posting/new/GlobalStandardForm.tsx', content);
}

fixGlobal();
