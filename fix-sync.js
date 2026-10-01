const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/management/markets/page.tsx', 'utf8');

const badCode = `  useEffect(() => {
    atsApi.auth.getCurrentUser().then((user: any) => {
      const active = localStorage.getItem("active_role_id") || user?.roles?.[0] || "";
      const isSuper = user?.roles?.includes("SUPER_ADMIN") || (isRoleAdmin(resolveActiveSystemRole(active, [], user)) && active === "SUPER_ADMIN");
      setIsSuperAdmin(isSuper);
      setPermsLoading(false);
    }).catch(() => setPermsLoading(false));
  }, []);`;

const goodCode = `  useEffect(() => {
    try {
      const user = atsApi.auth.getCurrentUser();
      const active = localStorage.getItem("active_role_id") || user?.roles?.[0] || "";
      const isSuper = user?.roles?.includes("SUPER_ADMIN") || (isRoleAdmin(resolveActiveSystemRole(active, [], user)) && active === "SUPER_ADMIN");
      setIsSuperAdmin(isSuper);
    } catch (e) {
      console.error(e);
    } finally {
      setPermsLoading(false);
    }
  }, []);`;

content = content.replace(badCode, goodCode);
fs.writeFileSync('app/(dashboard)/management/markets/page.tsx', content);
console.log("Fixed synchronous getCurrentUser call");
