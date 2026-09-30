const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', 'utf8');

const s1 = `            if (pref === "My Jobs") {
              if (isAccountManager) return job.creatorEmail === currentUser?.email || (currentUser?.fullName && job.createdBy === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id;
              return job.recruiterId === currentUser?.id || (currentUser?.fullName && job.recruiter === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id;
            }`;

const r1 = `            if (pref === "My Jobs") {
              if (isAccountManager) return job.creatorEmail === currentUser?.email || (currentUser?.fullName && job.createdBy === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id;
              // Recruiters and Pod Leads can also see jobs they created (where they act as Account Manager)
              return job.recruiterId === currentUser?.id || (currentUser?.fullName && job.recruiter === currentUser.fullName) || job.recruitmentManagerId === currentUser?.id || job.creatorEmail === currentUser?.email || (currentUser?.fullName && job.createdBy === currentUser.fullName);
            }`;

c = c.replace(s1, r1);

const s2 = `          if (isAccountManager) {
            return (
              job.creatorEmail === currentUser?.email ||
              job.createdBy === currentUser?.id ||
              job.accountManagerId === currentUser?.id ||
              (currentUser?.fullName && job.createdBy === currentUser.fullName) ||
              job.recruitmentManagerId === currentUser?.id
            );
          }
          // Recruiters: jobs directly assigned to them or primary recruiter
          return (
            job.recruiterId === currentUser?.id ||
            (currentUser?.fullName && job.recruiter === currentUser.fullName) ||
            job.recruitmentManagerId === currentUser?.id
          );`;

const r2 = `          if (isAccountManager) {
            return (
              job.creatorEmail === currentUser?.email ||
              job.createdBy === currentUser?.id ||
              job.accountManagerId === currentUser?.id ||
              (currentUser?.fullName && job.createdBy === currentUser.fullName) ||
              job.recruitmentManagerId === currentUser?.id
            );
          }
          // Recruiters: jobs directly assigned to them or primary recruiter, PLUS jobs they act as AM for
          return (
            job.recruiterId === currentUser?.id ||
            (currentUser?.fullName && job.recruiter === currentUser.fullName) ||
            job.recruitmentManagerId === currentUser?.id ||
            job.creatorEmail === currentUser?.email ||
            job.createdBy === currentUser?.id ||
            job.accountManagerId === currentUser?.id ||
            (currentUser?.fullName && job.createdBy === currentUser.fullName)
          );`;

c = c.replace(s2, r2);

fs.writeFileSync('app/(dashboard)/job-posting/components/job-posting-dashboard.tsx', c);
console.log('Fixed job-posting-dashboard.tsx');
