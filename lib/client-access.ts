type ClientAccessUser = {
  systemRole?: string | null;
  permissions?: string[] | null;
};

const CLIENT_DELETE_ADMIN_ROLES = new Set([
  "SUPERADMIN",
  "TENANTADMIN",
  "BRANCHADMIN",
  "UNITADMIN",
]);

export function canDeleteClients(user: ClientAccessUser | null | undefined): boolean {
  const activeRole = String(user?.systemRole || "")
    .toUpperCase()
    .replace(/[\s_-]+/g, "");
  const permissions = user?.permissions || [];

  return CLIENT_DELETE_ADMIN_ROLES.has(activeRole) && (
    permissions.includes("client:delete") ||
    permissions.includes("tenant:settings") ||
    permissions.includes("tenant:manage") ||
    permissions.includes("platform:manage")
  );
}
