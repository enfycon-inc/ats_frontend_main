const fs = require('fs');
let data = fs.readFileSync('app/(dashboard)/utility/users/page.tsx', 'utf8');

const regexMsg = /setEmailCheckMsg\(`Email \$\{rawEmail\} (.*?)`\);/g;
data = data.replace(regexMsg, 'setEmailCheckMsg(`$1`);');

const regexJsxTaken = /<span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-bold">\s*<XCircle className="h-3\.5 w-3\.5 text-red-500 shrink-0" \/> \{emailCheckMsg\}\s*<\/span>/;
const newJsxTaken = `<span className="text-red-500 dark:text-red-400 flex items-center gap-1.5 font-medium">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Email <span className="font-bold text-slate-700 dark:text-slate-200">{addForm.email}</span> {emailCheckMsg}</span>
                          </span>`;
data = data.replace(regexJsxTaken, newJsxTaken);

const regexJsxAvail = /<span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">\s*<CheckCircle2 className="h-3\.5 w-3\.5 text-emerald-500 shrink-0" \/> \{emailCheckMsg\}\s*<\/span>/;
const newJsxAvail = `<span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Email <span className="font-bold text-slate-700 dark:text-slate-200">{addForm.email}</span> {emailCheckMsg}</span>
                          </span>`;
data = data.replace(regexJsxAvail, newJsxAvail);

fs.writeFileSync('app/(dashboard)/utility/users/page.tsx', data);
