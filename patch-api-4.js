const fs = require('fs');
let content = fs.readFileSync('lib/ats-api.ts', 'utf-8');

// JobPayload insertion
content = content.replace(
  '  tenantId: string;\n}',
  '  tenantId: string;\n  accountManagerId?: string;\n  endClientName?: string;\n  workingDays?: string[];\n  workStartTime?: string;\n  workEndTime?: string;\n  assignedTo?: string;\n}'
);

// Branches insertion (replace first 2 occurrences of enableGlobalRemarks?: boolean;)
content = content.replace(
  'enableGlobalRemarks?: boolean;',
  'enableGlobalRemarks?: boolean;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];'
);
content = content.replace(
  'enableGlobalRemarks?: boolean;',
  'enableGlobalRemarks?: boolean;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];'
);

// Business Units insertion (replace first 2 occurrences of podDistributionStrategy?: string;)
content = content.replace(
  'podDistributionStrategy?: string;',
  'podDistributionStrategy?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];'
);
content = content.replace(
  'podDistributionStrategy?: string;',
  'podDistributionStrategy?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];'
);

fs.writeFileSync('lib/ats-api.ts', content, 'utf-8');
