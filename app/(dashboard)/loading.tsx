import WorkspaceLoading from "@/components/shared/workspace-loading";

export default function DashboardLoading() {
  // Keep existing navigation usable during subsequent dashboard transitions.
  return <WorkspaceLoading />;
}
