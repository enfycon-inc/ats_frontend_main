const fs = require('fs');
const file = 'app/(dashboard)/job-posting/components/pending-delegation-requests.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace('variant="outline" onClick={() => handleReject(req.id)}', 'onClick={() => handleReject(req.id)}');

fs.writeFileSync(file, c);
