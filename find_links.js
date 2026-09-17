const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next')) {
                results = results.concat(walkDir(file));
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('\/applicants/\$')) {
                results.push(file);
            }
        }
    });
    return results;
}
console.log(walkDir('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main').join('\n'));
