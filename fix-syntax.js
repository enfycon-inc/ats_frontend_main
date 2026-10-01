const fs = require('fs');

function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const badPattern = `const getInitialActiveBranchContext = () => {
  if (typeof window === "undefined") {
    return {
      market: "IN" as "US" | "IN",
      
      branchName: "",
      branchId: "",
    };
  }
  const bId = localStorage.getItem("active_branch_id") || "";
  const bName = localStorage.getItem("active_branch_name") || "";
  

  branchName: bName,
    branchId: bId,
  };
};`;

  const goodPattern = `const getInitialActiveBranchContext = () => {
  if (typeof window === "undefined") {
    return {
      branchName: "",
      branchId: "",
    };
  }
  const bId = localStorage.getItem("active_branch_id") || "";
  const bName = localStorage.getItem("active_branch_name") || "";
  
  return {
    branchName: bName,
    branchId: bId,
  };
};`;

  content = content.replace(badPattern, goodPattern);
  fs.writeFileSync(filePath, content);
}

fix('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx');
fix('app/(dashboard)/job-posting/new/UsStaffingForm.tsx');
console.log("Fixed!");
