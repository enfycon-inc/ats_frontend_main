const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedCount = 0;

walkDir('app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/job\.clientName/g, "(job as any).clientName || 'N/A'");
    content = content.replace(/job\.endClientName/g, "(job as any).endClientName || 'N/A'");
    content = content.replace(/job\.businessUnit/g, "(job as any).businessUnit || 'N/A'");
    content = content.replace(/job\.assignedTo/g, "(job as any).assignedTo || 'N/A'");
    
    content = content.replace(/job\.workingDays/g, "([] as string[])");
    content = content.replace(/job\.workStartTime/g, "''");
    content = content.replace(/job\.workEndTime/g, "''");

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      modifiedCount++;
    }
  }
});

console.log(`✅ Fixed missing fields in ${modifiedCount} TSX/TS files`);
