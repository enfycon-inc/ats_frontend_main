const fs = require('fs');
const lines = fs.readFileSync('temp_job_details.txt', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('const isSuperOrAdmin =')) {
    console.log(`Line ${i + 1}: ${line}`);
    console.log(`Line ${i}: ${lines[i - 1]}`);
    console.log(`Line ${i-1}: ${lines[i - 2]}`);
    console.log(`Line ${i-2}: ${lines[i - 3]}`);
  }
});
