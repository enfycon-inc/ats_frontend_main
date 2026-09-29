const fs = require('fs');

const frontendFile = 'app/(dashboard)/job-posting/components/job-posting-dashboard.tsx';
let code = fs.readFileSync(frontendFile, 'utf8');

const oldFilter = `    } else if (viewName === "My Jobs" || viewName === "Assigned to Me") {
      const myJobs = baseData.filter(
        (job) =>
          job.primaryRecruiterId === currentUser?.id ||
          (currentUser?.fullName && job.primaryRecruiter === currentUser.fullName) ||
          job.recruitmentManagerId === currentUser?.id
      );
      setJobsData(myJobs);`;

const newFilter = `    } else if (viewName === "My Jobs" || viewName === "Assigned to Me") {
      const myJobs = baseData.filter(
        (job) => {
          if (isAccountManager) {
            return job.creatorEmail === currentUser?.email || (currentUser?.fullName && job.createdBy === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id;
          }
          return job.primaryRecruiterId === currentUser?.id ||
            (currentUser?.fullName && job.primaryRecruiter === currentUser.fullName) ||
            job.recruitmentManagerId === currentUser?.id;
        }
      );
      setJobsData(myJobs);`;

code = code.replace(oldFilter, newFilter);

// Also fix the weird "Sahadeb Sen" mockup bug
code = code.replace(/if \(pref === "My Jobs"\) return job\.primaryRecruiter === "Sahadeb Sen";/g, `if (pref === "My Jobs") {
            if (isAccountManager) return job.creatorEmail === currentUser?.email || (currentUser?.fullName && job.createdBy === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id;
            return job.primaryRecruiterId === currentUser?.id || (currentUser?.fullName && job.primaryRecruiter === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id;
          }`);

fs.writeFileSync(frontendFile, code);
console.log('Fixed frontend jobs dashboard.');
