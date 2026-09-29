const fs = require('fs');
let c = fs.readFileSync('components/auth/pending-approval-view.tsx', 'utf8');
c = c.replace(
  /const handleSignOut = \(\) => {[\s\S]*?signOut\({ callbackUrl: "\/auth\/login" }\);[\s\S]*?};/,
  `const handleSignOut = async () => {
    // Force clear cookies client-side as a fallback
    document.cookie = "ats.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "__Secure-ats.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    await signOut({ callbackUrl: "/auth/login" });
  };`
);
fs.writeFileSync('components/auth/pending-approval-view.tsx', c);
