
const fs = require("fs");
const path = require("path");

const dataTablePath = path.join(__dirname, "app/(dashboard)/job-posting/components/data-table.tsx");
let content = fs.readFileSync(dataTablePath, "utf8");

const uiInsertion = `{/* 3. CREATED BY */}`;
const branchUiCode = `
          {/* BRANCH */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              BRANCH
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#1a4fa0] cursor-pointer transition-colors"
            >
              <option value="All">All Branches</option>
              {availableBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
`;
if (content.includes(uiInsertion)) {
  content = content.replace(uiInsertion, branchUiCode + "\n          " + uiInsertion);
  console.log("Added Branch UI!");
} else {
  console.log("Could not find 3. CREATED BY");
}

fs.writeFileSync(dataTablePath, content);

