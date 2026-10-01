const fs = require('fs');
let page = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

const timezoneBlockStart = `<div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Timezone
                    </span>`;
                    
page = page.substring(0, page.indexOf(timezoneBlockStart)) + 
       `</div></div></div></div>))}</div></div>);}`

fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', page);
console.log("Replaced end of file");
