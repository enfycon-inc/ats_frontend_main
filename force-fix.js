const fs = require('fs');

function forceFix(filePath) {
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let newLines = [];
  let inBadBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const getInitialActiveBranchContext = () => {')) {
      inBadBlock = true;
      newLines.push('const getInitialActiveBranchContext = () => {');
      newLines.push('  if (typeof window === "undefined") {');
      newLines.push('    return { branchName: "", branchId: "" };');
      newLines.push('  }');
      newLines.push('  const bId = localStorage.getItem("active_branch_id") || "";');
      newLines.push('  const bName = localStorage.getItem("active_branch_name") || "";');
      newLines.push('  return { branchName: bName, branchId: bId };');
      newLines.push('};');
      continue;
    }
    
    if (inBadBlock && line.includes('const initialBranchContext = useMemo')) {
      inBadBlock = false;
      newLines.push(line);
      continue;
    }
    
    if (!inBadBlock) {
      newLines.push(line);
    }
  }
  fs.writeFileSync(filePath, newLines.join('\n'));
}

forceFix('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx');
forceFix('app/(dashboard)/job-posting/new/UsStaffingForm.tsx');
console.log("Forced fix applied!");
