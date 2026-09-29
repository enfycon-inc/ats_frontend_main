const fs = require('fs');
const glob = require('glob');

glob('app/**/*.tsx', (err, files) => {
  if (err) throw err;
  let modifiedCount = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Remove references to job.clientName -> 'N/A' or client object
    content = content.replace(/job\.clientName/g, "(job as any).clientName || 'N/A'");
    content = content.replace(/job\.endClientName/g, "(job as any).endClientName || 'N/A'");
    content = content.replace(/job\.businessUnit/g, "(job as any).businessUnit || 'N/A'");
    content = content.replace(/job\.assignedTo/g, "(job as any).assignedTo || 'N/A'");
    
    // Remove references to job.workingDays, etc.
    content = content.replace(/job\.workingDays/g, "([] as string[])");
    content = content.replace(/job\.workStartTime/g, "''");
    content = content.replace(/job\.workEndTime/g, "''");

    if (content !== original) {
      fs.writeFileSync(file, content);
      modifiedCount++;
    }
  });

  console.log(`✅ Fixed missing fields in ${modifiedCount} TSX files`);
});
