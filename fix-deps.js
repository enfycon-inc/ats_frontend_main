const fs = require('fs');
['app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'app/(dashboard)/job-posting/new/UsStaffingForm.tsx'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\[market, /g, '[');
  content = content.replace(/, market\]/g, ']');
  content = content.replace(/, market,/g, ',');
  fs.writeFileSync(f, content);
});
