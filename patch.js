const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

page = page.replace(/\s*defaultTimezone: string;\n/, '');
page = page.replace(/\s*defaultShift: string;\n/, '');
page = page.replace(/\s*defaultStartTime\?: string;\n/, '');
page = page.replace(/\s*defaultEndTime\?: string;\n/, '');

// Find block and delete
page = page.replace(/<div className="space-y-1">\s*<span className="text-\[10px\] uppercase font-bold text-neutral-400 flex items-center gap-1">\s*<Globe className="h-3 w-3" \/> Timezone\s*<\/span>[\s\S]*?<\/div>\s*<\/div>\s*<div className="bg-neutral-50 dark:bg-slate-800\/50 p-2.5 rounded-lg border border-neutral-100 dark:border-slate-800">[\s\S]*?<\/div>\s*<\/div>/, '</div></div>');
fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', page);
console.log("Patched");
