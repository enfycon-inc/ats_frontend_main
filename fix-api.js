const fs = require('fs');
let content = fs.readFileSync('lib/ats-api.ts', 'utf8');

content = content.replace(
  `return apiFetch<any[]>('/api/market-segments').catch((e) => { console.error("MARKET FETCH ERROR:", e); return []; });`,
  `return apiFetch<any[]>('/api/market-segments');`
);
// Also in case the old code is still there:
content = content.replace(
  `return apiFetch<any[]>('/api/market-segments').catch(() => []);`,
  `return apiFetch<any[]>('/api/market-segments');`
);

fs.writeFileSync('lib/ats-api.ts', content);
console.log("Updated ats-api.ts to throw error instead of swallowing");
