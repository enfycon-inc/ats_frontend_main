const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/shared/company-logo-image.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regexMeasure = /setMeasured\(\{ src, size, viewBox \}\);/;
const replaceMeasure = `
    const parts = viewBox.split(' ').map(Number);
    const intrinsic = { width: parts[2], height: parts[3] };
    setMeasured({ src, size, viewBox, intrinsic });
`;
content = content.replace(regexMeasure, replaceMeasure.trim());

const regexState = /const \[measured, setMeasured\] = useState<\{ src: string; size: Dimensions; viewBox: string \} \| null>\(null\);/;
const replaceState = `const [measured, setMeasured] = useState<{ src: string; size: Dimensions; viewBox: string; intrinsic?: Dimensions } | null>(null);`;
content = content.replace(regexState, replaceState);

const regexSvg = /<svg role="img" aria-label=\{alt\} viewBox=\{measured\.viewBox\} preserveAspectRatio="xMinYMid meet" className=\{className\}>/;
const replaceSvg = `<svg role="img" aria-label={alt} viewBox={measured.viewBox} preserveAspectRatio="xMinYMid meet" className={className} width={measured.intrinsic?.width} height={measured.intrinsic?.height}>`;
content = content.replace(regexSvg, replaceSvg);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched company-logo-image.tsx');
