const fs = require('fs');

function fixTypeScript(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace `user =>` with `(user: any) =>`
  content = content.replace(/atsApi\.auth\.getCurrentUser\(\)\.then\(user => {/g, 'atsApi.auth.getCurrentUser().then((user: any) => {');
  
  fs.writeFileSync(filePath, content);
  console.log("TypeScript fixed");
}

fixTypeScript('app/(dashboard)/management/markets/page.tsx');
