
const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "lib/navigation-bootstrap.ts");
let content = fs.readFileSync(p, "utf8");

if (!content.includes("import { cache }")) {
  content = "import { cache } from \"react\";\n" + content;
  content = content.replace("export async function loadNavigationBootstrap", "export const loadNavigationBootstrap = cache(async function");
  content = content.replace("  } catch { return null; }\n}", "  } catch { return null; }\n});");
  fs.writeFileSync(p, content);
  console.log("Wrapped in cache()");
} else {
  console.log("Already wrapped");
}

