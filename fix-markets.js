const fs = require('fs');

function fixMarketsPage(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace import and usage of usePermissions
  content = content.replace(`import { usePermissions } from "@/contexts/permissions-context";`, `import { isRoleAdmin, resolveActiveSystemRole } from "@/lib/role-permissions";`);
  
  const oldCode = `  const router = useRouter();
  const { hasPermission, loading: permsLoading, profile } = usePermissions();
  
  const [markets, setMarkets] = useState<MarketSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isSuperAdmin = profile?.roles?.includes("SUPER_ADMIN") || hasPermission("platform:manage");`;

  const newCode = `  const router = useRouter();
  
  const [markets, setMarkets] = useState<MarketSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [permsLoading, setPermsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    atsApi.auth.getCurrentUser().then(user => {
      const active = localStorage.getItem("active_role_id") || user?.roles?.[0] || "";
      const isSuper = user?.roles?.includes("SUPER_ADMIN") || (isRoleAdmin(resolveActiveSystemRole(active, [], user)) && active === "SUPER_ADMIN");
      setIsSuperAdmin(isSuper);
      setPermsLoading(false);
    }).catch(() => setPermsLoading(false));
  }, []);`;

  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content);
  console.log("Markets page fixed");
}

fixMarketsPage('app/(dashboard)/management/markets/page.tsx');
