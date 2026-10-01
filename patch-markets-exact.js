const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

// I'll just use a brute force replace for the exact block.
const blockStart = `<div className="grid grid-cols-2 gap-3 mt-4">`;
const blockEnd = `</div>\n\n                <div className="flex items-center justify-between p-3 bg-neutral-50`;

const match = page.substring(page.indexOf(blockStart), page.indexOf(blockEnd));

const newBlock = `<div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="space-y-1 bg-neutral-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                      <Banknote className="h-3 w-3" /> Currency
                    </span>
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      {segment.defaultCurrency || 'N/A'}
                    </span>
                  </div>
                </div>`;

if (match.length > 10) {
  page = page.replace(match, newBlock);
}

fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', page);
console.log("Fixed block");
