const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'app', '(dashboard)', 'job-posting');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function replaceInFile(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  let original = c;

  // new/page.tsx & edit/page.tsx schema
  c = c.replace(/assignedTo: zod\.string\(\)\.optional\(\),/g, '');
  c = c.replace(/assignedApproverRole: finalApproverRole,/g, '');
  c = c.replace(/assignedTo: resolvedAssignedTo,/g, '');
  
  // mock-jobs.ts / interfaces
  c = c.replace(/assignedTo: string;/g, '');
  c = c.replace(/assignedApproverRole\?: string \| null;/g, '');
  c = c.replace(/assignedTo: api\.assignedTo \|\| "N\/A",/g, '');
  c = c.replace(/assignedApproverRole: api\.assignedApproverRole \|\| null,/g, '');
  
  // data table / dashboard columns
  c = c.replace(/"assignedTo",/g, '');
  c = c.replace(/\{ id: "assignedTo", label: "Pods & Recruitment Heads" \},/g, '');

  if (c !== original) {
    fs.writeFileSync(filePath, c, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir(frontendDir, replaceInFile);
console.log('Frontend job-posting patched');
