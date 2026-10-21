"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { atsApi } from "@/lib/ats-api";
import { Button } from "@/components/ui/button";

export default function RoleRequestReview({
  requestId,
  version,
  reviewRoleId,
  initialAction,
}: {
  requestId: string;
  version: string;
  reviewRoleId: string;
  initialAction: string;
}) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const valid =
    uuid.test(requestId) &&
    uuid.test(version) &&
    (!reviewRoleId || uuid.test(reviewRoleId));
  const { data, error, isLoading } = useSWR(
    valid ? ["role-request", requestId, version, reviewRoleId] : null,
    () =>
      atsApi.auth.reviewRoleRequest(
        requestId,
        version,
        reviewRoleId || undefined,
      ),
    { shouldRetryOnError: false, revalidateOnFocus: true },
  );
  const [action, setAction] = useState<"approve" | "reject" | null>(
    initialAction === "approve" || initialAction === "reject"
      ? initialAction
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [failure, setFailure] = useState("");
  async function confirm() {
    if (!data || !action || saving) return;
    setSaving(true);
    setFailure("");
    try {
      const response = await atsApi.auth.decideRoleRequest(
        data,
        action,
        reviewRoleId || undefined,
      );
      setResult(
        `Request ${action === "approve" ? "approved" : "rejected"}.${response.emailNotification?.status === "failed" ? " Access was updated, but the welcome email could not be sent." : ""}`,
      );
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : "Unable to save your decision.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="h-dvh overflow-y-auto bg-slate-50 px-4 py-12 text-slate-900">
      <section
        aria-labelledby="review-title"
        className="mx-auto max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="bg-slate-900 px-6 py-5 text-lg font-bold text-white">
          EnfySync
        </div>
        <div className="space-y-5 p-6">
          <h1 id="review-title" className="text-xl font-bold">
            Review role request
          </h1>
          {!valid && (
            <p role="alert" className="text-sm text-red-700">
              This request link is invalid. Open the latest notification.
            </p>
          )}
          {isLoading && (
            <p role="status" className="text-sm text-slate-600">
              Loading request…
            </p>
          )}
          {!result && error && (
            <p role="alert" className="text-sm text-red-700">
              {error.message ||
                "This request is unavailable or outside your approval scope."}
            </p>
          )}
          {result ? (
            <p
              role="status"
              className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900"
            >
              {result}
            </p>
          ) : (
            data &&
            !error && (
              <>
                <p className="text-xs text-slate-500">
                  Review the requested access before confirming your decision.
                </p>
                <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 text-xs">
                  {[
                    ["Requester", data.fullName],
                    ["Email", data.email],
                    ["Requested role", data.requestedRole],
                    ["Branch", data.branchName || "Workspace-wide"],
                    ["Business unit", data.businessUnitName || "No unit"],
                    ["Status", "Pending approval"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[110px_1fr] gap-3 p-3"
                    >
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    disabled={saving}
                    onClick={() => setAction("approve")}
                    className="bg-blue-800 text-xs hover:bg-blue-900"
                  >
                    Approve request
                  </Button>
                  <Button
                    disabled={saving}
                    variant="outline"
                    onClick={() => setAction("reject")}
                    className="border-red-300 text-xs text-red-700"
                  >
                    Reject request
                  </Button>
                </div>
                {action && (
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm">
                      {action === "approve"
                        ? `Approve ${data.requestedRole} access for ${data.fullName}?`
                        : `Reject this request from ${data.fullName}? The account will remain unapproved.`}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        disabled={saving}
                        onClick={confirm}
                        className={
                          action === "reject"
                            ? "bg-red-700 text-xs hover:bg-red-800"
                            : "bg-blue-800 text-xs hover:bg-blue-900"
                        }
                      >
                        {saving
                          ? "Saving…"
                          : `Confirm ${action === "approve" ? "approval" : "rejection"}`}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={saving}
                        onClick={() => setAction(null)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {failure && (
                  <p role="alert" className="text-sm text-red-700">
                    {failure}
                  </p>
                )}
              </>
            )
          )}
          <Link
            href="/dashboard"
            className="inline-block text-xs text-blue-800 underline"
          >
            Open workspace
          </Link>
        </div>
      </section>
    </div>
  );
}
