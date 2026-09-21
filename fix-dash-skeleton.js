
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/page.tsx");
let c = fs.readFileSync(p, "utf8");

// Make sure Skeleton is imported
if (!c.includes("import { Skeleton }")) {
  c = c.replace(
    "import { Button } from \"@/components/ui/button\";",
    "import { Button } from \"@/components/ui/button\";\nimport { Skeleton } from \"@/components/ui/skeleton\";"
  );
}

const skeletonUI = `    if (status !== "ready" || loading || !profile || !selection) {
      return (
        <div className="space-y-6 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64 rounded-lg bg-indigo-50 dark:bg-slate-800" />
            <Skeleton className="h-4 w-96 rounded bg-default-100 dark:bg-slate-800" />
          </div>

          {/* Top Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-24 rounded bg-default-100 dark:bg-slate-800" />
                    <Skeleton className="h-6 w-12 rounded-md bg-default-200 dark:bg-slate-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-xl p-5 h-[400px]">
              <Skeleton className="h-6 w-48 rounded mb-6 bg-default-100 dark:bg-slate-800" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded bg-default-50 dark:bg-slate-800/50" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-xl p-5 h-[400px]">
              <Skeleton className="h-6 w-32 rounded mb-6 bg-default-100 dark:bg-slate-800" />
              <Skeleton className="h-[250px] w-full rounded bg-default-50 dark:bg-slate-800/50" />
            </div>
          </div>

          {/* Bottom Feed Skeleton */}
          <div className="bg-white dark:bg-slate-900 border border-default-200 dark:border-slate-800 rounded-xl p-5">
            <Skeleton className="h-6 w-40 rounded mb-6 bg-default-100 dark:bg-slate-800" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full bg-default-100 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 rounded bg-default-100 dark:bg-slate-800" />
                    <Skeleton className="h-3 w-1/4 rounded bg-default-50 dark:bg-slate-800/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }`;

// Replace the spinner with the new skeleton UI
c = c.replace(
  /if \(status !== "ready" \|\| loading \|\| !profile \|\| !selection\) \{\n\s*return \(\n\s*<div className="flex flex-col items-center justify-center min-h-\[60vh\]">\n\s*<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"><\/div>\n\s*<p className="mt-4 text-sm text-default-500">Loading workspace dashboard...<\/p>\n\s*<\/div>\n\s*\);\n\s*\}/,
  skeletonUI
);

fs.writeFileSync(p, c);
console.log("Fixed dashboard page skeleton");

