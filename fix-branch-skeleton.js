const fs = require('fs');

const file = 'app/(dashboard)/settings/branch/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /\{loading \? \([\s\S]*?<div className="animate-spin rounded-full[\s\S]*?<\/div>[\s\S]*?\) : viewMode === "table" \? \(/;

const skeletonStr = `{loading ? (
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-neutral-50/50 dark:bg-slate-850/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-10"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3.5 px-4 text-right"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 text-center"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-md bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-12 bg-blue-100 dark:bg-blue-900/40 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-1"><div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === "table" ? (`;

c = c.replace(regex, skeletonStr);
fs.writeFileSync(file, c);
console.log("Updated branch page loading skeleton via regex");
