
const fs = require("fs");
const path = require("path");

const navbarPath = path.join(__dirname, "components/layout/navbar-right.tsx");
let content = fs.readFileSync(navbarPath, "utf8");

const insertionCode = `
  // Enforce "All Branches" context for Global Admins
  useEffect(() => {
    if (isTenantAdmin && typeof window !== "undefined") {
      const currentId = localStorage.getItem("active_branch_id");
      if (currentId !== "all") {
        localStorage.setItem("active_branch_id", "all");
        localStorage.setItem("active_branch_name", "All Branches");
        window.dispatchEvent(new Event("branchChanged"));
        // Need to reload to clear out any old branch data state in the app
        setTimeout(() => window.location.reload(), 50);
      }
    }
  }, [isTenantAdmin]);

  // Global Admins do not need a Branch Switcher UI at all, as they see everything globally.
  if (isTenantAdmin) return null;
`;

const target = `  if (!canSwitchBranch) {`;

if (content.includes(target)) {
  content = content.replace(target, insertionCode + "\n" + target);
} else {
  console.log("Could not find target line.");
}

fs.writeFileSync(navbarPath, content);
console.log("Successfully updated BranchSwitcher");

