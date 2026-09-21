
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "components/layout/app-sidebar.tsx");
let c = fs.readFileSync(p, "utf8");

c = c.replace(/bg-white\/10 dark:bg-white\/5/g, "bg-default-200 dark:bg-slate-800");

fs.writeFileSync(p, c);
console.log("Fixed sidebar skeleton colors");

