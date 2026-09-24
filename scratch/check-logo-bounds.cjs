const sharp = require('sharp');
const ts = require('typescript');
const fs = require('node:fs');
const code = ts.transpileModule(fs.readFileSync('lib/logo-bounds.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = {};
new Function('exports', code)(loaded);
sharp('../ats_backend/scratch/current-company-logo.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
  const bounds = loaded.visibleLogoBounds(data, info.width, info.height);
  console.log({ original: { width: info.width, height: info.height }, visibleArtwork: bounds,
    previousVisibleHeight: Math.round(32 * bounds.height / info.height), newVisibleHeight: Math.round(Math.min(34, 240 * bounds.height / bounds.width)) });
});
