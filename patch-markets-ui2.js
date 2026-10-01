const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

page = page.replace(/<div className="space-y-1 bg-neutral-50 dark:bg-slate-800\/50 p-2 rounded-lg col-span-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');

fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', page);
console.log("Fixed UI block again");
