import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RoleRequestReview from "./review";

export default async function RoleRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const query = new URLSearchParams();
  for (const key of [
    "requestId",
    "requestVersion",
    "reviewRoleId",
    "action",
    "subdomain",
  ])
    if (first(key)) query.set(key, first(key));
  const session = await auth();
  if (!session?.user || (session as { error?: string }).error)
    redirect(
      `/auth/login?callbackUrl=${encodeURIComponent(`/auth/role-request?${query}`)}`,
    );
  return (
    <RoleRequestReview
      requestId={first("requestId")}
      version={first("requestVersion")}
      reviewRoleId={first("reviewRoleId")}
      initialAction={first("action")}
    />
  );
}
