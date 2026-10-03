const fs = require('fs'); 
let f = fs.readFileSync('app/(dashboard)/job-posting/[id]/page.tsx', 'utf8'); 
f = f.replace('import { atsApi } from "@/lib/ats-api";', 'import { atsApi } from "@/lib/ats-api";\nimport { CandidateSubmissionModal } from "@/components/job-posting/CandidateSubmissionModal";'); 
fs.writeFileSync('app/(dashboard)/job-posting/[id]/page.tsx', f);
