const fs = require('fs');

function fixIndia() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'utf8');
  content = content.replace(/isUs: false,/g, '');
  content = content.replace(/const isUs = unitMarket === "US" \|\| unitMarket === "USA" \|\| unit\.currency === "USD" \|\| \(unit\.shiftTiming \|\| ""\)\.toLowerCase\(\)\.includes\("night"\) \|\| \(unit\.shiftTiming \|\| ""\)\.toLowerCase\(\)\.includes\("us"\);/g, '');
  content = content.replace(/const targetM: "US" \| "IN" = isUs \? "US" : "IN";/g, 'const targetM = "IN";');
  fs.writeFileSync('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', content);
}

function fixUs() {
  let content = fs.readFileSync('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', 'utf8');
  content = content.replace(/isUs: false,/g, '');
  content = content.replace(/const isUs = unitMarket === "US" \|\| unitMarket === "USA" \|\| unit\.currency === "USD" \|\| \(unit\.shiftTiming \|\| ""\)\.toLowerCase\(\)\.includes\("night"\) \|\| \(unit\.shiftTiming \|\| ""\)\.toLowerCase\(\)\.includes\("us"\);/g, '');
  content = content.replace(/const targetM: "US" \| "IN" = isUs \? "US" : "IN";/g, 'const targetM = "US";');
  fs.writeFileSync('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', content);
}

fixIndia();
fixUs();
