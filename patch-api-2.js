const fs = require('fs');

const path = 'lib/ats-api.ts';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add to JobPayload
content = content.replace(
  /export interface JobPayload \{([\s\S]*?)\}/,
  (match, p1) => {
    if (p1.includes('workStartTime')) return match;
    return `export interface JobPayload {${p1}  accountManagerId?: string;\n  endClientName?: string;\n  workingDays?: string[];\n  workStartTime?: string;\n  workEndTime?: string;\n  assignedTo?: string;\n}`;
  }
);

// 2. Add to Branches create/update
content = content.replace(
  /breakDurationMinutes\?: number;\n\s*enableGlobalRemarks\?: boolean;/g,
  'shiftTiming?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];\n    breakDurationMinutes?: number;\n    enableGlobalRemarks?: boolean;'
);

// 3. Add to Business Units create/update
content = content.replace(
  /timezone\?: string;\n\s*breakDurationMinutes\?: number;\n\s*allowNone\?: boolean;/g,
  'timezone?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];\n    breakDurationMinutes?: number;\n    allowNone?: boolean;'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('ats-api.ts patched again!');
