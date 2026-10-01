const fs = require('fs');
const path = require('path');

function search(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath, pattern);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(pattern)) {
        console.log('FOUND IN:', fullPath);
      }
    }
  }
}

search('.', 'Permission Access Required');
search('.', 'assigned branch');
