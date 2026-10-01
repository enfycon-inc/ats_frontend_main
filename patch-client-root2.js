const fs = require('fs');
let c = fs.readFileSync('app/client-root.tsx', 'utf8');

c = c.replace(
  'useLayoutEffect(() => {\n    if (typeof window !== "undefined" && initialNavigation?.profile) {\n      const permissions = initialNavigation.profile.permissions || [];\n      if (!permissions.some((p: string) => ["tenant:settings", "tenant:manage", "platform:manage"].includes(p))) {\n        syncAssignedOffice(initialNavigation.profile, window.localStorage);\n      }\n    }\n  }, [initialNavigation]);\n\n  const isApproved = useMemo(() => {',
  '// Run synchronously during initial render to prevent children from using stale storage in their initial fetch\n  if (typeof window !== "undefined" && initialNavigation?.profile) {\n    const permissions = initialNavigation.profile.permissions || [];\n    if (!permissions.some((p: string) => ["tenant:settings", "tenant:manage", "platform:manage"].includes(p))) {\n      syncAssignedOffice(initialNavigation.profile, window.localStorage);\n    }\n  }\n\n  const isApproved = useMemo(() => {'
);

fs.writeFileSync('app/client-root.tsx', c);
