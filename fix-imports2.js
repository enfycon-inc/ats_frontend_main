const fs = require('fs');
const files = [
  'app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx',
  'app/(dashboard)/job-posting/new/UsStaffingForm.tsx',
  'app/(dashboard)/job-posting/new/GlobalStandardForm.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/const US_STATES_CITIES: Record<string, string\[\]> = \{[\s\S]*?\};\r?\n/g, '');
  content = content.replace(/const INDIA_STATES_CITIES: Record<string, string\[\]> = \{[\s\S]*?\};\r?\n/g, '');
  fs.writeFileSync(f, content);
});
