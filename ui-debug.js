const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

// I will change the UI to display the raw JSON of `data` on the screen!
const badCode = `{markets.map((segment) => (`;
const goodCode = `<div>RAW DATA: {JSON.stringify(markets)}</div>{markets.map((segment) => (`;

content = content.replace(badCode, goodCode);
fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', content);
console.log("Added UI debug");
