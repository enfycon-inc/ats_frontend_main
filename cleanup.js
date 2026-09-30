const fs = require('fs');

function cleanUpIndiaForm() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'utf8');
  
  // 1. Remove isUs determination logic inside getInitialActiveBranchContext
  content = content.replace(/let isUs = false;[\s\S]*?branchName: bName,/g, 'branchName: bName,');
  content = content.replace(/market: \(isUs \? "US" : "IN"\) as "US" \| "IN",/g, 'market: "IN",');
  content = content.replace(/isUs,/g, '');

  // 2. Remove isUs determination inside handleBusinessUnitChange
  content = content.replace(/const isUs = unitMarket === "US" \|\|.*?isUs \? "US" : "IN";/g, 'const targetM = "IN";');
  content = content.replace(/shift: isUs \? "NIGHT" : "DAY",/g, 'shift: "DAY",');

  // 3. Remove isUsBranch determination
  content = content.replace(/let isUsBranch = false;[\s\S]*?let targetMarket: "US" \| "IN" = "IN";/g, 'let targetMarket = "IN";');
  
  // Replace targetMarket logic
  content = content.replace(/if \(isUsBranch\) {[\s\S]*?isUsBranch = targetMarket === "US";\s*}/g, '');
  
  // Replace shift and sCode logic
  content = content.replace(/shift: isUsBranch \? 'NIGHT' : 'DAY'/g, "shift: 'DAY'");
  content = content.replace(/const sCode = isUsBranch \? 'N' : 'D';/g, "const sCode = 'D';");

  // Default values where the regex failed before
  content = content.replace(/initialBranchContext\.isUs \? "80" : "8\.33% Placement Commission"/g, '"8.33% Placement Commission"');
  content = content.replace(/initialBranchContext\.isUs \? "United States" : "India"/g, '"India"');
  content = content.replace(/initialBranchContext\.isUs \? "US Authorized" : "Indian Citizen"/g, '"Indian Citizen"');
  content = content.replace(/initialBranchContext\.isUs \? "C2C" : "Permanent"/g, '"Permanent"');
  content = content.replace(/initialBranchContext\.isUs \? "US Shift" : "General Shift"/g, '"General Shift"');

  fs.writeFileSync('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', content);
}

function cleanUpUsForm() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', 'utf8');
  
  // Default values
  content = content.replace(/initialBranchContext\.isUs \? "80" : "8\.33% Placement Commission"/g, '"80"');
  content = content.replace(/initialBranchContext\.isUs \? "United States" : "India"/g, '"United States"');
  content = content.replace(/initialBranchContext\.isUs \? "US Authorized" : "Indian Citizen"/g, '"US Authorized"');
  content = content.replace(/initialBranchContext\.isUs \? "C2C" : "Permanent"/g, '"C2C"');
  content = content.replace(/initialBranchContext\.isUs \? "US Shift" : "General Shift"/g, '"US Shift"');

  // 1. Remove isUs determination logic inside getInitialActiveBranchContext
  content = content.replace(/let isUs = false;[\s\S]*?branchName: bName,/g, 'branchName: bName,');
  content = content.replace(/market: \(isUs \? "US" : "IN"\) as "US" \| "IN",/g, 'market: "US",');
  content = content.replace(/isUs,/g, '');

  // 2. Remove isUs determination inside handleBusinessUnitChange
  content = content.replace(/const isUs = unitMarket === "US" \|\|.*?isUs \? "US" : "IN";/g, 'const targetM = "US";');
  content = content.replace(/shift: isUs \? "NIGHT" : "DAY",/g, 'shift: "NIGHT",');

  // 3. Remove isUsBranch determination
  content = content.replace(/let isUsBranch = false;[\s\S]*?let targetMarket: "US" \| "IN" = "IN";/g, 'let targetMarket = "US";');
  
  // Replace targetMarket logic
  content = content.replace(/if \(isUsBranch\) {[\s\S]*?isUsBranch = targetMarket === "US";\s*}/g, '');
  
  // Replace shift and sCode logic
  content = content.replace(/shift: isUsBranch \? 'NIGHT' : 'DAY'/g, "shift: 'NIGHT'");
  content = content.replace(/const sCode = isUsBranch \? 'N' : 'D';/g, "const sCode = 'N';");

  fs.writeFileSync('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', content);
}

cleanUpIndiaForm();
cleanUpUsForm();
console.log("Cleanup done");
