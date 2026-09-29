const fs = require('fs');

const path = 'lib/ats-api.ts';
let content = fs.readFileSync(path, 'utf-8');

// JobPayload modifications
content = content.replace(
  '  duration: string;\n',
  '  duration: string;\n  accountManagerId?: string;\n  endClientName?: string;\n  workingDays?: string[];\n  workStartTime?: string;\n  workEndTime?: string;\n  assignedTo?: string;\n'
);

// Branches Create
content = content.replace(
  '    shiftTiming?: string;\n    breakDurationMinutes?: number;\n    enableGlobalRemarks?: boolean;\n  }): Promise<any> {',
  '    shiftTiming?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];\n    breakDurationMinutes?: number;\n    enableGlobalRemarks?: boolean;\n  }): Promise<any> {'
);

// Branches Update
content = content.replace(
  '    shiftTiming?: string;\n    breakDurationMinutes?: number;\n    enableGlobalRemarks?: boolean;\n  }): Promise<any> {',
  '    shiftTiming?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];\n    breakDurationMinutes?: number;\n    enableGlobalRemarks?: boolean;\n  }): Promise<any> {'
);

// Business Units Create
content = content.replace(
  '    shiftTiming?: string;\n            timezone?: string;\n        breakDurationMinutes?: number;\n    allowNone?: boolean;',
  '    shiftTiming?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];\n            timezone?: string;\n        breakDurationMinutes?: number;\n    allowNone?: boolean;'
);

// Business Units Update
content = content.replace(
  '    shiftTiming?: string;\n            timezone?: string;\n        breakDurationMinutes?: number;\n    allowNone?: boolean;',
  '    shiftTiming?: string;\n    workStartTime?: string;\n    workEndTime?: string;\n    workingDays?: string[];\n            timezone?: string;\n        breakDurationMinutes?: number;\n    allowNone?: boolean;'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('ats-api.ts patched!');
