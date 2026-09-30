const fs = require('fs');
const files = [
  'app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx',
  'app/(dashboard)/job-posting/new/UsStaffingForm.tsx',
  'app/(dashboard)/job-posting/new/GlobalStandardForm.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Insert import at the top
  if (!content.includes('job-form-constants')) {
    content = content.replace(
      'import ReactCountryFlag from "react-country-flag";',
      `import ReactCountryFlag from "react-country-flag";\nimport { WORK_AUTHORIZATION_OPTIONS, INDIAN_WORK_AUTHORIZATION_OPTIONS, INDIA_STATES_CITIES, US_STATES_CITIES } from "@/lib/job-form-constants";`
    );
  }

  // Remove the hardcoded arrays
  content = content.replace(/const WORK_AUTHORIZATION_OPTIONS = \[[\s\S]*?\];/g, '');
  content = content.replace(/const INDIAN_WORK_AUTHORIZATION_OPTIONS = \[[\s\S]*?\];/g, '');
  content = content.replace(/\/\/ India states with cities\r?\nconst INDIA_STATES_CITIES: Record<string, string\[\]> = \{[\s\S]*?\};\r?\n/g, '');
  content = content.replace(/\/\/ US states with cities\r?\nconst US_STATES_CITIES: Record<string, string\[\]> = \{[\s\S]*?\};\r?\n/g, '');

  fs.writeFileSync(f, content);
});
