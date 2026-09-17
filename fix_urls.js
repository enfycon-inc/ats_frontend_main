const fs = require('fs');

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/utility\/branches/g, '/settings/branch');
  fs.writeFileSync(file, content, 'utf8');
}

replaceInFile('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/company/page.tsx');
replaceInFile('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/utility/users/page.tsx');
