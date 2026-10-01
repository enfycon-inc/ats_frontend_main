const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/settings/branch/page.tsx', 'utf8');

// I will use regex to find and replace the selects.
// Find the "Market Focus" select block
const marketFocusRegex = /<label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">\s*Market Focus\s*<\/label>\s*<select[\s\S]*?<\/select>/;

const createMarketReplace = `<label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
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

page = page.replace(marketFocusRegex, createMarketReplace);

// Find the "Market Segment" select block in edit form
const editMarketRegex = /<label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">\s*Market Segment\s*<\/label>\s*<select[\s\S]*?<\/select>/;

const editMarketReplace = `<label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
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

page = page.replace(editMarketRegex, editMarketReplace);

fs.writeFileSync('app/(dashboard)/settings/branch/page.tsx', page);
console.log("Regex patch completed");
