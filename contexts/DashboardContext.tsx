"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { atsApi } from "@/lib/ats-api";
import { getDashboardRoleSelection } from "@/lib/dashboard-role";
import { getSavedDashboardRole, saveDashboardRole } from "@/lib/dashboard-preference";
import { loadDashboardNavigation, type NavigationBootstrap } from "@/lib/navigation-bootstrap";

type DashboardState = {
  snapshot: NavigationBootstrap | null;
  status: "loading" | "ready" | "error";
  error: string | null;
};

type DashboardContextValue = {
  profile: any;
  roles: NavigationBootstrap["roles"];
  selection: ReturnType<typeof getDashboardRoleSelection>;
  status: DashboardState["status"];
  error: string | null;
  reload: () => void;
  selectRole: (roleId: string | null) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);
const navigationCacheKey = (userId: string, tenantId: string) => `ats_workspace_navigation:${tenantId}:${userId}`;

function readCachedNavigation(userId?: string, tenantId?: string): NavigationBootstrap | null {
  if (!userId || !tenantId || typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(navigationCacheKey(userId, tenantId)) || "null");
    if (parsed?.profile?.id !== userId || parsed?.profile?.tenantId !== tenantId || !Array.isArray(parsed?.roles)) return null;
    return parsed as NavigationBootstrap;
  } catch { return null; }
}

export function DashboardProvider({ initialNavigation = null, children }: {
  initialNavigation?: NavigationBootstrap | null;
  children: ReactNode;
}) {
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; tenantId?: string } | undefined;
  const cachedNavigation = readCachedNavigation(sessionUser?.id, sessionUser?.tenantId);
  const [state, setState] = useState<DashboardState>(() => ({
    snapshot: initialNavigation || cachedNavigation,
    status: initialNavigation || cachedNavigation ? "ready" : "loading",
    error: null,
  }));
  const [overrideRole, setOverrideRole] = useState<string | null>(initialNavigation?.overrideRole ?? null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    if (initialNavigation && revision === 0) return;
    let cancelled = false;
    // Keep the last verified workspace available while revalidating. A tab
    // return or transient network failure must not blank the navigation.
    setState(current => ({ ...current, status: current.snapshot ? "ready" : "loading", error: null }));
    const load = async () => {
      // Recover one transient failure automatically; a persistent failure stays
      // visible with Retry instead of becoming a blank menu/default dashboard.
      for (let attempt = 0; attempt < 2; attempt++) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const snapshot = await Promise.race([
            loadDashboardNavigation(() => atsApi.auth.me(), () => atsApi.auth.listRoles(undefined, true)),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => reject(new Error("Workspace loading timed out")), 12000);
            }),
          ]);
          if (cancelled) return;
          setOverrideRole(getSavedDashboardRole(snapshot.profile));
          setState({ snapshot, status: "ready", error: null });
          if (typeof window !== "undefined") {
            try { localStorage.setItem(navigationCacheKey(snapshot.profile.id, snapshot.profile.tenantId), JSON.stringify(snapshot)); }
            catch { /* The live workspace still works when browser storage is unavailable. */ }
          }
          return;
        } catch (err) {
          console.error("DashboardContext Error:", err);
          if (cancelled) return;
          if (attempt === 1) setState(current => ({
            snapshot: current.snapshot,
            status: current.snapshot ? "ready" : "error",
            error: "Could not refresh your workspace access. Please try again.",
          }));
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [initialNavigation, revision]);

  const profile = state.snapshot?.profile ?? null;
  const roles = state.snapshot?.roles ?? [];

  useEffect(() => {
    if (!profile) return;
    const savedRole = getSavedDashboardRole(profile);
    // getSavedDashboardRole clears a cached selection that is absent from the
    // current profile. Apply null as well so a stale SSR preference cannot stick.
    if (savedRole) saveDashboardRole(profile, savedRole);
    setOverrideRole(savedRole);
    const handlePreference = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.profileId === profile.id && detail?.tenantId === profile.tenantId) {
        setOverrideRole(detail.role ?? null);
      } else {
        setOverrideRole(getSavedDashboardRole(profile));
      }
    };
    window.addEventListener("storage", handlePreference);
    window.addEventListener("overrideRoleChanged", handlePreference);
    return () => {
      window.removeEventListener("storage", handlePreference);
      window.removeEventListener("overrideRoleChanged", handlePreference);
    };
  }, [profile]);

  useEffect(() => {
    window.addEventListener("branchChanged", reload);
    return () => window.removeEventListener("branchChanged", reload);
  }, [reload]);

  useEffect(() => {
    // An explicit online event can repair stale permissions after connectivity
    // returns. Ordinary focus/visibility changes are not a reason to refetch
    // the workspace, which was causing the shell to disappear on app switches.
    const recoverWhenOnline = () => reload();
    window.addEventListener("online", recoverWhenOnline);
    return () => {
      window.removeEventListener("online", recoverWhenOnline);
    };
  }, [reload]);

  const selection = useMemo(() => getDashboardRoleSelection(profile, roles, overrideRole, false), [profile, roles, overrideRole]);
  const selectRole = useCallback((roleId: string | null) => {
    if (!profile || (roleId && !selection.options.some(role => role.id === roleId))) return;
    saveDashboardRole(profile, roleId);
    setOverrideRole(roleId);
    // Keep older screens subscribed to the perspective event in sync, even
    // when browser persistence is disabled.
    try {
      if (roleId) localStorage.setItem("override_role", roleId);
      else localStorage.removeItem("override_role");
    } catch { /* The in-memory switch remains available. */ }
    window.dispatchEvent(new CustomEvent("overrideRoleChanged", { detail: { role: roleId, profileId: profile.id, tenantId: profile.tenantId } }));
    window.location.assign('/dashboard');
  }, [profile, selection.options]);

  return <DashboardContext.Provider value={{ profile, roles, selection, status: state.status, error: state.error, reload, selectRole }}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("DashboardProvider is required");
  return context;
}
