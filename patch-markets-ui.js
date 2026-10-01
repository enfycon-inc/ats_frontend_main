const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

// Remove from interface
page = page.replace(/\s*defaultTimezone: string;\n/, '');
page = page.replace(/\s*defaultShift: string;\n/, '');
page = page.replace(/\s*defaultStartTime\?: string;\n/, '');
page = page.replace(/\s*defaultEndTime\?: string;\n/, '');

// Remove timezone and shift block from card
const timezoneBlockRegex = /<div className="space-y-1 bg-neutral-50 dark:bg-slate-800\/50 p-2 rounded-lg col-span-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;

// Actually it's easier to replace specific lines:
page = page.replace(
  /<div className="space-y-1 bg-neutral-50 dark:bg-slate-800\/50 p-2 rounded-lg col-span-2">[\s\S]*?<\/div>/,
  ''
);
page = page.replace(
  /<div className="space-y-1 bg-neutral-50 dark:bg-slate-800\/50 p-2 rounded-lg">[\s\S]*?Globe[\s\S]*?<\/div>/,
  ''
);

fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', page);
console.log("Cleaned up markets page");
