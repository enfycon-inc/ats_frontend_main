
const fs = require("fs");
const path = require("path");

const dataTablePath = path.join(__dirname, "app/(dashboard)/job-posting/components/data-table.tsx");
let content = fs.readFileSync(dataTablePath, "utf8");

const availableBranchesCode = `
  // Unique available Branches for dropdown
  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    data.forEach((j) => {
      const branch = j.businessUnit || j.branchName;
      if (branch && branch !== "N/A" && branch.trim()) {
        branches.add(branch.trim());
      }
    });
    return Array.from(branches).sort();
  }, [data]);
`;

const creatorInsertion = `  // Unique available Creators`;
if (content.includes(creatorInsertion)) {
  content = content.replace(creatorInsertion, availableBranchesCode + "\n" + creatorInsertion);
}

// Add state for selectedBranch
const stateInsertion = `const [selectedCreator, setSelectedCreator] = useState("All");`;
if (content.includes(stateInsertion)) {
  content = content.replace(stateInsertion, `const [selectedBranch, setSelectedBranch] = useState("All");\n  ` + stateInsertion);
}

// Add filtering logic inside useMemo for filteredData
const filterLogicInsertion = `if (selectedCreator !== "All") {`;
const branchFilterLogic = `
    if (selectedBranch !== "All") {
      filtered = filtered.filter((j) => {
        const branch = j.businessUnit || j.branchName;
        return branch === selectedBranch;
      });
    }
`;
if (content.includes(filterLogicInsertion)) {
  content = content.replace(filterLogicInsertion, branchFilterLogic + "\n    " + filterLogicInsertion);
}

// Add UI component for Branch dropdown
const uiInsertion = `{/* 2. CREATED BY */}`;
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
}

fs.writeFileSync(dataTablePath, content);
console.log("Added Branch filter to DataTable");

