const fs = require('fs'); 
let f = fs.readFileSync('lib/ats-api.ts', 'utf8'); 
f = f.replace(/noticePeriodDays\?: string;/g, 'noticePeriodDays?: string; skills?: string; currentLocation?: string; preferredLocations?: string;'); 
f = f.replace(/if \(overrides\.noticePeriodDays\) formData\.append\('noticePeriodDays', overrides\.noticePeriodDays\);/g, "if (overrides.noticePeriodDays) formData.append('noticePeriodDays', overrides.noticePeriodDays);\n      if (overrides.skills) formData.append('skills', overrides.skills);\n      if (overrides.currentLocation) formData.append('location', overrides.currentLocation);\n      if (overrides.preferredLocations) formData.append('preferredLocations', overrides.preferredLocations);"); 
fs.writeFileSync('lib/ats-api.ts', f);
