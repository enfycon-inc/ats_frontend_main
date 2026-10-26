const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const contracts = {
  submissionAutoApproval: [['recruiter-submissions/submission-auto-approval.ts', 'lib/submission-auto-approval.ts']],
  notifications: [['notifications/notification-preferences.ts', 'lib/notification-preferences.ts']],
  branding: [['auth/tenant-branding-contract.ts', 'lib/tenant-branding-contract.ts']],
  signIn: [['auth/sign-in-policy.ts', 'lib/sign-in-policy.ts']],
  jobAccess: [['auth/job-assignment-policy.ts', 'lib/job-assignment-policy.ts'], ['jobs/job-capabilities.ts', 'lib/job-capabilities.ts'], ['auth/job-access-grants.ts', 'lib/job-access-grants.ts']],
};
const normalize = text => text.replace(/\r\n/g, '\n');
const digest = text => createHash('sha256').update(normalize(text)).digest('hex');

function run(group, args = process.argv.slice(2), root = path.resolve(__dirname, '..')) {
  const pairs = contracts[group];
  if (!pairs) throw new Error(`Unknown contract group: ${group}`);
  if (args.some(arg => !['--check', '--check-backend'].includes(arg))) throw new Error('Use --check for standalone validation or --check-backend for canonical validation.');
  const manifestPath = path.join(root, 'contracts.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const expected = Object.values(contracts).flat().map(([, target]) => target).sort();
  if (manifest.version !== 1 || JSON.stringify(Object.keys(manifest.files || {}).sort()) !== JSON.stringify(expected)) throw new Error('Invalid contract manifest. Regenerate it with the synchronization scripts.');
  const checking = args.includes('--check') || args.includes('--check-backend');
  if (checking) {
    for (const [, target] of pairs) {
      if (digest(fs.readFileSync(path.join(root, target), 'utf8')) !== manifest.files[target]) throw new Error(`Contract checksum mismatch: ${target}. Synchronize from the backend and commit both the contract and manifest.`);
    }
  }
  // Standalone builds validate committed frontend files. Canonical validation
  // explicitly requires backend sources and never silently skips missing files.
  if (args.includes('--check') && !args.includes('--check-backend')) return;
  const sources = pairs.map(([source, target]) => {
    const sourcePath = path.resolve(root, '../ats_backend/src', source);
    if (!fs.existsSync(sourcePath)) throw new Error(`Canonical backend contract missing: ${sourcePath}. Check out ats_backend beside the frontend before canonical validation or synchronization.`);
    return { target, contents: normalize(fs.readFileSync(sourcePath, 'utf8')) };
  });
  if (checking) {
    for (const { target, contents } of sources) {
      if (normalize(fs.readFileSync(path.join(root, target), 'utf8')) !== contents) throw new Error(`Canonical backend contract differs: ${target}. Synchronize and commit the contract and manifest together.`);
    }
    return;
  }
  for (const { target, contents } of sources) {
    fs.writeFileSync(path.join(root, target), contents);
    manifest.files[target] = digest(contents);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

module.exports = { run };
