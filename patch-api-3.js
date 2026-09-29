const fs = require('fs');
let content = fs.readFileSync('lib/ats-api.ts', 'utf-8');

// Quick and dirty insertion for Branches create
content = content.replace(
  'enableGlobalRemarks?: boolean;',
  'enableGlobalRemarks?: boolean; workStartTime?: string; workEndTime?: string; workingDays?: string[];'
);

// Quick and dirty insertion for Branches update
content = content.replace(
  'enableGlobalRemarks?: boolean;',
  'enableGlobalRemarks?: boolean; workStartTime?: string; workEndTime?: string; workingDays?: string[];'
);

// Quick and dirty insertion for Business Units create
content = content.replace(
  'allowNone?: boolean;',
  'allowNone?: boolean; workStartTime?: string; workEndTime?: string; workingDays?: string[];'
);

// Quick and dirty insertion for Business Units update
content = content.replace(
  'allowNone?: boolean;',
  'allowNone?: boolean; workStartTime?: string; workEndTime?: string; workingDays?: string[];'
);

fs.writeFileSync('lib/ats-api.ts', content, 'utf-8');
