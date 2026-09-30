const fs = require('fs');

function purgeMarket(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(/const \[market, setMarket\] = useState<.*>\(.*?\);/g, '');
  content = content.replace(/setMarket\(.*?\);/g, '');
  content = content.replace(/market: market,/g, '');
  content = content.replace(/market=\{market\}/g, '');
  content = content.replace(/market === "IN"/g, 'true');
  content = content.replace(/market === "US"/g, 'false');
  content = content.replace(/market !== "IN"/g, 'false');
  content = content.replace(/market !== "US"/g, 'true');
  // Remove unused market variables
  content = content.replace(/let targetMarket = ".*?";/g, '');
  content = content.replace(/let branchMarketStr = .*?;/g, '');
  content = content.replace(/const activeBranchMarket = .*?;/g, '');
  content = content.replace(/const bMarket = .*?;/g, '');
  fs.writeFileSync(filename, content);
}

purgeMarket('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx');
purgeMarket('app/(dashboard)/job-posting/new/UsStaffingForm.tsx');
