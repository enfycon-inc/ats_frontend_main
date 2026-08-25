import React, { Suspense } from "react";
import SetupPasswordComponent from "@/components/auth/setup-password-component";
import { Loader2 } from "lucide-react";

export default function SetupPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent">
              enfysync
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Complete Workspace Setup
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Activate your account and choose your preferred sign-in method
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-8 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-500">Loading activation details...</p>
            </div>
          }
        >
          <SetupPasswordComponent />
        </Suspense>
      </div>
    </div>
  );
}
