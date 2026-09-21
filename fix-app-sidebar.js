
const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "components/layout/app-sidebar.tsx");
let c = fs.readFileSync(p, "utf8");
c = c.replace(
  "      }\n    }, [initialNavigation, liveProfile]);\n  }, [initialNavigation]);",
  "      }\n    }, [initialNavigation, liveProfile]);"
);
fs.writeFileSync(p, c);
console.log("Fixed syntax properly");

