export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h1 className="text-3xl font-bold">Welcome to Enfysync ATS</h1>
      <p className="text-muted-foreground text-lg">
        Your pages are ready to be built. Start adding routes under{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-sm">app/(dashboard)/</code>
      </p>
    </div>
  );
}
