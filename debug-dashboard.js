
const fs = require("fs");
const path = require("path");

const ctxPath = path.join(__dirname, "contexts/DashboardContext.tsx");
let content = fs.readFileSync(ctxPath, "utf8");

content = content.replace("} catch {", "} catch (err) {\n          console.error(\"DashboardContext Error:\", err);");

fs.writeFileSync(ctxPath, content);

