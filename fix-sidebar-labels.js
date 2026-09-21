
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "components/layout/app-sidebar.tsx");
let c = fs.readFileSync(p, "utf8");

c = c.replace(
  "<SidebarGroupLabel>Main Navigation</SidebarGroupLabel>",
  "{!isLoadingProfile && <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>}"
);
c = c.replace(
  "<SidebarGroupLabel>More Options</SidebarGroupLabel>",
  "{!isLoadingProfile && <SidebarGroupLabel>More Options</SidebarGroupLabel>}"
);

fs.writeFileSync(p, c);
console.log("Fixed sidebar labels");

