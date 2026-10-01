const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

const badCode = `<div>RAW DATA: {JSON.stringify(markets)}</div>{markets.map((segment) => (`;
const goodCode = `{markets.map((segment) => (`;

content = content.replace(badCode, goodCode);
fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', content);
