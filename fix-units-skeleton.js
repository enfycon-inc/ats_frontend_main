const fs = require('fs');

const file = 'app/(dashboard)/management/units/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const spinnerStr = `{loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs text-neutral-500 mt-2 font-medium">Loading Branch Units...</p>
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (`;

const skeletonStr = `{loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div><div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-blue-100 dark:bg-blue-900/40 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div><div className="h-2.5 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-full"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div><div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700"></div><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredUnits.length === 0 ? (`;

c = c.replace(spinnerStr, skeletonStr);
fs.writeFileSync(file, c);
console.log("Updated units page loading skeleton");
