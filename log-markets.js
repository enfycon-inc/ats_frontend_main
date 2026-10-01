const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

content = content.replace(
  `const data = await atsApi.marketSegments.list();`,
  `const data = await atsApi.marketSegments.list(); console.log("RAW MARKET DATA FETCHED:", data);`
);
fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', content);
console.log("Added console log");
