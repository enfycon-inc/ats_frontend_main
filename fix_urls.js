const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/components/applicants/applicants-table.tsx';
let content = fs.readFileSync(file, 'utf8');

const linkCode = \
  const extractProfileLink = (applicant: any): string => {
    if (applicant.candidateCode) return applicant.candidateCode;
    if (applicant.dbId) return \\\CAN-\\\\\\;
    const match = String(applicant.applicantId || "").match(/(\\\d+)/);
    return match ? \\\CAN-\\\\\\ : String(applicant.applicantId || "");
  };

  const extractDbId = (applicant: any): string => {
\;

content = content.replace('  const extractDbId = (applicant: any): string => {', linkCode.trim());
content = content.replace(/href=\{\\\\\\/applicants\\\/\\\$\{applicant\.applicantId\}\\\\}/g, 'href={\/applicants/\\}');
content = content.replace(/router\.push\(\\\\\\/applicants\\\/\\\$\{extractDbId\\(applicant\\)\}\\\\)/g, 'router.push(\/applicants/\\)');

fs.writeFileSync(file, content, 'utf8');
