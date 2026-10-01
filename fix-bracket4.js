const fs = require('fs');
const file = 'app/(dashboard)/management/markets/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.substring(0, c.lastIndexOf('</div>\n    </div>'));
c += '</div>\n      )}\n    </div>\n  );\n}\n';

fs.writeFileSync(file, c);
