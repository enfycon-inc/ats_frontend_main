const fs = require('fs');

const file = 'app/(dashboard)/utility/users/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /\{loading \? \([\s\S]*?<div className="animate-spin rounded-full[\s\S]*?<\/div>[\s\S]*?\) : filteredUsers\.length === 0 \? \(/;

const skeletonStr = `{loading ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-default-50 text-default-500 font-bold uppercase tracking-wider border-b border-default-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 w-10 text-center"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="py-3 px-4 text-right"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100 dark:divide-slate-800">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-3 text-center"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></td>
                    <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700"></div><div><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-1.5"></div><div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div></div></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-3 px-4"><div className="flex flex-col gap-1.5"><div className="h-5 w-24 bg-blue-100 dark:bg-blue-900/40 rounded-full"></div><div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                    <td className="py-3 px-4"><div className="h-6 w-16 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-full"></div></td>
                    <td className="py-3 px-4 text-right"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredUsers.length === 0 ? (`;

c = c.replace(regex, skeletonStr);
fs.writeFileSync(file, c);
console.log("Updated users page loading skeleton via regex");
