
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let c = fs.readFileSync(p, "utf8");

// 1. Branch Performance Matrix table body replacement
const matrixOld = `{branchMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-default-400">No branch data available.</td>
                  </tr>
                ) : (`;
const matrixNew = `{isLoadingBranches ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={"skel-matrix-"+i}>
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3 flex justify-center"><Skeleton className="h-5 w-8 rounded-full" /></td>
                      <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                    </tr>
                  ))
                ) : branchMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-default-400">No branch data available.</td>
                  </tr>
                ) : (`;

c = c.replace(matrixOld, matrixNew);

// 2. Job Status by Branch chart replacement
const chartOld = `{branchMetrics.length > 0 ? (
              <div className="w-full h-[320px] px-2">`;
const chartNew = `{isLoadingBranches ? (
              <div className="w-full h-[320px] px-2 flex items-end justify-around pb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={"skel-chart-"+i} className="w-12 rounded-t-sm" style={{ height: Math.floor(Math.random() * 60 + 20) + "%" }} />
                ))}
              </div>
            ) : branchMetrics.length > 0 ? (
              <div className="w-full h-[320px] px-2">`;

c = c.replace(chartOld, chartNew);


// 3. Global Activity Feed replacement
const feedOld = `{recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-default-400">No recent jobs found in the tenant.</td>
                </tr>
              ) : (`;
const feedNew = `{isLoadingBranches ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={"skel-feed-"+i}>
                    <td className="p-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-default-400">No recent jobs found in the tenant.</td>
                </tr>
              ) : (`;

c = c.replace(feedOld, feedNew);

fs.writeFileSync(p, c);
console.log("Fixed dashboard tables and charts skeletons");

