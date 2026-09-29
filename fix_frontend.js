const fs = require('fs');

function replaceRegexInFile(file, regex, replacement) {
  try {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
  } catch (e) {
    console.error("Error updating " + file, e);
  }
}

replaceRegexInFile('components/applicants/applicants-table.tsx', /parseInt\(candidateId, 10\)/g, 'candidateId');
replaceRegexInFile('components/applicants/applicants-table.tsx', /const candidateIdNum = parseInt\(parts\[parts\.length - 1\], 10\);/g, 'const candidateIdNum = parts[parts.length - 1];');
replaceRegexInFile('components/applicants/upload-cv-modal.tsx', /parsedCandidateId = parseInt\(rawNum, 10\);/g, 'parsedCandidateId = rawNum;');
replaceRegexInFile('components/dashboard/AddCandidateModal.tsx', /parsedCandidateId = parseInt\(rawNum, 10\);/g, 'parsedCandidateId = rawNum;');

console.log('Frontend fixed.');
