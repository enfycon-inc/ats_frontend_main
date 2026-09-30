const fs = require('fs');

function processIndiaForm() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'utf8');
  
  // 1. initialBranchContext.isUs ? "USD" : "INR" -> "INR"
  content = content.replace(/initialBranchContext\.isUs \? "[^"]*" : ("[^"]*")/g, '$1');
  
  // 2. initialBranchContext.isUs ? '80' : '8.33% Placement Commission' (could use single quotes)
  content = content.replace(/initialBranchContext\.isUs \? '[^']*' : ('[^']*')/g, '$1');

  // 3. initialBranchContext.isUs ? "80" : "8.33% Placement Commission"
  content = content.replace(/initialBranchContext\.isUs \? "80" : "8.33% Placement Commission"/g, '"8.33% Placement Commission"');

  // 4. market === "IN" -> true
  content = content.replace(/market === "IN" \? INDIAN_WORK_AUTHORIZATION_OPTIONS : WORK_AUTHORIZATION_OPTIONS/g, 'INDIAN_WORK_AUTHORIZATION_OPTIONS');
  
  // 5. market === "IN" in other places
  content = content.replace(/market === "IN"/g, 'true');
  content = content.replace(/market !== "IN"/g, 'false');
  content = content.replace(/market === 'IN'/g, 'true');

  // 6. Hardcode state initialization
  content = content.replace(/useState<"US" \| "IN">\(\(\) => initialBranchContext\.market\)/g, 'useState<"IN">("IN")');

  fs.writeFileSync('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', content);
  console.log("Processed India form");
}

function processUsForm() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', 'utf8');
  
  // 1. initialBranchContext.isUs ? "USD" : "INR" -> "USD"
  content = content.replace(/initialBranchContext\.isUs \? ("[^"]*") : "[^"]*"/g, '$1');
  content = content.replace(/initialBranchContext\.isUs \? ("[^"]*") : '8\.33% Placement Commission'/g, '$1');

  // 4. market === "IN"
  content = content.replace(/market === "IN" \? INDIAN_WORK_AUTHORIZATION_OPTIONS : WORK_AUTHORIZATION_OPTIONS/g, 'WORK_AUTHORIZATION_OPTIONS');
  
  // 5. market === "IN" in other places -> false
  content = content.replace(/market === "IN"/g, 'false');
  content = content.replace(/market !== "IN"/g, 'true');
  content = content.replace(/market === 'IN'/g, 'false');

  // 6. Hardcode state initialization
  content = content.replace(/useState<"US" \| "IN">\(\(\) => initialBranchContext\.market\)/g, 'useState<"US">("US")');

  fs.writeFileSync('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', content);
  console.log("Processed US form");
}

processIndiaForm();
processUsForm();
