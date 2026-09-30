const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes("node_modules") && !file.includes(".next") && !file.includes(".git")) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes(`"DOM"`) || content.includes(`'DOM'`)) {
          results.push(file);
        }
      }
    }
  });
  return results;
}

const files = walk(process.cwd());
console.log(files);
