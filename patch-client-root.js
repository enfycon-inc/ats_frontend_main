const fs = require('fs');
let c = fs.readFileSync('app/client-root.tsx', 'utf8');

c = c.replace(
  'import { DashboardProvider } from "@/contexts/dashboard-context";',
  'import { DashboardProvider } from "@/contexts/dashboard-context";\nimport { syncAssignedOffice } from "@/lib/assigned-office";\nimport { useLayoutEffect } from "react";'
);

c = c.replace(
  'const isApproved = useMemo(() => {',
  'useLayoutEffect(() => {\n    if (typeof window !== "undefined" && initialNavigation?.profile) {\n      const permissions = initialNavigation.profile.permissions || [];\n      if (!permissions.some((p: string) => ["tenant:settings", "tenant:manage", "platform:manage"].includes(p))) {\n        syncAssignedOffice(initialNavigation.profile, window.localStorage);\n      }\n    }\n  }, [initialNavigation]);\n\n  const isApproved = useMemo(() => {'
);

fs.writeFileSync('app/client-root.tsx', c);
