const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/auth/login-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix CRIT-4: Remove password from URL parsing
content = content.replace(/const passwordParam = searchParams\.get\("password"\);/, '');
content = content.replace(/if \(passwordParam\) \{\s*setValue\("password", passwordParam\);\s*\}/, '');

// Fix CRIT-5: Token in URL
// Instead of redirecting with ?sso_token, set a cookie.
const redirectRegex = /const tokenParam = syncRes\?\.accessToken \? `\?sso_token=\$\{encodeURIComponent\(syncRes\.accessToken\)\}` : "";\s*const userParam = syncRes\?\.user \? `&user_json=\$\{encodeURIComponent\(JSON\.stringify\(syncRes\.user\)\)\}` : "";\s*const callbackUrlParam = searchParams\.get\("callbackUrl"\);\s*const cbParam = callbackUrlParam \? `&callbackUrl=\$\{encodeURIComponent\(callbackUrlParam\)\}` : "";\s*window\.location\.href = `\$\{protocol\}\/\/\$\{userTenantDomain\}\.\$\{base\}\/auth\/login\$\{tokenParam\}\$\{userParam\}\$\{cbParam\}`;/;

const safeRedirect = `
            const callbackUrlParam = searchParams.get("callbackUrl");
            const cbParam = callbackUrlParam ? \`?callbackUrl=\${encodeURIComponent(callbackUrlParam)}\` : "";
            
            // Secure cross-subdomain handoff via temporary cookie
            if (syncRes?.accessToken) {
              const handoffPayload = JSON.stringify({ token: syncRes.accessToken, user: syncRes.user });
              document.cookie = \`ats_sso_handoff=\${encodeURIComponent(handoffPayload)}; Domain=.\${base}; Path=/; Max-Age=30; SameSite=Lax\`;
            }
            
            window.location.href = \`\${protocol}//\${userTenantDomain}.\${base}/auth/login\${cbParam}\`;
`;
content = content.replace(redirectRegex, safeRedirect.trim());

// And on the receiving side:
const receiveRegex = /const ssoToken = searchParams\.get\("sso_token"\) \|\| searchParams\.get\("token"\);\s*const userJsonParam = searchParams\.get\("user_json"\);/;

const safeReceive = `
    let ssoToken = searchParams.get("token");
    let userJsonParam = null;
    
    // Read secure handoff cookie if it exists
    const match = document.cookie.match(new RegExp('(^| )ats_sso_handoff=([^;]+)'));
    if (match) {
      try {
        const payload = JSON.parse(decodeURIComponent(match[2]));
        ssoToken = payload.token || ssoToken;
        userJsonParam = payload.user ? JSON.stringify(payload.user) : null;
        // Clean up the cookie
        document.cookie = "ats_sso_handoff=; Max-Age=0; Path=/; Domain=" + window.location.hostname.split('.').slice(-2).join('.');
      } catch (e) {}
    }
`;
content = content.replace(receiveRegex, safeReceive.trim());

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched login-form.tsx for URL credentials');
