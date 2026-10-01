const fs = require('fs');
let content = fs.readFileSync('constants/navigation.ts', 'utf8');

const regex = /({\s*label:\s*"Active Tenants",\s*href:\s*"\/utility\/approvals\?tab=tenants"\s*},\s*],\s*},)/;
const insertion = `\n    {
      id: "platform-markets",
      label: "Markets",
      href: "/management/markets",
      icon: Globe,
    },`;

if (regex.test(content) && !content.includes('id: "platform-markets"')) {
  content = content.replace(regex, `$1${insertion}`);
  fs.writeFileSync('constants/navigation.ts', content);
  console.log("Success");
} else {
  console.log("Failed to match");
}
