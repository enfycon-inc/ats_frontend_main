
const fs = require("fs");
const path = require("path");

const navbarPath = path.join(__dirname, "components/layout/navbar-right.tsx");
let content = fs.readFileSync(navbarPath, "utf8");

const oldComponentStart = "function BranchSwitcher() {";
const newComponent = `function BranchSwitcher() {
  const { data: session } = useSession();
  const [activeBranch, setActiveBranch] = useState<string>("Domestic Branch");

  const [overrideRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("override_role");
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("active_branch_id");
      if (savedId === "all") {
        setActiveBranch("All Branches");
      } else {
        const savedName = localStorage.getItem("active_branch_name");
        if (savedName) {
          setActiveBranch(savedName);
        } else {
          const user = atsApi.auth.getCurrentUser();
          if (user?.branchName) setActiveBranch(user.branchName);
        }
      }
    }
  }, []);

  const currentUser = typeof window !== "undefined" ? atsApi.auth.getCurrentUser() : null;
  const systemRole = overrideRole || currentUser?.systemRole || (session as any)?.user?.systemRole || "RECRUITER";
  const perms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isTenantAdmin = systemRole === "ADMIN" || systemRole === "SUPER_ADMIN" || systemRole === "TENANT_ADMIN" || perms.includes("tenant:settings") || perms.includes("tenant:manage");

  useEffect(() => {
    if (isTenantAdmin && typeof window !== "undefined") {
      const currentId = localStorage.getItem("active_branch_id");
      if (currentId !== "all") {
        localStorage.setItem("active_branch_id", "all");
        localStorage.setItem("active_branch_name", "All Branches");
        window.dispatchEvent(new Event("branchChanged"));
        setTimeout(() => window.location.reload(), 50);
      }
    }
  }, [isTenantAdmin]);

  if (isTenantAdmin) return null;

  return (
    <div 
      title="Your branch context is fixed to your assigned home office."
      className="
        flex items-center gap-1.5
        h-7 px-2.5 rounded-lg
        text-[11px] font-bold tracking-wide
        bg-white/10 text-white/90
        border border-white/15 shadow-2xs
        cursor-default select-none
      "
    >
      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-indigo-200" />
      <span suppressHydrationWarning>Office: {activeBranch}</span>
    </div>
  );
}`;

// I will just use regex to replace from function BranchSwitcher() to its end, but since it"s complex, I will substring it.
// Finding the start of export function NavbarRight()
const endMatch = "export function NavbarRight() {";

if (content.includes(oldComponentStart) && content.includes(endMatch)) {
  const parts = content.split(oldComponentStart);
  const before = parts[0];
  const parts2 = parts[1].split(endMatch);
  const after = parts2[1];
  
  content = before + newComponent + "\n\n  // ---------------------------\n  " + endMatch + after;
  fs.writeFileSync(navbarPath, content);
  console.log("Successfully replaced BranchSwitcher completely.");
} else {
  console.log("Could not find delimiters.");
}

