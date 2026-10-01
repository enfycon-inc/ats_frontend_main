const fs = require('fs');
const file = 'app/(dashboard)/management/markets/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /        \}\)\}\n      <\/div>\n    <\/div>/,
  `        }))}\n      </div>\n      )}\n    </div>`
);
fs.writeFileSync(file, c);
