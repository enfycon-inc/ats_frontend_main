const fs = require('fs');
const file = 'app/(dashboard)/management/markets/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /if \(permsLoading \|\| loading\) \{\s*return \(\s*<div className="flex h-full items-center justify-center min-h-\[400px\]">\s*<Loader2 className="h-8 w-8 animate-spin text-indigo-600" \/>\s*<\/div>\s*\);\s*\}/g,
  ''
);

c = c.replace(
  /\{\/\* MARKETS GRID \*\/\}\s*<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">/,
  `{/* MARKETS GRID */}
      {permsLoading || loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 w-full"><div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div><div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-700 rounded"></div></div>
                <div className="h-5 w-10 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`
);

const lastIndex = c.lastIndexOf('</div>');
const before = c.substring(0, lastIndex);
const after = c.substring(lastIndex);
const lastDivIndex = before.lastIndexOf('</div>');
c = before.substring(0, lastDivIndex) + '</div>\n      )}\n    </div>\n  );\n}';

fs.writeFileSync(file, c);
