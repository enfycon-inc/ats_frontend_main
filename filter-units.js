const fs = require('fs');

function filterUnits(filePath, marketType) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  let filterCode = "";
  if (marketType === "US") {
    filterCode = `
            finalUnits = finalUnits.filter((u: any) => {
              const m = (u.market || u.marketSegmentCode || u.marketSegment?.code || "").toUpperCase();
              return m === "US" || m === "USA" || m === "USIT";
            });
`;
  } else if (marketType === "IN") {
    filterCode = `
            finalUnits = finalUnits.filter((u: any) => {
              const m = (u.market || u.marketSegmentCode || u.marketSegment?.code || "").toUpperCase();
              return m === "IN" || m === "INDIA" || m === "IND";
            });
`;
  } else {
    filterCode = `
            finalUnits = finalUnits.filter((u: any) => {
              const m = (u.market || u.marketSegmentCode || u.marketSegment?.code || "").toUpperCase();
              return m !== "US" && m !== "USA" && m !== "USIT" && m !== "IN" && m !== "INDIA" && m !== "IND";
            });
`;
  }

  // Insert right after `let finalUnits = unitsList || [];`
  content = content.replace(
    /let finalUnits = unitsList \|\| \[\];/g,
    `let finalUnits = unitsList || [];\n${filterCode}`
  );

  fs.writeFileSync(filePath, content);
}

filterUnits('app/(dashboard)/job-posting/new/UsStaffingForm.tsx', 'US');
filterUnits('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'IN');
filterUnits('app/(dashboard)/job-posting/new/GlobalStandardForm.tsx', 'GLOBAL');
console.log("Filtered units applied");
