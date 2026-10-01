const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/management/units/page.tsx', 'utf8');

// The line is exactly: 
// <span className="text-[10px] text-neutral-400 font-normal">
//   Practice Division
// </span>
content = content.replace(/<span className="text-\[10px\] text-neutral-400 font-normal">\s*Practice Division\s*<\/span>/, "");
fs.writeFileSync('app/(dashboard)/management/units/page.tsx', content);
console.log("Removed from units/page.tsx");
