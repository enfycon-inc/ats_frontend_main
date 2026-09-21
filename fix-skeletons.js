
const fs = require("fs");
const path = require("path");

const p1 = path.join(__dirname, "components/layout/app-sidebar.tsx");
let c1 = fs.readFileSync(p1, "utf8");

// Add isLoading state to AppSidebar
c1 = c1.replace(
  "const [liveProfile, setLiveProfile] = useState<any>(initialNavigation?.profile ?? null);",
  "const [liveProfile, setLiveProfile] = useState<any>(initialNavigation?.profile ?? null);\n  const [isLoadingProfile, setIsLoadingProfile] = useState(!initialNavigation?.profile);"
);

c1 = c1.replace(
  "setLiveProfile(profile);",
  "setLiveProfile(profile);\n        setIsLoadingProfile(false);"
);

c1 = c1.replace(
  "return () => { cancelled = true; };",
  "return () => { cancelled = true; };\n    }, [initialNavigation]);\n\n    useEffect(() => {\n      if (!initialNavigation && !liveProfile) {\n        // Fallback timeout to stop showing skeletons if network completely fails\n        const t = setTimeout(() => setIsLoadingProfile(false), 5000);\n        return () => clearTimeout(t);\n      }\n    }, [initialNavigation, liveProfile]);"
);

// Add Skeleton import
c1 = c1.replace(
  "import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from \"@/components/ui/sidebar\";",
  "import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from \"@/components/ui/sidebar\";\nimport { Skeleton } from \"@/components/ui/skeleton\";"
);

// Add Skeletons to render
c1 = c1.replace(
  "{filteredPrimaryNav.map((item) => (",
  "{isLoadingProfile ? Array.from({ length: 5 }).map((_, i) => (\n                  <SidebarMenuItem key={`skel-${i}`}>\n                    <div className=\"flex items-center gap-3 px-3 py-2\">\n                      <Skeleton className=\"h-5 w-5 rounded-md bg-white/10 dark:bg-white/5\" />\n                      <Skeleton className=\"h-4 w-32 rounded bg-white/10 dark:bg-white/5\" />\n                    </div>\n                  </SidebarMenuItem>\n                )) : filteredPrimaryNav.map((item) => ("
);

c1 = c1.replace(
  "{filteredMoreNav.map((item) => (",
  "{isLoadingProfile ? Array.from({ length: 3 }).map((_, i) => (\n                  <SidebarMenuItem key={`skel-more-${i}`}>\n                    <div className=\"flex items-center gap-3 px-3 py-2\">\n                      <Skeleton className=\"h-5 w-5 rounded-md bg-white/10 dark:bg-white/5\" />\n                      <Skeleton className=\"h-4 w-24 rounded bg-white/10 dark:bg-white/5\" />\n                    </div>\n                  </SidebarMenuItem>\n                )) : filteredMoreNav.map((item) => ("
);

fs.writeFileSync(p1, c1);
console.log("Fixed AppSidebar skeletons");

const p2 = path.join(__dirname, "app/(dashboard)/dashboard/components/admin-dashboard-view.tsx");
let c2 = fs.readFileSync(p2, "utf8");

// Add skeleton import
if (!c2.includes("import { Skeleton }")) {
  c2 = c2.replace(
    "import { Badge } from \"@/components/ui/badge\";",
    "import { Badge } from \"@/components/ui/badge\";\nimport { Skeleton } from \"@/components/ui/skeleton\";"
  );
}

// Update Active Branches
c2 = c2.replace(
  "<div className=\"text-2xl font-black text-slate-900 dark:text-white\">{isLoadingBranches ? \"--\" : branches.length}</div>",
  "<div className=\"text-2xl font-black text-slate-900 dark:text-white\">\n                  {isLoadingBranches ? <Skeleton className=\"h-8 w-12\" /> : branches.length}\n                </div>"
);

// Update Global Active Jobs
c2 = c2.replace(
  "<div className=\"text-2xl font-black text-slate-900 dark:text-white\">{metrics.active}</div>",
  "<div className=\"text-2xl font-black text-slate-900 dark:text-white\">\n                  {jobs.length === 0 && isLoadingBranches ? <Skeleton className=\"h-8 w-12\" /> : metrics.active}\n                </div>"
);

// Update Staff / Seat Usage
c2 = c2.replace(
  "{users.length > 0 ? users.length : \"--\"} <span className=\"text-sm font-semibold text-default-400\">/ {seatLimit}</span>",
  "{users.length > 0 ? users.length : (isLoadingBranches ? <Skeleton className=\"h-8 w-16 inline-block\" /> : \"0\")} <span className=\"text-sm font-semibold text-default-400\">/ {seatLimit}</span>"
);

// Update Total Pipeline
c2 = c2.replace(
  "<div className=\"text-2xl font-black text-slate-900 dark:text-white\">{metrics.pipeline}</div>",
  "<div className=\"text-2xl font-black text-slate-900 dark:text-white\">\n                  {jobs.length === 0 && isLoadingBranches ? <Skeleton className=\"h-8 w-12\" /> : metrics.pipeline}\n                </div>"
);

fs.writeFileSync(p2, c2);
console.log("Fixed AdminDashboardView skeletons");

