const fs = require('fs');
let c = fs.readFileSync('components/auth/pending-approval-view.tsx', 'utf8');
c = c.replace(
  'document.cookie = "ats.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";\n    document.cookie = "__Secure-ats.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";',
  `// Dynamically clear all chunked cookies (e.g. ats.session-token.0, ats.session-token.1)
    document.cookie.split(";").forEach((cookieStr) => {
      const name = cookieStr.split("=")[0].trim();
      if (name.includes("ats.session-token") || name.includes("next-auth.session-token")) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    });`
);
fs.writeFileSync('components/auth/pending-approval-view.tsx', c);
