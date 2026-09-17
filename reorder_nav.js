const fs = require('fs');
const file = 'c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/constants/navigation.ts';
let content = fs.readFileSync(file, 'utf8');

const applicantsBlock = \  {
    id: "applicants",
    label: "Candidates & Talent Pool",
    href: "/applicants",
    icon: Users,
    children: [
      { label: "All Candidates", href: "/applicants/all" },
      { label: "US IT Candidate Search", href: "/applicants/resume-search/usit" },
      { label: "Domestic Candidate Search", href: "/applicants/resume-search/domestic" },
      { label: "Upload Single CV", href: "/applicants/new" },
      { label: "Batch CV Parsing Engine", href: "/applicants/bulk" },
      { label: "Pipeline View", href: "/applicants/pipeline" },
    ],
  },\;

const recruitmentBlock = \  {
    id: "submissions-tracker",
    label: "Recruitment",
    href: "/utility/submissions",
    icon: ClipboardList,
    children: [
      { label: "My Submissions", href: "/utility/submissions?view=my" },
      { label: "Pod Submissions", href: "/utility/submissions?view=pod" },
      { label: "All Submissions", href: "/utility/submissions?view=all" },
    ],
  },\;

// Replace both with unique placeholders
content = content.replace(applicantsBlock, '%%APPLICANTS%%');
content = content.replace(recruitmentBlock, '%%RECRUITMENT%%');

// Put Recruitment first, Applicants second
content = content.replace('%%APPLICANTS%%', recruitmentBlock);
content = content.replace('%%RECRUITMENT%%', applicantsBlock);

fs.writeFileSync(file, content, 'utf8');
