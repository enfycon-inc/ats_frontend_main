const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/settings/branch/page.tsx', 'utf8');

// 1. Add marketSegments state
if (!page.includes('const [marketSegments, setMarketSegments]')) {
  page = page.replace(
    'const [tenantRoles, setTenantRoles] = useState<any[]>([]);',
    `const [tenantRoles, setTenantRoles] = useState<any[]>([]);\n  const [marketSegments, setMarketSegments] = useState<any[]>([]);`
  );
}

// 2. Fetch marketSegments
if (!page.includes('atsApi.marketSegments.list().catch')) {
  page = page.replace(
    'atsApi.auth.listRoles().catch(() => []),',
    `atsApi.auth.listRoles().catch(() => []),\n        atsApi.marketSegments.list().catch(() => []),`
  );
  page = page.replace(
    'const [listData, hierData, rolesData] = await Promise.all([',
    'const [listData, hierData, rolesData, msData] = await Promise.all(['
  );
  page = page.replace(
    'setTenantRoles(rolesData || []);',
    `setTenantRoles(rolesData || []);\n      setMarketSegments(msData || []);`
  );
}

// 3. Add marketSegmentId to forms
page = page.replace(
  'allowUnassigned: true,\n    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",\n  });',
  `allowUnassigned: true,\n    marketSegmentId: "",\n    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",\n  });`
);
// replace second one
page = page.replace(
  'allowUnassigned: true,\n    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",\n  });',
  `allowUnassigned: true,\n    marketSegmentId: "",\n    podDistributionStrategy: "AUTO" as "AUTO" | "MANUAL",\n  });`
);

// 4. Update the create unit payload
page = page.replace(
  `shiftTiming: unitFormData.shiftTiming,`,
  `shiftTiming: unitFormData.shiftTiming,\n        marketSegmentId: unitFormData.marketSegmentId || null,`
);

// 5. Update edit unit mapping
page = page.replace(
  `shiftTiming: unit.shiftTiming || (isUs ? "US Shift" : "General Shift"),`,
  `shiftTiming: unit.shiftTiming || (isUs ? "US Shift" : "General Shift"),\n      marketSegmentId: unit.marketSegmentId || "",`
);

// 6. Update edit unit payload
page = page.replace(
  `shiftTiming: editUnitFormData.shiftTiming,`,
  `shiftTiming: editUnitFormData.shiftTiming,\n        marketSegmentId: editUnitFormData.marketSegmentId || null,`
);

// 7. Update the Create Market Focus select
const createMarketSearch = `label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Market Focus
                  </label>
                  <select
                    value={unitFormData.market}
                    onChange={(e) => {
                      const m = e.target.value;
                      const isUs = m === "US";
                      setUnitFormData({
                        ...unitFormData,
                        market: m,
                        currency: isUs ? "USD" : "INR",
                        shiftTiming: isUs ? "US Shift" : "General Shift",
                        workStartTime: isUs ? "20:00" : "09:30",
                        workEndTime: isUs ? "05:00" : "18:30",
                        timezone: isUs ? "America/New_York" : "Asia/Kolkata",
                      });
                    }}
                    className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="INDIA">Domestic India</option>
                    <option value="US">US IT Staffing</option>
                  </select>`;

const createMarketReplace = `label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Market Segment Focus
                  </label>
                  <select
                    value={unitFormData.marketSegmentId || ""}
                    onChange={(e) => {
                      const msId = e.target.value;
                      const ms = marketSegments.find((m) => m.id === msId);
                      setUnitFormData({
                        ...unitFormData,
                        marketSegmentId: msId,
                        market: ms ? ms.code : "INDIA",
                        currency: ms ? ms.defaultCurrency : "INR"
                      });
                    }}
                    className="w-full h-8.5 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select Market Segment --</option>
                    {marketSegments.map((ms) => (
                      <option key={ms.id} value={ms.id}>{ms.name} ({ms.defaultCurrency})</option>
                    ))}
                  </select>`;
page = page.replace(createMarketSearch, createMarketReplace);

// 8. Update Edit Market Focus select
const editMarketSearch = `label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Market Segment
                  </label>
                  <select
                    value={editUnitFormData.market}
                    onChange={(e) => {
                      const m = e.target.value;
                      setEditUnitFormData({
                        ...editUnitFormData,
                        market: m,
                        currency: m === "US" ? "USD" : "INR",
                        timezone: m === "US" ? "America/New_York" : "Asia/Kolkata",
                        shiftTiming: m === "US" ? "US Shift" : "General Shift",
                        workStartTime: m === "US" ? "20:00" : "09:30",
                        workEndTime: m === "US" ? "05:00" : "18:30",
                      });
                    }}
                    className="w-full h-9 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-medium text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="INDIA">Domestic IT (India)</option>
                    <option value="US">US IT Staffing</option>
                  </select>`;

const editMarketReplace = `label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Global Market Segment
                  </label>
                  <select
                    value={editUnitFormData.marketSegmentId || ""}
                    onChange={(e) => {
                      const msId = e.target.value;
                      const ms = marketSegments.find((m) => m.id === msId);
                      setEditUnitFormData({
                        ...editUnitFormData,
                        marketSegmentId: msId,
                        market: ms ? ms.code : "INDIA",
                        currency: ms ? ms.defaultCurrency : "INR"
                      });
                    }}
                    className="w-full h-9 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 font-medium text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Select Market Segment --</option>
                    {marketSegments.map((ms) => (
                      <option key={ms.id} value={ms.id}>{ms.name} ({ms.defaultCurrency})</option>
                    ))}
                  </select>`;
page = page.replace(editMarketSearch, editMarketReplace);

fs.writeFileSync('app/(dashboard)/settings/branch/page.tsx', page);
console.log("Updated branch settings page");
