"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

export function DashboardProvider({ initialNavigation = null, children }: {
  initialNavigation?: NavigationBootstrap | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<DashboardState>(() => ({
    snapshot: initialNavigation,
    status: initialNavigation ? "ready" : "loading",
    error: null,
  }));
  const [overrideRole, setOverrideRole] = useState<string | null>(initialNavigation?.overrideRole ?? null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    if (initialNavigation && revision === 0) return;
    let cancelled = false;
    setState({ snapshot: null, status: "loading", error: null });
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
          return;
        } catch (err) {
          console.error("DashboardContext Error:", err);
          if (cancelled) return;
          if (attempt === 1) setState({ snapshot: null, status: "error", error: "Could not load your workspace access. Please try again." });
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
    if (savedRole) {
      saveDashboardRole(profile, savedRole);
      setOverrideRole(savedRole);
    }
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
  }, [profile, selection.options]);

  return <DashboardContext.Provider value={{ profile, roles, selection, status: state.status, error: state.error, reload, selectRole }}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("DashboardProvider is required");
  return context;
}
