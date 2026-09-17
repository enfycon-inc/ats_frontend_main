const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/constants/navigation.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\s*\{ id: "branch-management", label: "Branch & Office Locations", href: "\/utility\/branches", icon: MapPin \},/, '');

fs.writeFileSync(file, content, 'utf8');
