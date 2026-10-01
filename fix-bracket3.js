const fs = require('fs');
const file = 'app/(dashboard)/management/markets/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const target = `        ))}
      </div>
    </div>`;
const replacement = `        ))}
      </div>
      )}
    </div>`;

c = c.replace(target, replacement);
fs.writeFileSync(file, c);
