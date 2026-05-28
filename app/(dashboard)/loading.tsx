export default function DashboardLoading() {
  // Intentionally render nothing — the navbar is already visible
  // and content will stream in. This prevents the root app/loading.tsx
  // full-screen overlay from showing on dashboard route transitions.
  return null;
}
