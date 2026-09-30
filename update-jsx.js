const fs = require('fs');
let data = fs.readFileSync('app/(dashboard)/utility/users/page.tsx', 'utf8');

const regexTaken = /<XCircle className="h-3\.5 w-3\.5 text-red-500 shrink-0" \/> Registered/g;
const regexAvail = /<CheckCircle2 className="h-3\.5 w-3\.5 text-emerald-500 shrink-0" \/> Available!/g;

data = data.replace(regexTaken, '<XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> {emailCheckMsg}');
data = data.replace(regexAvail, '<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {emailCheckMsg}');

fs.writeFileSync('app/(dashboard)/utility/users/page.tsx', data);
