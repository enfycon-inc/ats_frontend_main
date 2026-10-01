const fs = require('fs');

const file = 'app/(dashboard)/utility/pods/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /if \(loading\) \{\s*return \([\s\S]*?<div className="flex flex-col items-center justify-center min-h-\[350px\]">[\s\S]*?<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" \/>[\s\S]*?<p className="mt-3 text-xs text-neutral-500 font-semibold tracking-wide">Loading Recruitment Pods\.<\/p>[\s\S]*?<\/div>\s*\);\s*\}/;

const skeletonStr = `if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50/80 dark:bg-slate-800/40 border-b border-neutral-200 dark:border-slate-800">
                  <th className="py-3 px-4 w-1/5"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4 w-1/5"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4 w-1/5"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4 w-1/5"><div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1.5"></div><div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-1"><div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-2"></div></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-md ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }`;

c = c.replace(regex, skeletonStr);
fs.writeFileSync(file, c);
console.log("Updated pods page loading skeleton");
