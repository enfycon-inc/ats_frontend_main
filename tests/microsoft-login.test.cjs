const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../components/auth/social.tsx'), 'utf8');

test('Microsoft login always supplies the tenant-specific Keycloak broker hint', () => {
  assert.match(source, /disabled=\{!canSignInWithMicrosoft\}/);
  assert.match(source, /if \(!canSignInWithMicrosoft\) return;/);
  assert.match(source, /kc_idp_hint:\s*`microsoft-\$\{tenantId\}`/);
});

test('Microsoft login cannot use a missing tenant ID', () => {
  assert.match(source, /const canSignInWithMicrosoft = microsoftReady && !!tenantId/);
});
