const fs = require('fs');

let f = 'app/(dashboard)/job-posting/[id]/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/job\.assignedApproverRole === "POD_LEAD" \? "Recruitment Pod Lead" : job\.assignedApproverRole === "DELIVERY_HEAD" \? "Delivery Head" : "Assigned Reviewer"/g, '"Assigned Reviewer"');

fs.writeFileSync(f, c);
console.log('Fixed [id]/page.tsx');
