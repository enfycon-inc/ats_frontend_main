const fs = require('fs');
const file = 'app/(dashboard)/job-posting/components/job-posting-dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix `roleDefaultSavedViews` to include "My Jobs" for Account Managers
const oldSaved = `    if (isAccountManager) {
      return ["Active Jobs", "Unassigned Jobs", "Draft Jobs"];
    }`;
const newSaved = `    if (isAccountManager) {
      return ["All Jobs", "My Jobs", "Active Jobs", "Unassigned Jobs", "Draft Jobs"];
    }`;
code = code.replace(oldSaved, newSaved);

// Fix `initialActiveView` to map "direct" to "My Jobs" for EVERYONE
const oldInitial = `  const initialActiveView = useMemo(() => {
    if (isRecruiter) {
      if (filterParam === "direct") return "My Jobs";
      if (filterParam === "pod") return "Pod Jobs";
      return "All Jobs";
    }
    if (filterParam === "unassigned") return "Unassigned Jobs";
    if (initialStatusFilter === "Active") return "Active Jobs";
    if (initialStatusFilter === "Draft") return "Draft Jobs";
    return "All Jobs";
  }, [isRecruiter, filterParam, initialStatusFilter]);`;

const newInitial = `  const initialActiveView = useMemo(() => {
    if (filterParam === "direct") return "My Jobs";
    if (filterParam === "pod") return "Pod Jobs";
    if (filterParam === "unassigned") return "Unassigned Jobs";
    if (initialStatusFilter === "Active") return "Active Jobs";
    if (initialStatusFilter === "Draft") return "Draft Jobs";
    return "All Jobs";
  }, [isRecruiter, filterParam, initialStatusFilter]);`;
code = code.replace(oldInitial, newInitial);

fs.writeFileSync(file, code);
console.log('Fixed initial active view.');
